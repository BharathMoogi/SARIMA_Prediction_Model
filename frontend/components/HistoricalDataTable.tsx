'use client';

import React, { useState, useMemo, useRef } from 'react';
import { HistoricalRecord, UploadResponse } from '../lib/types';
import { apiService } from '../lib/api';
import {
  Upload,
  Search,
  Download,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  FileText,
  Loader2,
} from 'lucide-react';

interface HistoricalDataTableProps {
  records: HistoricalRecord[];
  onDataUploaded: () => void;
}

export const HistoricalDataTable: React.FC<HistoricalDataTableProps> = ({
  records,
  onDataUploaded,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Filter and sort records
  const filteredRecords = useMemo(() => {
    let result = [...records];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (r) => r.date.toLowerCase().includes(term) || r.price.includes(term)
      );
    }
    result.sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      return sortOrder === 'ASC' ? cmp : -cmp;
    });
    return result;
  }, [records, searchTerm, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setUploadFeedback({
        type: 'error',
        message: 'Please select a valid .csv file.',
      });
      return;
    }

    setIsUploading(true);
    setUploadFeedback(null);

    try {
      const result: UploadResponse = await apiService.uploadPriceCSV(file);
      setUploadFeedback({
        type: 'success',
        message: `${result.message} (Created: ${result.created}, Updated: ${result.updated}, Total in DB: ${result.total_now})`,
      });
      onDataUploaded();
    } catch (err: unknown) {
      setUploadFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'CSV upload failed.',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const exportHistoricalCSV = () => {
    if (!records || records.length === 0) return;
    const headers = ['ID', 'Date', 'Price', 'Created_At'];
    const rows = records.map((r) => [r.id, r.date, r.price, r.created_at]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'historical_monthly_prices.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* CSV Upload Section Card */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>Ingest Historical Price CSV</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Bulk upload or update records directly to the Django REST API (`POST /api/historical/upload/`)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              className="hidden"
              id="csv-file-input"
            />
            <label
              htmlFor="csv-file-input"
              className={`inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer ${
                isUploading ? 'opacity-70 pointer-events-none' : ''
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing CSV...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose CSV File</span>
                </>
              )}
            </label>

            <button
              onClick={exportHistoricalCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Upload feedback banner */}
        {uploadFeedback && (
          <div
            className={`mt-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
              uploadFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {uploadFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="flex-1 font-medium">{uploadFeedback.message}</span>
            <button
              onClick={() => setUploadFeedback(null)}
              className="text-xs text-gray-500 hover:text-gray-800 font-bold ml-2 cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        <div className="mt-3 text-[11px] text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
          <span>&bull; Supported column names: <strong>date</strong> (YYYY-MM or YYYY-MM-DD)</span>
          <span>&bull; Supported price columns: <strong>avg_monthly_price</strong>, <strong>price</strong>, <strong>value</strong>, <strong>amount</strong></span>
          <span>&bull; Deduplication: Standardized to 1st of month (YYYY-MM-01)</span>
        </div>
      </div>

      {/* Historical Data Table Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by date (e.g. 2025)..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Controls: Sort and Page Size */}
          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={() => setSortOrder(sortOrder === 'DESC' ? 'ASC' : 'DESC')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg font-medium cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sort: {sortOrder === 'DESC' ? 'Newest First' : 'Oldest First'}</span>
            </button>

            <div className="flex items-center gap-1.5 text-gray-500">
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Element */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 uppercase font-semibold text-[11px] tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3 px-4"># ID</th>
                <th className="py-3 px-4">Standardized Date</th>
                <th className="py-3 px-4">Monthly Recorded Price</th>
                <th className="py-3 px-4">Import Timestamp</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    No matching records found for "{searchTerm}".
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-gray-400">#{row.id}</td>
                    <td className="py-2.5 px-4 font-semibold text-gray-900 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{row.date}</span>
                    </td>
                    <td className="py-2.5 px-4 font-bold text-gray-900">
                      ${parseFloat(row.price).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-2.5 px-4 text-gray-400 font-mono text-[11px]">
                      {row.created_at || 'Database Record'}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700">
                        Historical Observation
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls Footer */}
        <div className="p-3.5 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <div>
            Showing{' '}
            <strong className="text-gray-900">
              {filteredRecords.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </strong>{' '}
            to{' '}
            <strong className="text-gray-900">
              {Math.min(currentPage * pageSize, filteredRecords.length)}
            </strong>{' '}
            of <strong className="text-gray-900">{filteredRecords.length}</strong> records
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
