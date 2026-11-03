import React from 'react';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';

export const LoadingState: React.FC<{ message?: string }> = ({
  message = 'Loading forecasting data from Django backend...',
}) => (
  <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-gray-100 min-h-[300px]">
    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
    <p className="text-gray-600 font-medium text-sm">{message}</p>
    <p className="text-gray-400 text-xs mt-1">Connecting to Django REST API (http://127.0.0.1:8000)</p>
  </div>
);

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({ title = 'Failed to Load Data', message, onRetry }) => (
  <div className="flex flex-col items-center justify-center p-8 bg-red-50/70 border border-red-200 rounded-xl text-center">
    <div className="p-3 bg-red-100 rounded-full mb-3 text-red-600">
      <AlertTriangle className="w-8 h-8" />
    </div>
    <h3 className="text-base font-semibold text-red-900 mb-1">{title}</h3>
    <p className="text-sm text-red-700 max-w-md mb-4">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
      >
        <RefreshCw className="w-4 h-4" />
        Retry Request
      </button>
    )}
  </div>
);
