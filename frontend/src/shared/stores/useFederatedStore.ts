import { create } from 'zustand';
import type { FederatedClient, FederatedRound, FLTrainingMetrics, FLConfig } from '@shared/types';

interface FederatedStore {
  clients: FederatedClient[];
  rounds: FederatedRound[];
  metrics: FLTrainingMetrics | null;
  config: FLConfig | null;
  isSyncing: boolean;
  currentRound: number;
  isTraining: boolean;
  globalAccuracy: number;
  globalLoss: number;
  privacyBudgetUsed: number;
  // Actions
  setClients: (clients: FederatedClient[]) => void;
  updateClient: (clientId: string, update: Partial<FederatedClient>) => void;
  addRound: (round: FederatedRound) => void;
  setRounds: (rounds: FederatedRound[]) => void;
  setMetrics: (metrics: FLTrainingMetrics) => void;
  setConfig: (config: FLConfig) => void;
  setGlobalMetrics: (accuracy: number, loss: number) => void;
  setSyncing: (syncing: boolean) => void;
  setTraining: (training: boolean) => void;
  setPrivacyBudget: (epsilon: number) => void;
  incrementRound: () => void;
}

export const useFederatedStore = create<FederatedStore>()((set) => ({
  clients: [],
  rounds: [],
  metrics: null,
  config: null,
  isSyncing: false,
  currentRound: 0,
  isTraining: false,
  globalAccuracy: 0,
  globalLoss: 0,
  privacyBudgetUsed: 0,

  setClients: (clients) => set({ clients }),
  updateClient: (clientId, update) =>
    set((state) => ({
      clients: state.clients.map((c) => (c.id === clientId ? { ...c, ...update } : c)),
    })),
  addRound: (round) =>
    set((state) => ({
      rounds: [...state.rounds, round],
      currentRound: round.roundId,
      globalAccuracy: round.globalAccuracy,
      globalLoss: round.globalLoss,
    })),
  setRounds: (rounds) => set({ rounds }),
  setMetrics: (metrics) => set({ metrics }),
  setConfig: (config) => set({ config }),
  setGlobalMetrics: (accuracy, loss) => set({ globalAccuracy: accuracy, globalLoss: loss }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setTraining: (training) => set({ isTraining: training }),
  setPrivacyBudget: (epsilon) => set({ privacyBudgetUsed: epsilon }),
  incrementRound: () => set((state) => ({ currentRound: state.currentRound + 1 })),
}));
