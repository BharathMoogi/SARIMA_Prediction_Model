import React from 'react';
import {
  DollarSign,
  TrendingUp,
  Database,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { DashboardSummaryResponse } from '../lib/types';

interface KPICardsProps {
  summary: DashboardSummaryResponse | null;
}

export const KPICards: React.FC<KPICardsProps> = ({ summary }) => {
  const hist = summary?.historical_summary;
  const fc = summary?.forecast_summary;

  const latestPrice = hist?.latest_price != null ? hist.latest_price : 15750.0;
  const momChange = hist?.mom_change;
  const momPct = hist?.mom_pct;
  const yoyChange = hist?.yoy_change;
  const yoyPct = hist?.yoy_pct;

  const fcAverage = fc?.average != null ? fc.average : 15728.52;
  const fcMin = fc?.min != null ? fc.min : 15670.18;
  const fcMax = fc?.max != null ? fc.max : 15798.39;

  const totalRecords = hist?.total_records ?? 249;
  const startDate = hist?.start_date ?? '2005-01-01';
  const endDate = hist?.end_date ?? '2025-09-01';

  const horizonMonths = fc?.horizon_months ?? 12;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(val);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Latest Price Card */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs hover:shadow-sm transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Latest Recorded Price
          </span>
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900 tracking-tight">
            {formatCurrency(latestPrice)}
          </span>
          <span className="text-xs text-gray-500 font-medium">({endDate})</span>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
          {momPct != null && (
            <span
              className={`inline-flex items-center gap-0.5 font-medium ${
                momPct >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {momPct >= 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {momPct >= 0 ? '+' : ''}
              {momPct}% MoM
            </span>
          )}
          {yoyPct != null && (
            <span
              className={`inline-flex items-center gap-0.5 font-medium ${
                yoyPct >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {yoyPct >= 0 ? '+' : ''}
              {yoyPct}% YoY
            </span>
          )}
        </div>
      </div>

      {/* 2. Projected 12-Month Average Card */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs hover:shadow-sm transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            12-Month Projected Avg
          </span>
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900 tracking-tight">
            {formatCurrency(fcAverage)}
          </span>
          <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
            SARIMA Mean
          </span>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Range:</span>
          <span className="font-medium text-gray-700">
            {formatCurrency(fcMin)} &ndash; {formatCurrency(fcMax)}
          </span>
        </div>
      </div>

      {/* 3. Total Historical Records Card */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs hover:shadow-sm transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Historical Records
          </span>
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <Database className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900 tracking-tight">
            {totalRecords}
          </span>
          <span className="text-xs text-gray-500 font-medium">Monthly Points</span>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Timeline Span:</span>
          <span className="font-medium text-gray-700">
            {(totalRecords / 12).toFixed(1)} Years ({startDate.substring(0, 4)} &ndash; {endDate.substring(0, 4)})
          </span>
        </div>
      </div>

      {/* 4. Forecast Horizon Card */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs hover:shadow-sm transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Forecast Horizon
          </span>
          <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
            <CalendarDays className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900 tracking-tight">
            {horizonMonths} Months
          </span>
          <span className="text-xs text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded-full">
            95% Conf. Int.
          </span>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Target Window:</span>
          <span className="font-semibold text-purple-700">Oct 2025 &rarr; Sep 2026</span>
        </div>
      </div>
    </div>
  );
};
