import csv
import os
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from forecasting.models import MonthlyPriceRecord


class Command(BaseCommand):
    help = "Ingest real monthly price records from backend/data/price_data.csv into MonthlyPriceRecord"

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default=None,
            help="Path to the price CSV file (defaults to backend/data/price_data.csv)"
        )
        parser.add_argument(
            '--skip-existing',
            action='store_true',
            help="Skip existing records instead of updating price if values differ"
        )

    def handle(self, *args, **options):
        # Resolve CSV path safely from Django project root
        file_arg = options.get('file')
        if file_arg:
            csv_path = Path(file_arg).resolve()
        else:
            csv_path = (settings.BASE_DIR / 'data' / 'price_data.csv').resolve()

        if not csv_path.exists() or not csv_path.is_file():
            raise CommandError(f"Target CSV file not found at: {csv_path}")

        self.stdout.write(self.style.NOTICE(f"Opening dataset from: {csv_path}"))

        created_count = 0
        updated_count = 0
        skipped_count = 0
        validation_errors = []

        try:
            with open(csv_path, mode='r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)

                if not reader.fieldnames:
                    raise CommandError("CSV file appears to be empty or has invalid headers.")

                # Identify date and price columns
                raw_headers = [h.strip().lower() for h in reader.fieldnames]
                header_map = {h.strip().lower(): h for h in reader.fieldnames}

                date_candidates = ['date', 'month', 'period', 'timestamp']
                price_candidates = ['avg_monthly_price', 'price', 'value', 'amount', 'close']

                date_key_lower = next((c for c in date_candidates if c in raw_headers), None)
                price_key_lower = next((c for c in price_candidates if c in raw_headers), None)

                if not date_key_lower or not price_key_lower:
                    raise CommandError(
                        f"Missing required columns in CSV.\n"
                        f"Found headers: {reader.fieldnames}\n"
                        f"Expected date column in {date_candidates} and price column in {price_candidates}"
                    )

                date_col = header_map[date_key_lower]
                price_col = header_map[price_key_lower]

                self.stdout.write(
                    self.style.SUCCESS(
                        f"Detected columns -> Date: '{date_col}', Price: '{price_col}'"
                    )
                )

                records_to_upsert = []
                seen_dates_in_file = set()

                for row_num, row in enumerate(reader, start=2):
                    raw_date = row.get(date_col, '').strip()
                    raw_price = row.get(price_col, '').strip()

                    # Check for missing values
                    if not raw_date:
                        validation_errors.append(f"Row {row_num}: Date value is missing.")
                        continue
                    if not raw_price:
                        validation_errors.append(f"Row {row_num}: Price value is missing for date '{raw_date}'.")
                        continue

                    # Parse and normalize date
                    parsed_date = None
                    for fmt in ('%Y-%m-%d', '%Y-%m', '%d-%m-%Y', '%m/%d/%Y', '%Y/%m/%d'):
                        try:
                            parsed_date = datetime.strptime(raw_date, fmt).date()
                            break
                        except ValueError:
                            pass

                    if not parsed_date:
                        validation_errors.append(
                            f"Row {row_num}: Unable to parse date '{raw_date}'. Expected YYYY-MM or YYYY-MM-DD."
                        )
                        continue

                    # Standardize to 1st of each month (YYYY-MM-01)
                    normalized_date = date(parsed_date.year, parsed_date.month, 1)

                    if normalized_date in seen_dates_in_file:
                        validation_errors.append(
                            f"Row {row_num}: Duplicate monthly date '{normalized_date.strftime('%Y-%m')}' in CSV."
                        )
                        continue
                    seen_dates_in_file.add(normalized_date)

                    # Parse price
                    try:
                        clean_price_str = raw_price.replace('$', '').replace(',', '').strip()
                        decimal_price = Decimal(clean_price_str)
                        if decimal_price <= 0:
                            validation_errors.append(
                                f"Row {row_num}: Price must be positive. Found: '{raw_price}'"
                            )
                            continue
                    except (InvalidOperation, ValueError):
                        validation_errors.append(
                            f"Row {row_num}: Invalid numeric price '{raw_price}'."
                        )
                        continue

                    records_to_upsert.append((normalized_date, decimal_price))

        except Exception as e:
            raise CommandError(f"Error reading CSV file: {str(e)}")

        if validation_errors:
            self.stdout.write(self.style.ERROR(f"Encountered {len(validation_errors)} validation errors:"))
            for err in validation_errors[:10]:
                self.stdout.write(self.style.ERROR(f"  - {err}"))
            if len(validation_errors) > 10:
                self.stdout.write(self.style.ERROR(f"  ... and {len(validation_errors) - 10} more errors."))
            raise CommandError("Data ingestion halted due to CSV validation errors.")

        if not records_to_upsert:
            raise CommandError("No valid price observations found to import.")

        # Atomic database transaction
        skip_existing = options.get('skip_existing', False)

        with transaction.atomic():
            for norm_date, dec_price in records_to_upsert:
                existing = MonthlyPriceRecord.objects.filter(date=norm_date).first()
                if existing:
                    if skip_existing:
                        skipped_count += 1
                    else:
                        if existing.price != dec_price:
                            existing.price = dec_price
                            existing.save(update_fields=['price', 'updated_at'])
                            updated_count += 1
                        else:
                            skipped_count += 1
                else:
                    MonthlyPriceRecord.objects.create(date=norm_date, price=dec_price)
                    created_count += 1

        total_in_db = MonthlyPriceRecord.objects.count()
        earliest = MonthlyPriceRecord.objects.order_by('date').first()
        latest = MonthlyPriceRecord.objects.order_by('date').last()

        self.stdout.write(self.style.SUCCESS("\n--- Import Summary ---"))
        self.stdout.write(self.style.SUCCESS(f"Rows processed from CSV: {len(records_to_upsert)}"))
        self.stdout.write(self.style.SUCCESS(f"New records created:     {created_count}"))
        self.stdout.write(self.style.SUCCESS(f"Existing records updated: {updated_count}"))
        self.stdout.write(self.style.SUCCESS(f"Existing records skipped: {skipped_count}"))
        self.stdout.write(self.style.SUCCESS(f"Total records in DB:      {total_in_db}"))
        if earliest and latest:
            self.stdout.write(self.style.SUCCESS(f"Earliest date in DB:      {earliest.date.strftime('%Y-%m-%d')} (${earliest.price})"))
            self.stdout.write(self.style.SUCCESS(f"Latest date in DB:        {latest.date.strftime('%Y-%m-%d')} (${latest.price})"))
        self.stdout.write(self.style.SUCCESS("----------------------\n"))
