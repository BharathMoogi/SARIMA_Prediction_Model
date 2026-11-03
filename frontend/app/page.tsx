'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../lib/api';
import {
  DashboardSummaryResponse,
  HistoricalRecord,
  ForecastResponse,
  ModelInfoResponse,
  VisualizationResponse,
} from '../lib/types';

import { Sidebar, NavTab } from '../components/Sidebar';
import { Header } from '../components/Header';
import { KPICards } from '../components/KPICards';
import { HistoricalChart } from '../components/HistoricalChart';
import { ForecastComparisonChart } from '../components/ForecastComparisonChart';
import { ForecastTable } from '../components/ForecastTable';
import { ModelPerformance } from '../components/ModelPerformance';
import { HistoricalDataTable } from '../components/HistoricalDataTable';
import { LoadingState, ErrorState } from '../components/LoadingState';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');

  // API Data State
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [historical, setHistorical] = useState<HistoricalRecord[]>([]);
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfoResponse | null>(null);
  const [visualization, setVisualization] = useState<VisualizationResponse | null>(null);

  // Loading & Connection State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  const loadAllData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const [sumRes, histRes, fcRes, modelRes, visRes] = await Promise.all([
        apiService.getDashboardSummary(),
        apiService.getHistoricalRecords(),
        apiService.getForecast(),
        apiService.getModelInfo(),
        apiService.getVisualizationData(),
      ]);

      setSummary(sumRes);
      setHistorical(histRes);
      setForecastData(fcRes);
      setModelInfo(modelRes);
      setVisualization(visRes);
      setIsBackendConnected(true);
    } catch (err: unknown) {
      console.error('Error fetching data from Django backend:', err);
      setIsBackendConnected(false);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to communicate with Django REST Framework API at http://127.0.0.1:8000.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const lastDate = summary?.historical_summary?.end_date ?? '2025-09-01';
  const startDate = summary?.historical_summary?.start_date ?? '2005-01-01';
  const totalRecords = summary?.historical_summary?.total_records ?? historical.length ?? 249;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans text-gray-900">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        datasetCount={totalRecords}
        lastDate={lastDate}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Sticky Header */}
        <Header
          lastDate={lastDate}
          startDate={startDate}
          totalRecords={totalRecords}
          isLoading={isLoading || isRefreshing}
          onRefresh={() => loadAllData(true)}
          isBackendConnected={isBackendConnected}
        />

        {/* Dashboard Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {isLoading ? (
            <LoadingState message="Fetching live time-series data from Django backend..." />
          ) : errorMessage ? (
            <ErrorState
              title="Backend Connection Error"
              message={errorMessage}
              onRetry={() => loadAllData(false)}
            />
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* KPI Highlights */}
                  <KPICards summary={summary} />

                  {/* Main Charts Grid */}
                  <div className="grid grid-cols-1 gap-6">
                    {/* Forecast vs Historical Chart */}
                    {visualization && (
                      <ForecastComparisonChart timeline={visualization.timeline} />
                    )}

                    {/* Historical Long-Term Trajectory Chart */}
                    {historical.length > 0 && (
                      <HistoricalChart records={historical} />
                    )}
                  </div>

                  {/* Two Column Section: Forecast Table & Model Summary */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      {forecastData && (
                        <ForecastTable
                          forecasts={forecastData.forecasts}
                          confidenceLevel={forecastData.confidence_level}
                        />
                      )}
                    </div>
                    <div>
                      <ModelPerformance modelInfo={modelInfo} summary={summary} />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: HISTORICAL DATA */}
              {activeTab === 'historical' && (
                <div className="space-y-6">
                  {/* Historical Chart */}
                  {historical.length > 0 && (
                    <HistoricalChart records={historical} />
                  )}

                  {/* Historical Records Table with CSV Upload */}
                  <HistoricalDataTable
                    records={historical}
                    onDataUploaded={() => loadAllData(true)}
                  />
                </div>
              )}

              {/* TAB 3: FORECAST */}
              {activeTab === 'forecast' && (
                <div className="space-y-6">
                  {/* Forecast vs Historical Chart */}
                  {visualization && (
                    <ForecastComparisonChart timeline={visualization.timeline} />
                  )}

                  {/* Full 12-Month Forecast Table */}
                  {forecastData && (
                    <ForecastTable
                      forecasts={forecastData.forecasts}
                      confidenceLevel={forecastData.confidence_level}
                    />
                  )}
                </div>
              )}

              {/* TAB 4: MODEL PERFORMANCE */}
              {activeTab === 'model' && (
                <div className="space-y-6">
                  <ModelPerformance modelInfo={modelInfo} summary={summary} />
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
