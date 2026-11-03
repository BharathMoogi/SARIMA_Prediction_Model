import io
from datetime import date
from decimal import Decimal
from pathlib import Path
from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APITestCase
from rest_framework import status

from .models import MonthlyPriceRecord, ModelMetadata, ForecastCache


# ---------------------------------------------------------------------------
# Isolated test model path — points to a separate file so that running the
# test suite NEVER reads or overwrites the production sarima_model.pkl.
# ---------------------------------------------------------------------------
TEST_MODEL_PATH = Path(__file__).resolve().parent.parent / 'ml_models' / 'sarima_test_model.pkl'

TEST_SARIMA_CONFIG = {
    'ORDER': (0, 1, 2),
    'SEASONAL_ORDER': (0, 0, 1, 12),
    'FORECAST_HORIZON': 12,
    'CONFIDENCE_LEVEL': 0.95,
    'MODEL_PATH': TEST_MODEL_PATH,
}


class MonthlyPriceModelTests(TestCase):
    def test_create_record(self):
        record = MonthlyPriceRecord.objects.create(
            date=date(2025, 1, 1),
            price=Decimal('105.50')
        )
        self.assertEqual(str(record), "2025-01: 105.50")
        self.assertEqual(record.price, Decimal('105.50'))


class HistoricalPriceAPITests(APITestCase):
    def setUp(self):
        self.r1 = MonthlyPriceRecord.objects.create(date=date(2024, 1, 1), price=Decimal('100.00'))
        self.r2 = MonthlyPriceRecord.objects.create(date=date(2024, 2, 1), price=Decimal('102.50'))
        self.r3 = MonthlyPriceRecord.objects.create(date=date(2024, 3, 1), price=Decimal('105.00'))

    def test_list_historical_records(self):
        response = self.client.get('/api/historical/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)

    def test_create_single_record(self):
        data = {'date': '2024-04-15', 'price': '108.00'}
        response = self.client.post('/api/historical/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Date should be normalized to 1st of month
        self.assertEqual(response.data['date'], '2024-04-01')

    def test_reject_duplicate_date(self):
        data = {'date': '2024-01-01', 'price': '110.00'}
        response = self.client.post('/api/historical/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bulk_json_upload(self):
        data = {
            'records': [
                {'date': '2024-05-01', 'price': '110.00'},
                {'date': '2024-06-01', 'price': '112.50'},
            ]
        }
        response = self.client.post('/api/historical/upload/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 2)
        self.assertEqual(MonthlyPriceRecord.objects.count(), 5)

    def test_bulk_csv_upload_standard_column(self):
        """Standard 'price' column in CSV should be detected."""
        csv_content = "date,price\n2024-07-01,115.00\n2024-08-01,117.50\n"
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'prices.csv'
        response = self.client.post('/api/historical/upload/', {'file': csv_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 2)

    def test_bulk_csv_upload_avg_monthly_price_column(self):
        """'avg_monthly_price' column should be auto-detected and mapped to price."""
        csv_content = "date,avg_monthly_price\n2024-09-01,15500\n2024-10-01,15750\n"
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'prices.csv'
        response = self.client.post('/api/historical/upload/', {'file': csv_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 2)


@override_settings(SARIMA_CONFIG=TEST_SARIMA_CONFIG)
class SARIMAEndToEndTests(APITestCase):
    """
    Integration tests for the SARIMA training, forecast, visualization,
    and dashboard endpoints.

    Uses an isolated TEST_MODEL_PATH so the production sarima_model.pkl
    is never touched.  The test saves its own artifact to
    ml_models/sarima_test_model.pkl and removes it after the test class.
    """

    @classmethod
    def setUpTestData(cls):
        # 36 months of synthetic price data (3 full annual cycles for s=12)
        base_price = 5000.0
        records = []
        for year_idx in range(3):
            year = 2022 + year_idx
            for month in range(1, 13):
                seasonal = 200.0 * (1 if month in [6, 7, 8] else (-1 if month in [1, 2, 12] else 0))
                price = base_price + (year_idx * 12 + month) * 50 + seasonal
                records.append(
                    MonthlyPriceRecord(
                        date=date(year, month, 1),
                        price=Decimal(str(round(price, 2)))
                    )
                )
        MonthlyPriceRecord.objects.bulk_create(records)

    @classmethod
    def tearDownClass(cls):
        # Remove test model artifact if it was created
        if TEST_MODEL_PATH.exists():
            TEST_MODEL_PATH.unlink()
        super().tearDownClass()

    def test_train_model_via_api(self):
        response = self.client.post('/api/train/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertIn('metrics', response.data)
        for key in ('aic', 'bic', 'hqic', 'mae', 'rmse', 'mape'):
            self.assertIn(key, response.data['metrics'])

        # Production model file must NOT have been modified — test writes
        # to TEST_MODEL_PATH (sarima_test_model.pkl), not sarima_model.pkl
        prod_model = TEST_MODEL_PATH.parent / 'sarima_model.pkl'
        if TEST_MODEL_PATH.exists() and prod_model.exists():
            self.assertGreaterEqual(
                TEST_MODEL_PATH.stat().st_mtime,
                prod_model.stat().st_mtime,
                "Test should have written to test model path, not production model path"
            )

    def test_forecast_endpoint_returns_12_months(self):
        # Train first so model artifact exists at test path
        self.client.post('/api/train/')
        response = self.client.get('/api/forecast/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        forecasts = response.data['forecasts']
        self.assertEqual(len(forecasts), 12)
        self.assertEqual(response.data['confidence_level'], 0.95)
        for fc in forecasts:
            self.assertLessEqual(fc['confidence_lower'], fc['predicted_price'])
            self.assertGreaterEqual(fc['confidence_upper'], fc['predicted_price'])

    def test_model_info_after_training(self):
        self.client.post('/api/train/')
        response = self.client.get('/api/model-info/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'trained')
        self.assertEqual(response.data['configuration']['order'], (0, 1, 2))
        self.assertEqual(response.data['configuration']['seasonal_order'], (0, 0, 1, 12))
        model_data = response.data['model']
        self.assertEqual(model_data['order'], [0, 1, 2])
        self.assertEqual(model_data['seasonal_order'], [0, 0, 1, 12])

    def test_visualization_endpoint(self):
        self.client.post('/api/train/')
        response = self.client.get('/api/visualization/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['historical_points'], 36)
        self.assertEqual(response.data['forecast_points'], 12)
        self.assertEqual(response.data['total_points'], 48)

    def test_dashboard_endpoint(self):
        self.client.post('/api/train/')
        response = self.client.get('/api/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['historical_summary']['total_records'], 36)
        self.assertEqual(response.data['forecast_summary']['horizon_months'], 12)
