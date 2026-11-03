export interface HistoricalRecord {
  id: number;
  date: string; // YYYY-MM-DD
  price: string; // Decimal string e.g. "15750.00"
  created_at: string;
  updated_at: string;
}

export interface ForecastItem {
  forecast_date: string; // YYYY-MM-DD
  predicted_price: number;
  confidence_lower: number;
  confidence_upper: number;
  confidence_level: number;
}

export interface ForecastResponse {
  status: string;
  horizon_months: number;
  confidence_level: number;
  order: [number, number, number];
  seasonal_order: [number, number, number, number];
  forecasts: ForecastItem[];
}

export interface ModelMetadataDetails {
  id: number;
  name: string;
  order: [number, number, number];
  seasonal_order: [number, number, number, number];
  aic: number;
  bic: number;
  hqic: number;
  mae: number;
  rmse: number;
  mape: number;
  training_sample_count: number;
  data_start_date: string;
  data_end_date: string;
  trained_at: string;
  is_active: boolean;
}

export interface ModelInfoResponse {
  status: 'trained' | 'not_trained';
  message?: string;
  model?: ModelMetadataDetails;
  configuration: {
    order: [number, number, number];
    seasonal_order: [number, number, number, number];
    forecast_horizon: number;
    confidence_level: number;
  };
}

export interface HistoricalSummary {
  total_records: number;
  start_date: string | null;
  end_date: string | null;
  latest_price: number | null;
  mom_change: number | null;
  mom_pct: number | null;
  yoy_change: number | null;
  yoy_pct: number | null;
}

export interface ForecastSummary {
  average: number;
  min: number;
  max: number;
  horizon_months: number;
  first_month_prediction: number;
  final_month_prediction: number;
  projected_change: number | null;
  projected_change_pct: number | null;
}

export interface DashboardModelInfo {
  name: string;
  order: [number, number, number];
  seasonal_order: [number, number, number, number];
  mae: number;
  rmse: number;
  mape: number;
  aic: number;
  bic: number;
  hqic: number;
  sample_count: number;
  trained_at: string;
  data_start_date?: string;
  data_end_date?: string;
  metrics_note?: string;
}

export interface DashboardSummaryResponse {
  historical_summary: HistoricalSummary;
  forecast_summary: ForecastSummary;
  model_info: DashboardModelInfo | null;
}

export interface TimelinePoint {
  date: string;
  historical_price: number | null;
  forecast_price: number | null;
  confidence_lower: number | null;
  confidence_upper: number | null;
  is_forecast: boolean;
}

export interface VisualizationResponse {
  total_points: number;
  historical_points: number;
  forecast_points: number;
  timeline: TimelinePoint[];
}

export interface UploadResponse {
  message: string;
  created: number;
  updated: number;
  total_now: number;
}
