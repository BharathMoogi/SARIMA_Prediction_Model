from rest_framework import serializers
from decimal import Decimal
from datetime import date
from .models import MonthlyPriceRecord, ModelMetadata, ForecastCache


class MonthlyPriceRecordSerializer(serializers.ModelSerializer):
    """
    Serializer for individual historical monthly price records.
    """
    price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))

    class Meta:
        model = MonthlyPriceRecord
        fields = ['id', 'date', 'price', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_date(self, value):
        # Normalize date to the 1st of the month
        return date(value.year, value.month, 1)


class ForecastRecordSerializer(serializers.ModelSerializer):
    """
    Serializer for the 12-month SARIMA forecast table.
    """
    class Meta:
        model = ForecastCache
        fields = [
            'id',
            'forecast_date',
            'predicted_price',
            'confidence_lower',
            'confidence_upper',
            'confidence_level',
            'created_at',
        ]
        read_only_fields = fields


class ModelMetadataSerializer(serializers.ModelSerializer):
    """
    Serializer for model architecture details, hyperparameters, and evaluation metrics.
    """
    order = serializers.SerializerMethodField()
    seasonal_order = serializers.SerializerMethodField()

    class Meta:
        model = ModelMetadata
        fields = [
            'id',
            'name',
            'order',
            'seasonal_order',
            'aic',
            'bic',
            'hqic',
            'mae',
            'rmse',
            'mape',
            'training_sample_count',
            'data_start_date',
            'data_end_date',
            'trained_at',
            'is_active',
        ]

    def get_order(self, obj):
        return [obj.order_p, obj.order_d, obj.order_q]

    def get_seasonal_order(self, obj):
        return [obj.seasonal_p, obj.seasonal_d, obj.seasonal_q, obj.seasonal_s]


class HistoricalUploadItemSerializer(serializers.Serializer):
    date = serializers.DateField()
    price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))

    def validate_date(self, value):
        return date(value.year, value.month, 1)


class BulkPriceUploadSerializer(serializers.Serializer):
    """
    Validates uploaded JSON or parsed CSV records.
    """
    records = HistoricalUploadItemSerializer(many=True)
