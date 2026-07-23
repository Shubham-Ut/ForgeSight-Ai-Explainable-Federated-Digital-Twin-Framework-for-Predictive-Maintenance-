/**
 * ForgeSight AI — Axios API Service Layer
 * Centralised HTTP client with interceptors, error handling, and typed methods
 */
import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type {
  ApiResponse, ApiError, MachineDigitalTwin, PredictionResult, ShapExplanation,
  FLTrainingMetrics, FederatedRound, RagMessage, RagDocument,
  MaintenanceReport, DefectDetection, Alert, ModelMetrics,
  LimeExplanation, CounterfactualExplanation, FLConfig,
} from '@shared/types';

// ── Base instance ──────────────────────────────────────────────────────────────
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ── Request interceptor: inject auth token ─────────────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('forgesight_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['X-Request-ID'] = crypto.randomUUID();
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Recursive snake_case to camelCase helper ──────────────────────────────────
const specialKeys: Record<string, string> = {
  predictedRul: 'predictedRUL',
  originalRul: 'originalRUL',
  targetRul: 'targetRUL',
  achievedRul: 'achievedRUL',
  baselineRul: 'baselineRUL',
  globalMae: 'globalMAE',
};

const camelCaseKeys = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(camelCaseKeys);
  } else if (obj !== null && typeof obj === 'object') {
    if (obj instanceof Date || obj instanceof Blob || obj instanceof FormData) {
      return obj;
    }
    return Object.keys(obj).reduce((result: any, key) => {
      let camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      if (specialKeys[camelKey]) {
        camelKey = specialKeys[camelKey];
      }
      result[camelKey] = camelCaseKeys(obj[key]);
      return result;
    }, {});
  }
  return obj;
};

// ── Response interceptor: unwrap + normalise errors ────────────────────────────
apiClient.interceptors.response.use(
  (response) => {
    if (response.data) {
      response.data = camelCaseKeys(response.data);
    }
    return response;
  },
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('forgesight_token');
      window.location.href = '/login';
    }
    const apiError: ApiError = {
      statusCode: error.response?.status ?? 0,
      message: error.response?.data?.message ?? error.message,
      detail: error.response?.data?.detail,
      timestamp: new Date().toISOString(),
    };
    return Promise.reject(apiError);
  },
);

// ── Helper: unwrap data field ──────────────────────────────────────────────────
async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await apiClient.get<ApiResponse<T>>(url, { params });
  return res.data.data;
}
async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await apiClient.post<ApiResponse<T>>(url, body);
  return res.data.data;
}

// ============================================================
// MACHINE API
// ============================================================
export const machineApi = {
  listAll: () => get<MachineDigitalTwin[]>('/machines'),
  getById: (id: string) => get<MachineDigitalTwin>(`/machines/${id}`),
  getStatus: (id: string) => get<{ status: string; lastSeen: string }>(`/machines/${id}/status`),
  listByFactory: (factoryId: string) => get<MachineDigitalTwin[]>('/machines', { factory_id: factoryId }),
};

// ============================================================
// PREDICTION API
// ============================================================
export const predictionApi = {
  getForMachine: (machineId: string) =>
    get<PredictionResult>(`/machines/${machineId}/prediction`),
  getBatch: (machineIds: string[]) =>
    post<PredictionResult[]>('/predictions/batch', { machine_ids: machineIds }),
  getHistory: (machineId: string, limit = 100) =>
    get<PredictionResult[]>(`/machines/${machineId}/prediction/history`, { limit }),
  getModelMetrics: () =>
    get<ModelMetrics[]>('/predictions/model-metrics'),
};

// ============================================================
// EXPLAINABILITY API
// ============================================================
export const xaiApi = {
  getShap: (machineId: string) =>
    get<ShapExplanation>(`/machines/${machineId}/shap`),
  getLime: (machineId: string) =>
    get<LimeExplanation>(`/machines/${machineId}/lime`),
  getCounterfactual: (machineId: string, targetRUL: number) =>
    post<CounterfactualExplanation>(`/machines/${machineId}/counterfactual`, { target_rul: targetRUL }),
  getGlobalImportance: () =>
    get<ShapExplanation['shapValues']>('/explainability/global-importance'),
};

// ============================================================
// DIGITAL TWIN API
// ============================================================
export const twinApi = {
  getState: (machineId: string) =>
    get<MachineDigitalTwin>(`/machines/${machineId}/twin`),
  runWhatIf: (machineId: string, overrides: Record<string, number>) =>
    post<MachineDigitalTwin>(`/machines/${machineId}/twin/whatif`, { overrides }),
  getForecast: (machineId: string, horizonCycles: number) =>
    post<{ trajectory: { cycle: number; health: number; rul: number }[] }>(
      `/machines/${machineId}/twin/forecast`,
      { horizon_cycles: horizonCycles },
    ),
};

// ============================================================
// FEDERATED LEARNING API
// ============================================================
export const federatedApi = {
  getMetrics: () => get<FLTrainingMetrics>('/federated/metrics'),
  getRounds: () => get<FederatedRound[]>('/federated/rounds'),
  triggerRound: () => post<{ roundId: number; status: string }>('/federated/round/trigger'),
  getConfig: () => get<FLConfig>('/federated/config'),
  updateConfig: (config: Partial<FLConfig>) => post<FLConfig>('/federated/config', config),
  getPrivacyBudget: () => get<{ epsilon: number; delta: number; remaining: number }>('/federated/privacy'),
};

// ============================================================
// RAG ASSISTANT API
// ============================================================
export const ragApi = {
  sendQuery: (query: string, machineId?: string) =>
    post<RagMessage>('/rag/query', { query, machine_id: machineId }),
  listDocuments: () => get<RagDocument[]>('/rag/documents'),
  uploadDocument: (formData: FormData) =>
    apiClient.post<ApiResponse<RagDocument>>('/rag/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data),
  generateReport: (machineId: string, reportType: string) =>
    post<MaintenanceReport>('/rag/report', { machine_id: machineId, report_type: reportType }),
};

// ============================================================
// COMPUTER VISION API
// ============================================================
export const visionApi = {
  analyzeImage: (formData: FormData) =>
    apiClient.post<ApiResponse<DefectDetection>>('/vision/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data),
  getHistory: (machineId: string) =>
    get<DefectDetection[]>(`/vision/history/${machineId}`),
};

// ============================================================
// ALERTS API
// ============================================================
export const alertsApi = {
  getAll: () => get<Alert[]>('/alerts'),
  getForMachine: (machineId: string) => get<Alert[]>(`/alerts?machine_id=${machineId}`),
  acknowledge: (alertId: string) => post<Alert>(`/alerts/${alertId}/acknowledge`),
  resolve: (alertId: string) => post<Alert>(`/alerts/${alertId}/resolve`),
};

// ============================================================
// REPORTS API
// ============================================================
export const reportsApi = {
  generate: (machineId: string, reportType: string) =>
    post<MaintenanceReport>('/reports/generate', { machine_id: machineId, type: reportType }),
  list: () => get<MaintenanceReport[]>('/reports'),
  downloadPdf: (reportId: string) =>
    apiClient.get(`/reports/${reportId}/pdf`, { responseType: 'blob' }).then((r) => r.data as Blob),
};

export default apiClient;
