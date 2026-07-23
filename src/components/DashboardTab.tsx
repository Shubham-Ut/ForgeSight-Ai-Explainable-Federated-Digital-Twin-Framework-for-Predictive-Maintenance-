import React from 'react';
import Dashboard from './Dashboard';
import { MachineDigitalTwin, FactoryDetails } from '../types';

interface DashboardTabProps {
  factories: Record<string, FactoryDetails>;
  machines: Record<string, Record<string, MachineDigitalTwin>>;
  onSelectFactory: (id: string) => void;
  onSelectMachine: (factoryId: string, machineId: string) => void;
  onNavigate: (tab: string) => void;
  activeAlarmsCount: number;
}

export default function DashboardTab({ 
  factories, 
  machines, 
  onSelectFactory, 
  onSelectMachine,
  onNavigate,
  activeAlarmsCount
}: DashboardTabProps) {
  return (
    <Dashboard
      factories={factories}
      machines={machines}
      onSelectFactory={onSelectFactory}
      onSelectMachine={onSelectMachine}
      onNavigate={onNavigate}
      activeAlarmsCount={activeAlarmsCount}
    />
  );
}
