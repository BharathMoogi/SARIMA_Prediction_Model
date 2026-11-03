from django.contrib import admin
from .models import MonthlyPriceRecord, ModelMetadata, ForecastCache


@admin.register(MonthlyPriceRecord)
class MonthlyPriceRecordAdmin(admin.ModelAdmin):
    list_display = ('date', 'price', 'created_at', 'updated_at')
    list_filter = ('date',)
    search_fields = ('date',)
    ordering = ('-date',)


@admin.register(ModelMetadata)
class ModelMetadataAdmin(admin.ModelAdmin):
    list_display = ('name', 'order_display', 'seasonal_order_display', 'mae', 'rmse', 'mape', 'aic', 'trained_at', 'is_active')
    list_filter = ('is_active', 'trained_at')

    def order_display(self, obj):
        return f"({obj.order_p}, {obj.order_d}, {obj.order_q})"
    order_display.short_description = "Order"

    def seasonal_order_display(self, obj):
        return f"({obj.seasonal_p}, {obj.seasonal_d}, {obj.seasonal_q}, {obj.seasonal_s})"
    seasonal_order_display.short_description = "Seasonal Order"


@admin.register(ForecastCache)
class ForecastCacheAdmin(admin.ModelAdmin):
    list_display = ('forecast_date', 'predicted_price', 'confidence_lower', 'confidence_upper', 'confidence_level', 'created_at')
    ordering = ('forecast_date',)
