import {
  DashboardSummaryResponse,
  HistoricalRecord,
  ForecastResponse,
  ModelInfoResponse,
  VisualizationResponse,
  UploadResponse,
} from './types';

function getBaseUrl(): string {
  // In server runtime (SSR / Server Functions), use Vercel service binding BACKEND_URL
  if (typeof window === 'undefined') {
    return (
      process.env.BACKEND_URL?.replace(/\/$/, '') ||
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
      'http://127.0.0.1:8000'
    );
  }
  // In browser runtime, if NEXT_PUBLIC_API_URL is set (e.g. during local dev), use it.
  // On Vercel, leaving it empty creates relative requests (/api/...) that Vercel rewrites to backend.
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '';
}

async function fetchJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options?.headers || {}),
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      let errorMessage = `API request failed with status ${res.status} (${res.statusText})`;
      try {
        const errorData = await res.json();
        if (errorData.error) errorMessage = errorData.error;
        else if (errorData.message) errorMessage = errorData.message;
      } catch {
        // Not JSON error body
      }
      throw new Error(errorMessage);
    }

    return (await res.json()) as T;
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Network error: Unable to connect to Django REST API at ' + baseUrl);
  }
}

export const apiService = {
  getDashboardSummary: (): Promise<DashboardSummaryResponse> => {
    return fetchJSON<DashboardSummaryResponse>('/api/dashboard/');
  },

  getHistoricalRecords: (): Promise<HistoricalRecord[]> => {
    return fetchJSON<HistoricalRecord[]>('/api/historical/');
  },

  getForecast: (): Promise<ForecastResponse> => {
    return fetchJSON<ForecastResponse>('/api/forecast/');
  },

  getModelInfo: (): Promise<ModelInfoResponse> => {
    return fetchJSON<ModelInfoResponse>('/api/model-info/');
  },

  getVisualizationData: (): Promise<VisualizationResponse> => {
    return fetchJSON<VisualizationResponse>('/api/visualization/');
  },

  uploadPriceCSV: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/historical/upload/`;
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      let errorMsg = `Upload failed with status ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson.error) errorMsg = errJson.error;
      } catch {
        // Ignored
      }
      throw new Error(errorMsg);
    }

    return (await res.json()) as UploadResponse;
  },

  triggerTraining: async (): Promise<{ status: string; message: string }> => {
    return fetchJSON<{ status: string; message: string }>('/api/train/', {
      method: 'POST',
    });
  },
};
