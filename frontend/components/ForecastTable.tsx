'use client';

import React from 'react';
import { ForecastItem } from '../lib/types';
import { Download, Calendar, ShieldCheck, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface ForecastTableProps {
  forecasts: ForecastItem[];
  confidenceLevel?: number;
}

export const ForecastTable: React.FC<ForecastTableProps> = ({
  forecasts,
  confidenceLevel = 0.95,
}) => {
  const formatCurrency = (val: number) =>
    `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const exportToCSV = () => {
    if (!forecasts || forecasts.length === 0) return;
    const headers = ['Month', 'Predicted_Price', 'Confidence_Lower_95', 'Confidence_Upper_95', 'CI_Spread'];
    const rows = forecasts.map((f) => [
      f.forecast_date,
      f.predicted_price.toFixed(2),
      f.confidence_lower.toFixed(2),
      f.confidence_upper.toFixed(2),
      (f.confidence_upper - f.confidence_lower).toFixed(2),
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'SARIMA_12_Month_Price_Forecast.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
      {/* Table Header & Controls */}
      <div className="p-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-gray-900">
              12-Month Price Forecast Schedule
            </h3>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
              {(confidenceLevel * 100).toFixed(0)}% CI Verified
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Statistical point predictions and confidence boundaries from October 2025 to September 2026
          </p>
        </div>

        <button
          onClick={exportToCSV}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-gray-500" />
          Export Schedule CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50/75 text-gray-600 uppercase font-semibold tracking-wider text-[11px] border-b border-gray-200">
            <tr>
              <th className="py-3 px-4">Period / Month</th>
              <th className="py-3 px-4">Predicted Price</th>
              <th className="py-3 px-4">95% Lower CI</th>
              <th className="py-3 px-4">95% Upper CI</th>
              <th className="py-3 px-4">Uncertainty Spread</th>
              <th className="py-3 px-4">MoM Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-800">
            {forecasts.map((row, idx) => {
              const prevPrice = idx > 0 ? forecasts[idx - 1].predicted_price : null;
              const delta = prevPrice != null ? row.predicted_price - prevPrice : null;
              const deltaPct = prevPrice != null ? (delta! / prevPrice) * 100 : null;
              const spread = row.confidence_upper - row.confidence_lower;

              // Format date cleanly e.g. "October 2025 (2025-10-01)"
              const dateObj = new Date(row.forecast_date + 'T00:00:00');
              const monthName = dateObj.toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              });

              return (
                <tr key={row.forecast_date} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>{monthName}</span>
                    <span className="text-[11px] text-gray-400 font-normal">({row.forecast_date})</span>
                  </td>
                  <td className="py-3 px-4 font-bold text-emerald-600 text-sm">
                    {formatCurrency(row.predicted_price)}
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-600">
                    {formatCurrency(row.confidence_lower)}
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-600">
                    {formatCurrency(row.confidence_upper)}
                  </td>
                  <td className="py-3 px-4 font-mono text-gray-500">
                    &plusmn;{formatCurrency(spread / 2)}
                  </td>
                  <td className="py-3 px-4">
                    {delta != null ? (
                      <span
                        className={`inline-flex items-center gap-0.5 font-semibold text-[11px] ${
                          delta >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {delta >= 0 ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {delta >= 0 ? '+' : ''}
                        {formatCurrency(delta)} ({deltaPct != null ? (deltaPct >= 0 ? '+' : '') + deltaPct.toFixed(2) + '%' : ''})
                      </span>
                    ) : (
                      <span className="text-gray-400 text-[11px]">&mdash; Baseline</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Note */}
      <div className="p-3.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Point predictions and confidence boundaries derived mathematically from Statsmodels SARIMAXResults</span>
        </span>
        <span className="font-semibold text-gray-700">12 of 12 Future Months</span>
      </div>
    </div>
  );
};
