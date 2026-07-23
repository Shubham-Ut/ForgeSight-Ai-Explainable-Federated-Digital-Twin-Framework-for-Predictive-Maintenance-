import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { MachineDigitalTwin, FactoryDetails } from '@shared/types';

interface MachineStore {
  // State
  factories: FactoryDetails[];
  machines: Record<string, MachineDigitalTwin>;
  selectedFactoryId: string | null;
  selectedMachineId: string | null;
  selectedComponentId: string | null;
  isLoading: boolean;
  lastFetch: string | null;
  // Computed
  selectedMachine: MachineDigitalTwin | null;
  machinesForFactory: MachineDigitalTwin[];
  // Actions
  setFactories: (factories: FactoryDetails[]) => void;
  setMachines: (machines: MachineDigitalTwin[]) => void;
  upsertMachine: (machine: MachineDigitalTwin) => void;
  setSelectedFactory: (id: string | null) => void;
  setSelectedMachine: (id: string | null) => void;
  setSelectedComponent: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useMachineStore = create<MachineStore>()(
  subscribeWithSelector((set, get) => ({
    factories: [],
    machines: {},
    selectedFactoryId: null,
    selectedMachineId: null,
    selectedComponentId: null,
    isLoading: false,
    lastFetch: null,

    get selectedMachine() {
      const { machines, selectedMachineId } = get();
      return selectedMachineId ? (machines[selectedMachineId] ?? null) : null;
    },
    get machinesForFactory() {
      const { machines, selectedFactoryId } = get();
      return Object.values(machines).filter(
        (m) => !selectedFactoryId || m.metadata.factoryId === selectedFactoryId,
      );
    },

    setFactories: (factories) => set({ factories }),
    setMachines: (machines) =>
      set({
        machines: machines.reduce<Record<string, MachineDigitalTwin>>((acc, m) => {
          acc[m.metadata.id] = m;
          return acc;
        }, {}),
        lastFetch: new Date().toISOString(),
      }),
    upsertMachine: (machine) =>
      set((state) => ({
        machines: { ...state.machines, [machine.metadata.id]: machine },
      })),
    setSelectedFactory: (id) => set({ selectedFactoryId: id }),
    setSelectedMachine: (id) => set({ selectedMachineId: id, selectedComponentId: null }),
    setSelectedComponent: (id) => set({ selectedComponentId: id }),
    setLoading: (loading) => set({ isLoading: loading }),
  })),
);
