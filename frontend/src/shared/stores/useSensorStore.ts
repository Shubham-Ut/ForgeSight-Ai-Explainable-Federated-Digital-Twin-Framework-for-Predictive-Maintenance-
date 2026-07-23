import { create } from 'zustand';
import type { SensorData } from '@shared/types';

const BUFFER_SIZE = 120; // 120 readings = 2 minutes at 1 Hz

interface SensorEntry {
  timestamp: string;
  data: SensorData;
}

interface SensorStore {
  // State: machineId → circular buffer of readings
  history: Record<string, SensorEntry[]>;
  latestReadings: Record<string, SensorData>;
  isStreaming: Record<string, boolean>;
  streamErrors: Record<string, string | null>;
  // Actions
  appendReading: (machineId: string, data: SensorData, timestamp: string) => void;
  setStreaming: (machineId: string, streaming: boolean) => void;
  setStreamError: (machineId: string, error: string | null) => void;
  clearHistory: (machineId: string) => void;
  clearAll: () => void;
  // Selectors
  getHistory: (machineId: string) => SensorEntry[];
  getLatest: (machineId: string) => SensorData | null;
}

export const useSensorStore = create<SensorStore>()((set, get) => ({
  history: {},
  latestReadings: {},
  isStreaming: {},
  streamErrors: {},

  appendReading: (machineId, data, timestamp) =>
    set((state) => {
      const prev = state.history[machineId] ?? [];
      const next = [...prev, { timestamp, data }];
      // Maintain circular buffer
      if (next.length > BUFFER_SIZE) next.splice(0, next.length - BUFFER_SIZE);
      return {
        history: { ...state.history, [machineId]: next },
        latestReadings: { ...state.latestReadings, [machineId]: data },
      };
    }),

  setStreaming: (machineId, streaming) =>
    set((state) => ({
      isStreaming: { ...state.isStreaming, [machineId]: streaming },
    })),

  setStreamError: (machineId, error) =>
    set((state) => ({
      streamErrors: { ...state.streamErrors, [machineId]: error },
    })),

  clearHistory: (machineId) =>
    set((state) => ({
      history: { ...state.history, [machineId]: [] },
    })),

  clearAll: () => set({ history: {}, latestReadings: {}, isStreaming: {}, streamErrors: {} }),

  getHistory: (machineId) => get().history[machineId] ?? [],
  getLatest: (machineId) => get().latestReadings[machineId] ?? null,
}));
