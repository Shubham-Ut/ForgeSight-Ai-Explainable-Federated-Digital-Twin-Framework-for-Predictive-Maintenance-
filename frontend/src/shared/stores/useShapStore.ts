import { create } from 'zustand';
import type { ShapExplanation, LimeExplanation, CounterfactualExplanation } from '@shared/types';

interface ShapStore {
  shapExplanations: Record<string, ShapExplanation>;
  limeExplanations: Record<string, LimeExplanation>;
  counterfactuals: Record<string, CounterfactualExplanation>;
  selectedFeature: string | null;
  selectedPlot: 'waterfall' | 'force' | 'dependence' | 'beeswarm';
  loading: Record<string, boolean>;
  // Actions
  setShapExplanation: (machineId: string, explanation: ShapExplanation) => void;
  setLimeExplanation: (machineId: string, explanation: LimeExplanation) => void;
  setCounterfactual: (machineId: string, cf: CounterfactualExplanation) => void;
  setSelectedFeature: (feature: string | null) => void;
  setSelectedPlot: (plot: ShapStore['selectedPlot']) => void;
  setLoading: (machineId: string, loading: boolean) => void;
}

export const useShapStore = create<ShapStore>()((set) => ({
  shapExplanations: {},
  limeExplanations: {},
  counterfactuals: {},
  selectedFeature: null,
  selectedPlot: 'waterfall',
  loading: {},

  setShapExplanation: (machineId, explanation) =>
    set((state) => ({ shapExplanations: { ...state.shapExplanations, [machineId]: explanation } })),
  setLimeExplanation: (machineId, explanation) =>
    set((state) => ({ limeExplanations: { ...state.limeExplanations, [machineId]: explanation } })),
  setCounterfactual: (machineId, cf) =>
    set((state) => ({ counterfactuals: { ...state.counterfactuals, [machineId]: cf } })),
  setSelectedFeature: (feature) => set({ selectedFeature: feature }),
  setSelectedPlot: (plot) => set({ selectedPlot: plot }),
  setLoading: (machineId, loading) =>
    set((state) => ({ loading: { ...state.loading, [machineId]: loading } })),
}));
