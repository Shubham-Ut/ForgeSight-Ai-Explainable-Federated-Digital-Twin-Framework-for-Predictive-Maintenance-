import { create } from 'zustand';
import type { PredictionResult, ModelMetrics } from '@shared/types';

interface PredictionStore {
  predictions: Record<string, PredictionResult>;
  modelMetrics: ModelMetrics[];
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  lastUpdated: Record<string, string>;
  setPrediction: (machineId: string, result: PredictionResult) => void;
  setLoading: (machineId: string, loading: boolean) => void;
  setError: (machineId: string, error: string | null) => void;
  setModelMetrics: (metrics: ModelMetrics[]) => void;
  clearPredictions: () => void;
}

export const usePredictionStore = create<PredictionStore>()((set) => ({
  predictions: {},
  modelMetrics: [],
  loading: {},
  errors: {},
  lastUpdated: {},

  setPrediction: (machineId, result) =>
    set((state) => ({
      predictions: { ...state.predictions, [machineId]: result },
      lastUpdated: { ...state.lastUpdated, [machineId]: new Date().toISOString() },
      errors: { ...state.errors, [machineId]: null },
    })),

  setLoading: (machineId, loading) =>
    set((state) => ({ loading: { ...state.loading, [machineId]: loading } })),

  setError: (machineId, error) =>
    set((state) => ({ errors: { ...state.errors, [machineId]: error } })),

  setModelMetrics: (metrics) => set({ modelMetrics: metrics }),

  clearPredictions: () => set({ predictions: {}, lastUpdated: {}, errors: {} }),
}));
