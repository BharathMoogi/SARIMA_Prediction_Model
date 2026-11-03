from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MonthlyPriceRecordViewSet,
    ForecastView,
    ModelInfoView,
    TrainModelView,
    VisualizationDataView,
    DashboardSummaryView
)

router = DefaultRouter()
router.register(r'historical', MonthlyPriceRecordViewSet, basename='historical')

urlpatterns = [
    # Router endpoints (e.g. /api/historical/ and /api/historical/upload/)
    path('', include(router.urls)),
    
    # Specific API endpoints
    path('forecast/', ForecastView.as_view(), name='forecast'),
    path('model-info/', ModelInfoView.as_view(), name='model-info'),
    path('train/', TrainModelView.as_view(), name='train-model'),
    path('visualization/', VisualizationDataView.as_view(), name='visualization'),
    path('dashboard/', DashboardSummaryView.as_view(), name='dashboard-summary'),
]
