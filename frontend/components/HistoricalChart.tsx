'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { HistoricalRecord } from '../lib/types';
import { TrendingUp, BarChart2 } from 'lucide-react';

interface HistoricalChartProps {
  records: HistoricalRecord[];
}

export const HistoricalChart: React.FC<HistoricalChartProps> = ({ records }) => {
  const [rangeFilter, setRangeFilter] = useState<'ALL' | '10Y' | '5Y' | '2Y'>('ALL');

  const formattedData = useMemo(() => {
    return records.map((r) => ({
      date: r.date,
      price: parseFloat(r.price),
    }));
  }, [records]);

  const filteredData = useMemo(() => {
    if (rangeFilter === 'ALL' || formattedData.length === 0) {
      return formattedData;
    }
    const months = rangeFilter === '2Y' ? 24 : rangeFilter === '5Y' ? 60 : 120;
    return formattedData.slice(-months);
  }, [formattedData, rangeFilter]);

  const stats = useMemo(() => {
    if (filteredData.length === 0) return { min: 0, max: 0, avg: 0, latest: 0 };
    const prices = filteredData.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const latest = prices[prices.length - 1];
    return { min, max, avg, latest };
  }, [filteredData]);

  const formatCurrency = (val: number) => `$${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-gray-900">Historical Monthly Price Trajectory</h3>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700">
              {filteredData.length} observations
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Standardized 1st-of-month observations from real dataset (price_data.csv)
          </p>
        </div>

        {/* Timeframe Selector */}
        <div className="inline-flex rounded-lg bg-gray-100 p-1 self-start sm:self-auto">
          {(['ALL', '10Y', '5Y', '2Y'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setRangeFilter(filter)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                rangeFilter === filter
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {filter === 'ALL' ? 'All (2005-2025)' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Snapshot Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 p-3 bg-gray-50 rounded-lg text-xs">
        <div>
          <span className="text-gray-500 block">Window Min:</span>
          <span className="font-semibold text-gray-800">{formatCurrency(stats.min)}</span>
        </div>
        <div>
          <span className="text-gray-500 block">Window Max:</span>
          <span className="font-semibold text-gray-800">{formatCurrency(stats.max)}</span>
        </div>
        <div>
          <span className="text-gray-500 block">Window Average:</span>
          <span className="font-semibold text-gray-800">{formatCurrency(stats.avg)}</span>
        </div>
        <div>
          <span className="text-gray-500 block">Latest in Window:</span>
          <span className="font-semibold text-indigo-600">{formatCurrency(stats.latest)}</span>
        </div>
      </div>

      {/* Recharts Area Container */}
      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="historicalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
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
              minTickGap={30}
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
                  const data = payload[0].payload as { date: string; price: number };
                  return (
                    <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg text-xs border border-slate-700">
                      <div className="text-slate-400 font-medium mb-1">
                        {data.date}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-300">Historical Price:</span>
                        <span className="font-bold text-indigo-400 text-sm">
                          ${data.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#4f46e5"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#historicalGradient)"
              name="Historical Price"
              activeDot={{ r: 5, stroke: '#312e81', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
