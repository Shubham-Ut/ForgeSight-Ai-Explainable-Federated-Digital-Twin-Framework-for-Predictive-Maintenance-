/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SensorData {
  timestamp: string;
  temperature: number; // °C (Air Temperature alias)
  pressure: number;    // °C (Process Temperature alias)
  vibration: number;   // mm/s (for CNC vibration)
  speed: number;       // RPM (Rotational speed)
  torque: number;      // Nm (Torque)
  wear: number;        // Tool wear (min)
  fuelRatio?: number;  // ratio (for turbines)
  
  // AI4I 2020 Dataset specific variables
  airTemp?: number;         // Air Temperature (K)
  processTemp?: number;     // Process Temperature (K)
  rotationalSpeed?: number; // Rotational Speed (RPM)
  toolWear?: number;        // Tool Wear (min)
  machineType?: 'L' | 'M' | 'H'; // Machine Type (Low, Medium, High)
  failureType?: 'No Failure' | 'Tool Wear Failure' | 'Heat Dissipation Failure' | 'Power Failure' | 'Overstrain Failure' | 'Random Failures';
  target?: number;          // 0 or 1 target
  powerConsumption?: number;// kW
  motorCurrent?: number;    // Amperes (A)
  
  // NASA C-MAPSS specific variables (kept for backward compatibility)
  t24?: number;        // Total temperature at LPC outlet (°R)
  t30?: number;        // Total temperature at HPC outlet (°R)
  t50?: number;        // Total temperature at LPT outlet (°R)
  p30?: number;        // Total pressure at HPC outlet (psia)
  nf?: number;         // Physical fan speed (rpm)
  nc?: number;         // Physical core speed (rpm)
  ps30?: number;       // Static pressure at HPC outlet (psia)
  phi?: number;        // Ratio of fuel flow to Ps30 (pps/psi)
  bpr?: number;        // Bypass ratio
  htBleed?: number;    // Bleed Enthalpy
  w31?: number;        // HPT coolant bleed (lbm/s)
  w32?: number;        // LPT coolant bleed (lbm/s)
}

export interface ComponentHealth {
  id: string;
  name: string;
  healthScore: number; // 0 - 100
  status: 'healthy' | 'warning' | 'critical' | 'failed';
  shapContribution: number; // Contribution value for failure prediction
  description: string;
}

export interface MachineMetadata {
  id: string;
  name: string;
  type: 'Turbofan Engine (C-MAPSS)' | 'CNC Milling' | 'Gas Turbine' | 'Hydraulic Pump' | 'Air Compressor';
  factoryId: string;
  commissionedDate: string;
}

export interface MachineDigitalTwin {
  metadata: MachineMetadata;
  sensors: SensorData;
  healthScore: number; // 0 - 100
  predictedRUL: number; // Hours remaining
  failureProbability: number; // % chance of failure
  components: ComponentHealth[];
  recommendedAction: string;
  estimatedDowntime: number; // Hours
  estimatedRepairCost: number; // USD
  anomalyScore?: number;
  isAnomaly?: boolean;
  confidenceScore?: number;
}

export interface FactoryDetails {
  id: string;
  name: string;
  location: string;
  machineCount: number;
  avgHealthScore: number;
  networkStatus: 'online' | 'offline';
  localLoss: number;
  localAccuracy: number;
  lastCommRound: number;
}

export interface FederatedRound {
  roundId: number;
  timestamp: string;
  globalAccuracy: number;
  globalLoss: number;
  bandwidthUsed: string; // e.g. "4.2 MB"
  clientLosses: Record<string, number>;
  clientAccuracies: Record<string, number>;
  privacyBudgetEpsilon: number;
}

export interface ShapExplainer {
  featureName: string;
  shapValue: number; // positive = pushes toward failure, negative = pushes toward healthy
  baseValue: number;
  currentValue: number;
}

export interface RagDocument {
  id: string;
  title: string;
  category: 'manual' | 'bulletin' | 'incident_report';
  content: string;
}

export interface MaintenanceReport {
  id: string;
  machineId: string;
  machineName: string;
  factoryName: string;
  timestamp: string;
  predictedFailureMode: string;
  confidence: number;
  primaryRiskDrivers: string[];
  recommendedActions: string[];
  urgency: 'high' | 'medium' | 'low';
  generatedBy: 'Gemini RUL-Agent v3.5';
}
