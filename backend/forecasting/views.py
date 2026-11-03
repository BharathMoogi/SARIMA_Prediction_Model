import io
import csv
from datetime import datetime, date
from decimal import Decimal, InvalidOperation

from django.db import transaction
from rest_framework import status, views, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import MonthlyPriceRecord, ModelMetadata, ForecastCache
from .serializers import (
    MonthlyPriceRecordSerializer,
    ForecastRecordSerializer,
    ModelMetadataSerializer,
    BulkPriceUploadSerializer
)
from .services import SARIMAService


class MonthlyPriceRecordViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for managing historical monthly price records.
    """
    queryset = MonthlyPriceRecord.objects.all().order_by('date')
    serializer_class = MonthlyPriceRecordSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Ensure date uniqueness handling with clear error
        normalized_date = serializer.validated_data['date']
        if MonthlyPriceRecord.objects.filter(date=normalized_date).exists():
            return Response(
                {"error": f"A record for {normalized_date.strftime('%Y-%m')} already exists."},
                status=status.HTTP_400_BAD_REQUEST
            )
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=False, methods=['post'], url_path='upload')
    def upload_records(self, request):
        """
        Accepts CSV file upload or JSON payload containing monthly price records.
        CSV expected columns: 'date' (YYYY-MM or YYYY-MM-DD), 'price' (numerical).
        """
        items_to_create = []

        if 'file' in request.FILES:
            file_obj = request.FILES['file']
            if not file_obj.name.endswith('.csv'):
                return Response(
                    {"error": "Only CSV files are supported for file upload."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                decoded_file = file_obj.read().decode('utf-8-sig')
                io_string = io.StringIO(decoded_file)
                reader = csv.DictReader(io_string)

                headers = [h.strip().lower() for h in (reader.fieldnames or [])]
                date_col = next((c for c in ['date', 'month', 'period', 'timestamp'] if c in headers), None)
                price_candidates = ['avg_monthly_price', 'price', 'value', 'amount', 'close']
                price_col = next((c for c in price_candidates if c in headers), None)

                if not date_col or not price_col:
                    return Response(
                        {"error": f"CSV must contain a date column ('date', 'month', etc.) and a price column ('avg_monthly_price', 'price', 'value', 'amount', 'close'). Found columns: {reader.fieldnames}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                for row_idx, row in enumerate(reader, start=2):
                    raw_date = row.get(date_col, '').strip()
                    raw_price = row.get(price_col, '').strip()

                    if not raw_date or not raw_price:
                        continue

                    # Parse date
                    parsed_date = None
                    for fmt in ('%Y-%m-%d', '%Y-%m', '%d-%m-%Y', '%m/%d/%Y', '%Y/%m/%d'):
                        try:
                            parsed_date = datetime.strptime(raw_date, fmt).date()
                            break
                        except ValueError:
                            pass

                    if not parsed_date:
                        return Response(
                            {"error": f"Row {row_idx}: Unable to parse date '{raw_date}'. Expected YYYY-MM or YYYY-MM-DD format."},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    # Standardize to 1st of month
                    normalized_date = date(parsed_date.year, parsed_date.month, 1)

                    # Parse price
                    try:
                        clean_price = Decimal(raw_price.replace('$', '').replace(',', '').strip())
                        if clean_price <= 0:
                            raise ValueError()
                    except (InvalidOperation, ValueError):
                        return Response(
                            {"error": f"Row {row_idx}: Invalid price value '{raw_price}'. Must be a positive number."},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    items_to_create.append({
                        'date': normalized_date,
                        'price': clean_price
                    })

            except Exception as e:
                return Response(
                    {"error": f"Failed to process CSV file: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        elif 'records' in request.data:
            serializer = BulkPriceUploadSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            for item in serializer.validated_data['records']:
                items_to_create.append({
                    'date': item['date'],
                    'price': item['price']
                })
        else:
            return Response(
                {"error": "Please provide either a 'file' (CSV) or 'records' list in request body."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not items_to_create:
            return Response(
                {"error": "No valid records found in the provided payload."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Upsert records in an atomic transaction
        created_count = 0
        updated_count = 0

        with transaction.atomic():
            for item in items_to_create:
                _, created = MonthlyPriceRecord.objects.update_or_create(
                    date=item['date'],
                    defaults={'price': item['price']}
                )
                if created:
                    created_count += 1
                else:
                    updated_count += 1

        return Response({
            "message": f"Successfully processed {len(items_to_create)} records.",
            "created": created_count,
            "updated": updated_count,
            "total_now": MonthlyPriceRecord.objects.count()
        }, status=status.HTTP_200_OK)


class ForecastView(views.APIView):
    """
    Returns 12-month price forecast with 95% confidence intervals.
    """
    def get(self, request):
        service = SARIMAService()
        try:
            forecasts = service.get_forecast_data()
            return Response({
                "status": "success",
                "horizon_months": len(forecasts),
                "confidence_level": service.confidence_level,
                "order": service.order,
                "seasonal_order": service.seasonal_order,
                "forecasts": forecasts
            }, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"status": "error", "message": f"Forecasting error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ModelInfoView(views.APIView):
    """
    Returns SARIMA model architecture, training summary, and evaluation metrics (AIC, BIC, HQIC, MAE, RMSE, MAPE).
    """
    def get(self, request):
        metadata = ModelMetadata.objects.filter(is_active=True).first()
        service = SARIMAService()

        if not metadata:
            return Response({
                "status": "not_trained",
                "message": "No active trained SARIMA model found. Please train the model with historical data.",
                "configuration": {
                    "order": service.order,
                    "seasonal_order": service.seasonal_order,
                    "forecast_horizon": service.forecast_horizon,
                    "confidence_level": service.confidence_level,
                }
            }, status=status.HTTP_200_OK)

        serializer = ModelMetadataSerializer(metadata)
        return Response({
            "status": "trained",
            "model": serializer.data,
            "configuration": {
                "order": service.order,
                "seasonal_order": service.seasonal_order,
                "forecast_horizon": service.forecast_horizon,
                "confidence_level": service.confidence_level,
            }
        }, status=status.HTTP_200_OK)


class TrainModelView(views.APIView):
    """
    Triggers fitting of the SARIMA(0, 1, 2) x (0, 0, 1, 12) model on current historical price records.
    """
    def post(self, request):
        service = SARIMAService()
        try:
            result = service.train_and_save_model()
            return Response(result, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"status": "error", "message": f"Training failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VisualizationDataView(views.APIView):
    """
    Provides combined, chronologically unified time-series data for charting:
    - Historical price points
    - 12-month forecast points with upper and lower 95% confidence intervals
    """
    def get(self, request):
        service = SARIMAService()
        historical = MonthlyPriceRecord.objects.all().order_by('date')
        
        timeline = []
        for r in historical:
            timeline.append({
                "date": r.date.strftime('%Y-%m-%d'),
                "historical_price": float(r.price),
                "forecast_price": None,
                "confidence_lower": None,
                "confidence_upper": None,
                "is_forecast": False
            })

        forecasts = []
        try:
            forecasts = service.get_forecast_data()
        except Exception:
            pass

        for f in forecasts:
            timeline.append({
                "date": f['forecast_date'],
                "historical_price": None,
                "forecast_price": f['predicted_price'],
                "confidence_lower": f['confidence_lower'],
                "confidence_upper": f['confidence_upper'],
                "is_forecast": True
            })

        return Response({
            "total_points": len(timeline),
            "historical_points": len(historical),
            "forecast_points": len(forecasts),
            "timeline": timeline
        }, status=status.HTTP_200_OK)


class DashboardSummaryView(views.APIView):
    """
    Consolidated executive summary endpoint for the main dashboard view.
    """
    def get(self, request):
        service = SARIMAService()
        summary = service.get_dashboard_summary()
        return Response(summary, status=status.HTTP_200_OK)
