import React from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Database, Calendar } from 'lucide-react';

interface HeaderProps {
  lastDate?: string | null;
  startDate?: string | null;
  totalRecords?: number;
  isLoading: boolean;
  onRefresh: () => void;
  isBackendConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  lastDate = '2025-09-01',
  startDate = '2005-01-01',
  totalRecords = 249,
  isLoading,
  onRefresh,
  isBackendConnected,
}) => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20 px-6 py-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Title & Metadata */}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Monthly Price Forecasting System
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              SARIMA(0, 1, 2) × (0, 0, 1)₁₂
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Statistical time-series price forecasting dashboard &bull; Next.js + Django REST Framework
          </p>
        </div>

        {/* Right side status badges & action */}
        <div className="flex items-center flex-wrap gap-2.5 sm:gap-3">
          {/* Historical Data Range Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-700 font-medium">
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
            <span>
              {startDate ? startDate.substring(0, 7) : '2005-01'} &rarr;{' '}
              <strong className="text-gray-900">{lastDate ? lastDate.substring(0, 7) : '2025-09'}</strong>
            </span>
            <span className="text-gray-400">&bull;</span>
            <span className="text-gray-600">{totalRecords} obs</span>
          </div>

          {/* Backend Connection Indicator */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
              isBackendConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {isBackendConnected ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Django API: Online</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Connecting API...</span>
              </>
            )}
          </div>

          {/* Refresh Action Button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh forecasting data from Django backend"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>{isLoading ? 'Updating...' : 'Refresh'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
