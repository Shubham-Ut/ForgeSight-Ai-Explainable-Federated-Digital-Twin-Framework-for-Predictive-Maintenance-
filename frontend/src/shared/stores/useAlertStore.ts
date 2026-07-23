import { create } from 'zustand';
import type { Alert, AlertSeverity } from '@shared/types';

interface AlertStore {
  alerts: Alert[];
  unacknowledgedCount: number;
  criticalCount: number;
  // Actions
  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;
  acknowledgeAlert: (alertId: string, acknowledgedBy?: string) => void;
  resolveAlert: (alertId: string) => void;
  clearAlerts: () => void;
  getByMachine: (machineId: string) => Alert[];
  getBySeverity: (severity: AlertSeverity) => Alert[];
}

export const useAlertStore = create<AlertStore>()((set, get) => ({
  alerts: [],
  unacknowledgedCount: 0,
  criticalCount: 0,

  setAlerts: (alerts) =>
    set({
      alerts,
      unacknowledgedCount: alerts.filter((a) => !a.acknowledged).length,
      criticalCount: alerts.filter((a) => !a.acknowledged && (a.severity === 'critical' || a.severity === 'emergency')).length,
    }),

  addAlert: (alert) =>
    set((state) => {
      const alerts = [alert, ...state.alerts].slice(0, 500); // Keep last 500
      return {
        alerts,
        unacknowledgedCount: alerts.filter((a) => !a.acknowledged).length,
        criticalCount: alerts.filter((a) => !a.acknowledged && (a.severity === 'critical' || a.severity === 'emergency')).length,
      };
    }),

  acknowledgeAlert: (alertId, acknowledgedBy) =>
    set((state) => {
      const alerts = state.alerts.map((a) =>
        a.id === alertId
          ? { ...a, acknowledged: true, acknowledgedBy, acknowledgedAt: new Date().toISOString() }
          : a,
      );
      return {
        alerts,
        unacknowledgedCount: alerts.filter((a) => !a.acknowledged).length,
        criticalCount: alerts.filter((a) => !a.acknowledged && (a.severity === 'critical' || a.severity === 'emergency')).length,
      };
    }),

  resolveAlert: (alertId) =>
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== alertId),
    })),

  clearAlerts: () => set({ alerts: [], unacknowledgedCount: 0, criticalCount: 0 }),

  getByMachine: (machineId) => get().alerts.filter((a) => a.machineId === machineId),
  getBySeverity: (severity) => get().alerts.filter((a) => a.severity === severity),
}));
