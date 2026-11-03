'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import { TimelinePoint } from '../lib/types';
import { TrendingUp, ShieldCheck, HelpCircle } from 'lucide-react';

interface ForecastComparisonChartProps {
  timeline: TimelinePoint[];
}

export const ForecastComparisonChart: React.FC<ForecastComparisonChartProps> = ({ timeline }) => {
  const [viewMode, setViewMode] = useState<'RECENT' | 'TRANSITION' | 'ALL'>('RECENT');

  // Process timeline for smooth Recharts rendering with confidence bounds
  const processedData = useMemo(() => {
    // Find transition index (last historical point)
    let lastHistIndex = -1;
    for (let i = 0; i < timeline.length; i++) {
      if (timeline[i].historical_price != null) {
        lastHistIndex = i;
      }
    }

    return timeline.map((pt, idx) => {
      // Connect the forecast line starting at the last historical observation for continuity
      const isAnchor = idx === lastHistIndex;
      return {
        date: pt.date,
        historical: pt.historical_price,
        forecast: pt.forecast_price != null ? pt.forecast_price : (isAnchor ? pt.historical_price : null),
        ciRange:
          pt.confidence_lower != null && pt.confidence_upper != null
            ? [pt.confidence_lower, pt.confidence_upper]
            : null,
        lowerCI: pt.confidence_lower,
        upperCI: pt.confidence_upper,
        isForecast: pt.is_forecast,
      };
    });
  }, [timeline]);

  const filteredData = useMemo(() => {
    if (processedData.length === 0) return [];
    if (viewMode === 'TRANSITION') {
      // Last 12 historical + 12 forecast = 24 points
      return processedData.slice(-24);
    }
    if (viewMode === 'RECENT') {
      // Last 36 historical + 12 forecast = 48 points
      return processedData.slice(-48);
    }
    return processedData;
  }, [processedData, viewMode]);

  const formatCurrency = (val: number | null | undefined) =>
    val != null
      ? `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '—';

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
      {/* Header and View Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-gray-900">Historical vs SARIMA 12-Month Forecast</h3>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
              95% Confidence Interval
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Historical trajectory (2005-Sep 2025) contrasted with statistical SARIMA predictions (Oct 2025-Sep 2026)
          </p>
        </div>

        {/* View Range Selector */}
        <div className="inline-flex rounded-lg bg-gray-100 p-1 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('RECENT')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              viewMode === 'RECENT'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Recent Context (48M)
          </button>
          <button
            onClick={() => setViewMode('TRANSITION')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              viewMode === 'TRANSITION'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Transition Zoom (24M)
          </button>
          <button
            onClick={() => setViewMode('ALL')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              viewMode === 'ALL'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Full Timeline
          </button>
        </div>
      </div>

      {/* Legend & Indicator Banner */}
      <div className="flex flex-wrap items-center gap-5 p-3 mb-6 bg-slate-50 border border-slate-200/80 rounded-lg text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-1 bg-indigo-600 rounded-full inline-block"></span>
          <span className="text-gray-700 font-medium">Historical Observations</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-1 bg-emerald-600 rounded-full inline-block border-b-2 border-dashed border-emerald-600"></span>
          <span className="text-gray-700 font-medium">SARIMA Forecast (Point Mean)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3 bg-emerald-100 border border-emerald-300 rounded inline-block"></span>
          <span className="text-gray-700 font-medium">95% Confidence Band (Lower &ndash; Upper)</span>
        </div>
        <div className="ml-auto text-gray-500 hidden lg:inline-flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Forecast Horizon: Oct 2025 &rarr; Sep 2026</span>
        </div>
      </div>

      {/* Composed Chart */}
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={filteredData} margin={{ top: 15, right: 25, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="ciFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.08} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              stroke="#94a3b8"
              fontSize={11}
              tickFormatter={(val: string) => {
                if (!val) return '';
                const [year, month] = val.split('-');
                return `${month}/${year.slice(2)}`;
              }}
              minTickGap={25}
            />
            <YAxis
              tickLine={false}
              stroke="#94a3b8"
              fontSize={11}
              domain={['auto', 'auto']}
              tickFormatter={(val: number) => `$${(val / 1000).toFixed(1)}k`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as {
                    date: string;
                    historical: number | null;
                    forecast: number | null;
                    lowerCI: number | null;
                    upperCI: number | null;
                    isForecast: boolean;
                  };

                  return (
                    <div className="bg-slate-900 text-white p-3.5 rounded-lg shadow-xl text-xs border border-slate-700 min-w-[210px]">
                      <div className="font-semibold text-slate-300 pb-1.5 border-b border-slate-800 flex items-center justify-between">
                        <span>{item.date}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                            item.isForecast
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                          }`}
                        >
                          {item.isForecast ? 'Forecast' : 'Historical'}
                        </span>
                      </div>

                      <div className="mt-2 space-y-1.5">
                        {item.historical != null && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Recorded Price:</span>
                            <span className="font-bold text-indigo-400">{formatCurrency(item.historical)}</span>
                          </div>
                        )}

                        {item.forecast != null && item.isForecast && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">SARIMA Mean:</span>
                            <span className="font-bold text-emerald-400">{formatCurrency(item.forecast)}</span>
                          </div>
                        )}

                        {item.lowerCI != null && item.upperCI != null && (
                          <div className="pt-1.5 border-t border-slate-800/80 text-[11px] text-slate-400">
                            <div className="flex justify-between">
                              <span>95% CI Lower:</span>
                              <span className="text-slate-200">{formatCurrency(item.lowerCI)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>95% CI Upper:</span>
                              <span className="text-slate-200">{formatCurrency(item.upperCI)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Transition Line at 2025-09-01 / 2025-10-01 */}
            <ReferenceLine
              x="2025-09-01"
              stroke="#64748b"
              strokeDasharray="4 4"
              label={{
                value: 'Forecast Start',
                position: 'top',
                fill: '#64748b',
                fontSize: 10,
                fontWeight: 600,
              }}
            />

            {/* 95% Confidence Interval Band */}
            <Area
              type="monotone"
              dataKey="ciRange"
              stroke="transparent"
              fill="url(#ciFill)"
              name="95% Confidence Interval"
              legendType="none"
            />

            {/* Historical Series */}
            <Line
              type="monotone"
              dataKey="historical"
              stroke="#4f46e5"
              strokeWidth={2.5}
              dot={false}
              name="Historical Actual"
            />

            {/* Forecast Series */}
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="#059669"
              strokeWidth={2.5}
              strokeDasharray="5 3"
              dot={{ r: 3, fill: '#059669', stroke: '#ffffff', strokeWidth: 1.5 }}
              name="SARIMA Prediction"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
