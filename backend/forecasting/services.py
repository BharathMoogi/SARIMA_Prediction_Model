import os
import logging
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from decimal import Decimal
import numpy as np
import pandas as pd

from django.conf import settings
from django.db import transaction
from statsmodels.tsa.statespace.sarimax import SARIMAXResultsWrapper, SARIMAX

from .models import MonthlyPriceRecord, ModelMetadata, ForecastCache

logger = logging.getLogger(__name__)


class SARIMAService:
    """
    Encapsulates all logic for loading, evaluating, and generating
    forecasts using the SARIMA(0, 1, 2)(0, 0, 1, 12) production model.

    The production model is a Statsmodels SARIMAXResultsWrapper persisted
    via SARIMAXResults.save() / SARIMAXResults.load() (not joblib).

    The joblib artifact (sarima_model.joblib) was created from a small
    36-observation synthetic test run and is retained as
    synthetic_test_model_backup.joblib only; it is not used in production.
    """

    def __init__(self):
        config = getattr(settings, 'SARIMA_CONFIG', {})
        self.order = config.get('ORDER', (0, 1, 2))
        self.seasonal_order = config.get('SEASONAL_ORDER', (0, 0, 1, 12))
        self.forecast_horizon = config.get('FORECAST_HORIZON', 12)
        self.confidence_level = config.get('CONFIDENCE_LEVEL', 0.95)
        self.model_path = config.get(
            'MODEL_PATH',
            settings.BASE_DIR / 'ml_models' / 'sarima_model.pkl'
        )

    # ------------------------------------------------------------------
    # Model loading
    # ------------------------------------------------------------------

    def load_model(self):
        """
        Loads the pre-trained Statsmodels SARIMAX results object from disk.

        Uses SARIMAXResultsWrapper.load() (the native Statsmodels persistence
        format) rather than joblib.  Falls back to joblib for any legacy
        .joblib artifact if needed, but the production model is a .pkl file.
        """
        path = str(self.model_path)
        if not os.path.exists(path):
            logger.warning(f"Model file not found at: {path}")
            return None

        # Primary: Statsmodels native load
        try:
            from statsmodels.tsa.statespace.sarimax import SARIMAXResults
            fitted_model = SARIMAXResults.load(path)
            logger.info(f"Model loaded via SARIMAXResults.load() from {path}")
            return fitted_model
        except Exception as sm_err:
            logger.warning(f"SARIMAXResults.load() failed ({sm_err}); trying joblib fallback.")

        # Fallback: joblib (legacy synthetic test artifact only)
        try:
            import joblib
            fitted_model = joblib.load(path)
            logger.warning(f"Model loaded via joblib.load() from {path} (legacy path).")
            return fitted_model
        except Exception as jl_err:
            logger.error(f"Both loading strategies failed for {path}: {jl_err}")
            return None

    # ------------------------------------------------------------------
    # Historical series
    # ------------------------------------------------------------------

    def load_series_from_db(self) -> pd.Series:
        """
        Returns a MonthFrequency pandas Series indexed with DatetimeIndex
        from all MonthlyPriceRecord rows ordered by date.
        """
        records = MonthlyPriceRecord.objects.all().order_by('date')
        if not records.exists():
            return pd.Series(dtype=float)

        data = [{'date': r.date, 'price': float(r.price)} for r in records]
        df = pd.DataFrame(data)
        df['date'] = pd.to_datetime(df['date'])
        df.set_index('date', inplace=True)
        series = df['price'].asfreq('MS')

        if series.isna().any():
            logger.warning("Missing months detected in historical series; interpolating linearly.")
            series = series.interpolate(method='linear')

        return series

    # ------------------------------------------------------------------
    # Metadata sync
    # ------------------------------------------------------------------

    def sync_metadata_from_loaded_model(self, fitted_model) -> ModelMetadata:
        """
        Reads statistical properties directly from a loaded
        SARIMAXResultsWrapper and writes (or updates) the ModelMetadata row.

        Metrics stored:
        - AIC / BIC / HQIC: full-dataset information criteria from the
          fitted model (these are model-fit statistics, not out-of-sample
          accuracy metrics).
        - MAE / RMSE / MAPE: in-sample one-step-ahead residual statistics
          computed on observations after the first differenced step.

        IMPORTANT: These are *in-sample* fit metrics only, not held-out
        validation metrics.  Do not interpret them as out-of-sample accuracy.
        """
        sm_model = fitted_model.model

        aic = float(fitted_model.aic)
        bic = float(fitted_model.bic)
        hqic = float(fitted_model.hqic)
        nobs = int(fitted_model.nobs)

        # Date range from the model's own training index
        dates = sm_model.data.dates
        data_start = dates[0].date() if dates is not None else None
        data_end = dates[-1].date() if dates is not None else None

        # In-sample one-step residuals  (skip first obs because d=1)
        actuals = np.array(sm_model.data.orig_endog, dtype=float)
        fitted_vals = np.array(fitted_model.fittedvalues, dtype=float)
        eval_actuals = actuals[1:]
        eval_fitted = fitted_vals[1:]
        errors = eval_actuals - eval_fitted

        mae = float(np.mean(np.abs(errors)))
        rmse = float(np.sqrt(np.mean(errors ** 2)))
        nonzero = eval_actuals != 0
        mape = float(np.mean(np.abs(errors[nonzero] / eval_actuals[nonzero])) * 100) if np.any(nonzero) else 0.0

        model_name = (
            f"SARIMA{sm_model.order}x{sm_model.seasonal_order}"
        )

        metadata, created = ModelMetadata.objects.update_or_create(
            name=model_name,
            defaults={
                'order_p': sm_model.order[0],
                'order_d': sm_model.order[1],
                'order_q': sm_model.order[2],
                'seasonal_p': sm_model.seasonal_order[0],
                'seasonal_d': sm_model.seasonal_order[1],
                'seasonal_q': sm_model.seasonal_order[2],
                'seasonal_s': sm_model.seasonal_order[3],
                'aic': round(aic, 4),
                'bic': round(bic, 4),
                'hqic': round(hqic, 4),
                'mae': round(mae, 2),
                'rmse': round(rmse, 2),
                'mape': round(mape, 4),
                'training_sample_count': nobs,
                'data_start_date': data_start,
                'data_end_date': data_end,
                'is_active': True,
            }
        )
        action = "Created" if created else "Updated"
        logger.info(f"{action} ModelMetadata: {model_name} (nobs={nobs})")
        return metadata

    # ------------------------------------------------------------------
    # Forecast generation
    # ------------------------------------------------------------------

    def generate_forecast(self, fitted_model=None, last_date: date = None) -> list:
        """
        Generates self.forecast_horizon monthly predictions with
        (1 - alpha) = self.confidence_level confidence intervals and
        caches them atomically in ForecastCache.

        Clears all existing ForecastCache rows before writing new ones so
        stale entries from previous (e.g. synthetic test) runs are removed.
        """
        if fitted_model is None:
            fitted_model = self.load_model()

        if fitted_model is None:
            raise ValueError(
                "Production model could not be loaded from "
                f"{self.model_path}.  Ensure the file exists and is a valid "
                "Statsmodels SARIMAXResults artifact."
            )

        # Determine the anchor date (last observation in training data)
        if last_date is None:
            # Prefer the model's own training end date for accuracy
            dates = fitted_model.model.data.dates
            if dates is not None and len(dates) > 0:
                last_date = dates[-1].date()
            else:
                latest_record = MonthlyPriceRecord.objects.order_by('-date').first()
                if not latest_record:
                    raise ValueError("No historical price records found.")
                last_date = latest_record.date

        alpha = 1.0 - self.confidence_level
        forecast_res = fitted_model.get_forecast(steps=self.forecast_horizon)
        predicted_mean = forecast_res.predicted_mean
        conf_int = forecast_res.conf_int(alpha=alpha)

        anchor = date(last_date.year, last_date.month, 1)

        with transaction.atomic():
            ForecastCache.objects.all().delete()

            forecast_list = []
            for i in range(self.forecast_horizon):
                next_date = anchor + relativedelta(months=i + 1)
                pred_val = float(predicted_mean.iloc[i])
                lower_val = float(conf_int.iloc[i, 0])
                upper_val = float(conf_int.iloc[i, 1])

                ForecastCache.objects.create(
                    forecast_date=next_date,
                    predicted_price=Decimal(str(round(pred_val, 6))),
                    confidence_lower=Decimal(str(round(lower_val, 6))),
                    confidence_upper=Decimal(str(round(upper_val, 6))),
                    confidence_level=self.confidence_level,
                )
                forecast_list.append({
                    'forecast_date': next_date.strftime('%Y-%m-%d'),
                    'predicted_price': round(pred_val, 2),
                    'confidence_lower': round(lower_val, 2),
                    'confidence_upper': round(upper_val, 2),
                    'confidence_level': self.confidence_level,
                })

        return forecast_list

    def get_forecast_data(self) -> list:
        """
        Returns the cached 12-month forecast. Regenerates if cache is empty
        or incomplete.
        """
        cached = ForecastCache.objects.all().order_by('forecast_date')
        if cached.count() == self.forecast_horizon:
            return [
                {
                    'forecast_date': item.forecast_date.strftime('%Y-%m-%d'),
                    'predicted_price': float(item.predicted_price),
                    'confidence_lower': float(item.confidence_lower),
                    'confidence_upper': float(item.confidence_upper),
                    'confidence_level': item.confidence_level,
                }
                for item in cached
            ]
        return self.generate_forecast()

    # ------------------------------------------------------------------
    # Training (retrain from DB records)
    # ------------------------------------------------------------------

    def train_and_save_model(self) -> dict:
        """
        Fits SARIMA(0,1,2)(0,0,1,12) on current MonthlyPriceRecord rows,
        saves the artifact via SARIMAXResults.save() (Statsmodels native),
        syncs metadata, and regenerates the forecast cache.

        Requires at least 24 monthly observations.
        """
        series = self.load_series_from_db()
        if len(series) < 24:
            raise ValueError(
                f"Insufficient data: {len(series)} records found. "
                f"At least 24 are required."
            )

        logger.info(
            f"Fitting SARIMA {self.order}x{self.seasonal_order} "
            f"on {len(series)} observations."
        )

        model = SARIMAX(
            series,
            order=self.order,
            seasonal_order=self.seasonal_order,
            enforce_stationarity=False,
            enforce_invertibility=False,
        )
        fitted_model = model.fit(disp=False, maxiter=200)

        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        fitted_model.save(str(self.model_path))
        logger.info(f"Model saved (Statsmodels native) to {self.model_path}")

        metadata = self.sync_metadata_from_loaded_model(fitted_model)
        forecast_results = self.generate_forecast(fitted_model=fitted_model)

        return {
            'status': 'success',
            'message': 'Model trained, saved, metadata synced, and forecast regenerated.',
            'metrics': {
                'aic': metadata.aic,
                'bic': metadata.bic,
                'hqic': metadata.hqic,
                'mae': metadata.mae,
                'rmse': metadata.rmse,
                'mape': metadata.mape,
            },
            'sample_count': len(series),
            'forecast_count': len(forecast_results),
        }

    # ------------------------------------------------------------------
    # Dashboard summary
    # ------------------------------------------------------------------

    def get_dashboard_summary(self) -> dict:
        historical_qs = MonthlyPriceRecord.objects.all().order_by('date')
        hist_count = historical_qs.count()
        latest_record = historical_qs.last()
        first_record = historical_qs.first()

        latest_price = float(latest_record.price) if latest_record else None
        latest_date = latest_record.date.strftime('%Y-%m-%d') if latest_record else None

        mom_change = mom_pct = yoy_change = yoy_pct = None
        if hist_count >= 2:
            prev = historical_qs[hist_count - 2]
            mom_change = round(latest_price - float(prev.price), 2)
            if float(prev.price) != 0:
                mom_pct = round((mom_change / float(prev.price)) * 100, 2)

        if hist_count >= 13:
            prev_year = historical_qs[hist_count - 13]
            yoy_change = round(latest_price - float(prev_year.price), 2)
            if float(prev_year.price) != 0:
                yoy_pct = round((yoy_change / float(prev_year.price)) * 100, 2)

        forecasts = []
        try:
            forecasts = self.get_forecast_data()
        except Exception as e:
            logger.warning(f"Could not retrieve forecast for dashboard: {e}")

        forecast_stats = {}
        if forecasts:
            prices = [f['predicted_price'] for f in forecasts]
            forecast_stats = {
                'average': round(sum(prices) / len(prices), 2),
                'min': round(min(prices), 2),
                'max': round(max(prices), 2),
                'horizon_months': len(prices),
                'first_month_prediction': prices[0],
                'final_month_prediction': prices[-1],
                'projected_change': round(prices[-1] - latest_price, 2) if latest_price else None,
                'projected_change_pct': round(((prices[-1] - latest_price) / latest_price) * 100, 2)
                if latest_price and latest_price != 0 else None,
            }

        metadata = ModelMetadata.objects.filter(is_active=True).first()
        model_info = None
        if metadata:
            model_info = {
                'name': metadata.name,
                'order': (metadata.order_p, metadata.order_d, metadata.order_q),
                'seasonal_order': (
                    metadata.seasonal_p, metadata.seasonal_d,
                    metadata.seasonal_q, metadata.seasonal_s
                ),
                'mae': metadata.mae,
                'rmse': metadata.rmse,
                'mape': metadata.mape,
                'aic': metadata.aic,
                'bic': metadata.bic,
                'hqic': metadata.hqic,
                'sample_count': metadata.training_sample_count,
                'trained_at': metadata.trained_at.strftime('%Y-%m-%d %H:%M:%S'),
                'data_start_date': str(metadata.data_start_date),
                'data_end_date': str(metadata.data_end_date),
                'metrics_note': (
                    'MAE/RMSE/MAPE are in-sample one-step-ahead fit statistics. '
                    'AIC/BIC/HQIC are full-dataset model selection criteria.'
                ),
            }

        return {
            'historical_summary': {
                'total_records': hist_count,
                'start_date': first_record.date.strftime('%Y-%m-%d') if first_record else None,
                'end_date': latest_date,
                'latest_price': latest_price,
                'mom_change': mom_change,
                'mom_pct': mom_pct,
                'yoy_change': yoy_change,
                'yoy_pct': yoy_pct,
            },
            'forecast_summary': forecast_stats,
            'model_info': model_info,
        }
