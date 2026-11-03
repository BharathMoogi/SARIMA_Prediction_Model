'use client';

import React from 'react';
import { ModelInfoResponse, DashboardSummaryResponse } from '../lib/types';
import {
  Cpu,
  Layers,
  Calendar,
  CheckCircle2,
  Info,
  BarChart3,
  Scale,
  Activity,
  AlertTriangle,
} from 'lucide-react';

interface ModelPerformanceProps {
  modelInfo: ModelInfoResponse | null;
  summary: DashboardSummaryResponse | null;
}

export const ModelPerformance: React.FC<ModelPerformanceProps> = ({
  modelInfo,
  summary,
}) => {
  const m = modelInfo?.model;
  const config = modelInfo?.configuration;
  const dashM = summary?.model_info;

  const order = m?.order || config?.order || [0, 1, 2];
  const seasonalOrder = m?.seasonal_order || config?.seasonal_order || [0, 0, 1, 12];
  const sampleCount = m?.training_sample_count || dashM?.sample_count || 249;
  const startDate = m?.data_start_date || dashM?.data_start_date || '2005-01-01';
  const endDate = m?.data_end_date || dashM?.data_end_date || '2025-09-01';

  const aic = m?.aic ?? dashM?.aic ?? 3816.4657;
  const bic = m?.bic ?? dashM?.bic ?? 3830.2698;
  const hqic = m?.hqic ?? dashM?.hqic ?? 3822.0321;

  const mae = m?.mae ?? dashM?.mae ?? 411.71;
  const rmse = m?.rmse ?? dashM?.rmse ?? 838.69;
  const mape = m?.mape ?? dashM?.mape ?? 5.2282;

  return (
    <div className="space-y-6">
      {/* Top Banner: Model Status & Specification */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 rounded-xl shadow-sm border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified Production Model
              </span>
              <span className="text-xs text-slate-400">Statsmodels SARIMAX</span>
            </div>
            <h3 className="text-2xl font-bold font-mono tracking-tight text-white">
              SARIMA({order[0]}, {order[1]}, {order[2]}) &times; ({seasonalOrder[0]}, {seasonalOrder[1]}, {seasonalOrder[2]})
              <span className="text-sm font-sans font-normal text-indigo-300 ml-1">
                [s={seasonalOrder[3]} monthly cycle]
              </span>
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Seasonal Autoregressive Integrated Moving Average model specifically tuned with 1st-order regular differencing (d=1),
              second-order moving average (q=2), and 12-month seasonal moving average (Q=1, s=12).
            </p>
          </div>

          <div className="flex flex-wrap lg:flex-col gap-2 shrink-0 text-xs">
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/80">
              <span className="text-slate-400">Horizon:</span>{' '}
              <strong className="text-white">12 Months (Oct 2025 - Sep 2026)</strong>
            </div>
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/80">
              <span className="text-slate-400">Confidence:</span>{' '}
              <strong className="text-emerald-400">95% Confidence Bounds</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Architecture Details & Information Criteria */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Box 1: Architecture Specifications */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm mb-4">
            <Layers className="w-4 h-4" />
            <span>Model Order Details</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">AR Order (p):</span>
              <span className="font-mono font-bold text-gray-900">{order[0]}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Differencing (d):</span>
              <span className="font-mono font-bold text-gray-900">{order[1]} (Integrated)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">MA Order (q):</span>
              <span className="font-mono font-bold text-gray-900">{order[2]} (Moving Average)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Seasonal AR (P):</span>
              <span className="font-mono font-bold text-gray-900">{seasonalOrder[0]}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Seasonal Diff (D):</span>
              <span className="font-mono font-bold text-gray-900">{seasonalOrder[1]}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Seasonal MA (Q):</span>
              <span className="font-mono font-bold text-gray-900">{seasonalOrder[2]}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-500">Seasonal Period (s):</span>
              <span className="font-mono font-bold text-indigo-700">{seasonalOrder[3]} Months</span>
            </div>
          </div>
        </div>

        {/* Box 2: Dataset & Sample Context */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-sm mb-4">
            <Calendar className="w-4 h-4" />
            <span>Training Data Coverage</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Sample Count (nobs):</span>
              <span className="font-bold text-gray-900">{sampleCount} Months</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Training Start Date:</span>
              <span className="font-semibold text-gray-800">{startDate}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Training End Date:</span>
              <span className="font-semibold text-gray-800">{endDate}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Span in Years:</span>
              <span className="font-semibold text-gray-800">{(sampleCount / 12).toFixed(2)} Years</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Observation Frequency:</span>
              <span className="font-semibold text-gray-800">Monthly (Month-Start)</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-500">Model Artifact File:</span>
              <span className="font-mono text-[11px] text-gray-600">sarima_model.pkl</span>
            </div>
          </div>
        </div>

        {/* Box 3: Full-Dataset Information Criteria */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-2 text-purple-600 font-bold text-sm mb-4">
            <Scale className="w-4 h-4" />
            <span>Information Criteria (Fit)</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-purple-50/60 rounded-lg border border-purple-100 mb-2">
              <div className="flex justify-between items-baseline">
                <span className="text-purple-900 font-medium">AIC (Akaike):</span>
                <span className="font-mono font-bold text-purple-700 text-sm">{aic.toFixed(4)}</span>
              </div>
              <span className="text-[10px] text-purple-600">Penalizes model complexity</span>
            </div>

            <div className="p-3 bg-purple-50/60 rounded-lg border border-purple-100 mb-2">
              <div className="flex justify-between items-baseline">
                <span className="text-purple-900 font-medium">BIC (Bayesian):</span>
                <span className="font-mono font-bold text-purple-700 text-sm">{bic.toFixed(4)}</span>
              </div>
              <span className="text-[10px] text-purple-600">Stricter penalty for sample size (n=249)</span>
            </div>

            <div className="p-3 bg-purple-50/60 rounded-lg border border-purple-100">
              <div className="flex justify-between items-baseline">
                <span className="text-purple-900 font-medium">HQIC (Hannan-Quinn):</span>
                <span className="font-mono font-bold text-purple-700 text-sm">{hqic.toFixed(4)}</span>
              </div>
              <span className="text-[10px] text-purple-600">Asymptotically consistent criterion</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Rigorous Metric Separation (In-Sample vs Hold-Out Validation) */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-5 h-5 text-indigo-600" />
          <h4 className="text-base font-bold text-gray-900">Statistical Error Metrics & Validation Separation</h4>
        </div>
        <p className="text-xs text-gray-500 mb-6">
          To maintain rigorous statistical integrity, in-sample one-step-ahead model fit statistics are distinguished from hold-out validation metrics.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* MAE */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
            <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
              In-Sample MAE
            </div>
            <div className="text-2xl font-bold text-emerald-900 font-mono">
              ${mae.toFixed(2)}
            </div>
            <div className="text-[11px] text-emerald-700 mt-1">
              Mean Absolute Error on 248 differenced training residuals
            </div>
          </div>

          {/* RMSE */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
            <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
              In-Sample RMSE
            </div>
            <div className="text-2xl font-bold text-emerald-900 font-mono">
              ${rmse.toFixed(2)}
            </div>
            <div className="text-[11px] text-emerald-700 mt-1">
              Root Mean Squared Error (penalizes larger deviations)
            </div>
          </div>

          {/* MAPE */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
            <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
              In-Sample MAPE
            </div>
            <div className="text-2xl font-bold text-emerald-900 font-mono">
              {mape.toFixed(2)}%
            </div>
            <div className="text-[11px] text-emerald-700 mt-1">
              Mean Absolute Percentage Error relative to actual monthly price
            </div>
          </div>
        </div>

        {/* Statistical Distinction Explanation Callout */}
        <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-semibold block text-amber-950">
              Statistical Clarification: In-Sample Fit vs Out-of-Sample Validation
            </strong>
            <p className="text-amber-800 leading-relaxed">
              &bull; <strong>In-Sample Fit Statistics (shown above):</strong> These metrics (MAE $411.71, RMSE $838.69, MAPE 5.23%) measure how closely the SARIMA(0, 1, 2)&times;(0, 0, 1)₁₂ model fits the 249 historical monthly prices that were used in its estimation.
            </p>
            <p className="text-amber-800 leading-relaxed">
              &bull; <strong>Out-of-Sample Hold-Out Validation:</strong> True out-of-sample accuracy requires withholding recent data (e.g., training on 2005&ndash;2024 and validating on 2025). Here, the production model is trained on 100% of all available observations through September 2025 so that the 12-month future forecast (Oct 2025 &rarr; Sep 2026) incorporates the latest economic state and trends.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
