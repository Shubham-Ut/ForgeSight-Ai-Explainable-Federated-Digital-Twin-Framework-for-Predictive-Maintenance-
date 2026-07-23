import { RagDocument, FederatedRound, ShapExplainer } from '../types';

export interface ModelMetrics {
  name: string;
  mae: number;
  rmse: number;
  r2: number;
  trainingTime: string; // e.g. "1.2s"
  inferenceTime: string; // e.g. "4.5ms"
  memoryUsage: string; // e.g. "14MB"
}

export const MODEL_COMPARISON_DATA: ModelMetrics[] = [
  { name: 'Random Forest (Baseline)', mae: 14.8, rmse: 19.4, r2: 0.81, trainingTime: '4.8s', inferenceTime: '12.4ms', memoryUsage: '45MB' },
  { name: 'XGBoost', mae: 11.2, rmse: 15.1, r2: 0.89, trainingTime: '2.1s', inferenceTime: '2.1ms', memoryUsage: '12MB' },
  { name: 'LightGBM', mae: 10.5, rmse: 14.2, r2: 0.91, trainingTime: '0.9s', inferenceTime: '1.2ms', memoryUsage: '8MB' },
  { name: 'CatBoost (Advanced)', mae: 9.8, rmse: 12.9, r2: 0.93, trainingTime: '3.4s', inferenceTime: '3.5ms', memoryUsage: '18MB' },
];

export interface AnomalyModelMetrics {
  name: string;
  precision: number;
  recall: number;
  f1: number;
  rocAuc: number;
  falsePositiveRate: number;
}

export const ANOMALY_DETECTION_METRICS: AnomalyModelMetrics[] = [
  { name: 'Isolation Forest', precision: 0.88, recall: 0.84, f1: 0.86, rocAuc: 0.91, falsePositiveRate: 0.03 },
  { name: 'Autoencoder (Deep Learning)', precision: 0.94, recall: 0.91, f1: 0.92, rocAuc: 0.96, falsePositiveRate: 0.015 },
  { name: 'One-Class SVM', precision: 0.82, recall: 0.79, f1: 0.80, rocAuc: 0.85, falsePositiveRate: 0.05 },
];

export const FAULT_CLASSIFICATION_LABELS = [
  { id: 'bearing', label: 'Spindle Bearing Fatigue', description: 'High-frequency vibration peaks detected in the main CNC rotor bearing rings.' },
  { id: 'hydraulic', label: 'Hydraulic Piston Leakage', description: 'Pressure loss and fluid slip in the forging press hydraulic pump feedback loop.' },
  { id: 'thermal_slip', label: 'Thermal Core Friction Overload', description: 'Abnormal frictional heat buildup in high-speed rotary spindle couplings.' },
  { id: 'coolant_block', label: 'Coolant Flow Blockage', description: 'Frictional thermal stress due to clogged fluid recirculating nozzle orifices.' },
  { id: 'seal_erosion', label: 'Rotary Gasket Seal Erosion', description: 'Lubrication viscosty drop and debris penetration in the spindle housing.' },
  { id: 'sensor_drift', label: 'Thermocouple Calibration Drift', description: 'Thermal sensor output divergence over consecutive continuous operation shifts.' },
  { id: 'lubrication', label: 'Gearbox Fluid Contamination', description: 'Viscosity breakdown and metallic particulate wear in drive train gears.' },
  { id: 'shaft_imbalance', label: 'Rotor Dynamic Eccentricity', description: 'Centrifugal spindle displacement during high-speed cutting routines.' },
];

export const RAG_KNOWLEDGE_BASE: RagDocument[] = [
  {
    id: 'doc-01',
    title: 'ISO 13373-3: CNC High-Precision Spindle Severity Bulletin 2024-11',
    category: 'bulletin',
    content: 'International machinery bulletin specifies critical vibration boundaries for CNC machine spindle drives. When Spindle Vibration Index exceeds 6.2 mm/s, radial runout shifts from fundamental drive modes to sub-harmonic chattering. Action: Halt automated line, execute visual borescope inspection of chuck teeth tolerances, and recalibrate precision coolant nozzles.'
  },
  {
    id: 'doc-02',
    title: 'Instruction Manual HP-1200: Hydraulic Pump Seals and Cavitation Slip',
    category: 'manual',
    content: 'High-pressure hydraulic forging presses are susceptible to pump seal erosion under high cycle stress. Cavitation is marked by a sudden hydraulic pressure drop (below 110 bar) and fluid feedback temperature rise. If Spindle thermal load crosses 88°C under nominal pressure, check HP feed valves and flush carbon debris from scavenger pump filters.'
  },
  {
    id: 'doc-03',
    title: 'Standard Operating Procedure SOP-IND-984: Automated Tool Wear Overhauls',
    category: 'incident_report',
    content: 'Standard operating procedure for CNC Milling Tool Head replacement. Upon predicting Remaining Useful Life (RUL) below 25 operational hours: Schedule emergency maintenance visit. If coolant flow rate drops below 39 L/min, perform ultrasonic cleaning on nozzle nozzles. Replace spindle drive couplings if wear index exceeds 80% limit.'
  },
  {
    id: 'doc-04',
    title: 'Machinery Fluid Report: Lubrication Viscosity & Heat Degradation',
    category: 'manual',
    content: 'Spindle gear bearing lubrication loops are protected by multi-stage filter grids. Viscosity of lubricating fluid degrades when temperature surges past 90°C. Complete oil flush and hydraulic fluid changeout are mandatory if visual debris sensors detect metal particulate concentration > 12 ppm, or if temperature climbs +15% over a single shift.'
  }
];

export const FEDERATED_COMM_ROUNDS: FederatedRound[] = [
  { roundId: 1, timestamp: '10:00:00', globalAccuracy: 0.72, globalLoss: 0.68, bandwidthUsed: '1.2 MB', clientLosses: { 'Factory A (CNC-800)': 0.70, 'Factory B (HP-1200)': 0.74, 'Factory C (RW-300)': 0.71, 'Factory D (HT-400)': 0.73 }, clientAccuracies: { 'Factory A (CNC-800)': 0.73, 'Factory B (HP-1200)': 0.71, 'Factory C (RW-300)': 0.72, 'Factory D (HT-400)': 0.72 }, privacyBudgetEpsilon: 0.50 },
  { roundId: 2, timestamp: '10:05:00', globalAccuracy: 0.75, globalLoss: 0.59, bandwidthUsed: '2.4 MB', clientLosses: { 'Factory A (CNC-800)': 0.57, 'Factory B (HP-1200)': 0.63, 'Factory C (RW-300)': 0.58, 'Factory D (HT-400)': 0.60 }, clientAccuracies: { 'Factory A (CNC-800)': 0.76, 'Factory B (HP-1200)': 0.73, 'Factory C (RW-300)': 0.75, 'Factory D (HT-400)': 0.74 }, privacyBudgetEpsilon: 0.85 },
  { roundId: 4, timestamp: '10:15:00', globalAccuracy: 0.79, globalLoss: 0.49, bandwidthUsed: '4.8 MB', clientLosses: { 'Factory A (CNC-800)': 0.47, 'Factory B (HP-1200)': 0.52, 'Factory C (RW-300)': 0.48, 'Factory D (HT-400)': 0.49 }, clientAccuracies: { 'Factory A (CNC-800)': 0.80, 'Factory B (HP-1200)': 0.78, 'Factory C (RW-300)': 0.79, 'Factory D (HT-400)': 0.79 }, privacyBudgetEpsilon: 1.20 },
  { roundId: 6, timestamp: '10:25:00', globalAccuracy: 0.83, globalLoss: 0.38, bandwidthUsed: '7.2 MB', clientLosses: { 'Factory A (CNC-800)': 0.36, 'Factory B (HP-1200)': 0.41, 'Factory C (RW-300)': 0.37, 'Factory D (HT-400)': 0.39 }, clientAccuracies: { 'Factory A (CNC-800)': 0.84, 'Factory B (HP-1200)': 0.82, 'Factory C (RW-300)': 0.83, 'Factory D (HT-400)': 0.83 }, privacyBudgetEpsilon: 1.65 },
  { roundId: 8, timestamp: '10:30:00', globalAccuracy: 0.86, globalLoss: 0.32, bandwidthUsed: '9.6 MB', clientLosses: { 'Factory A (CNC-800)': 0.30, 'Factory B (HP-1200)': 0.35, 'Factory C (RW-300)': 0.31, 'Factory D (HT-400)': 0.32 }, clientAccuracies: { 'Factory A (CNC-800)': 0.87, 'Factory B (HP-1200)': 0.85, 'Factory C (RW-300)': 0.86, 'Factory D (HT-400)': 0.86 }, privacyBudgetEpsilon: 2.00 },
  { roundId: 10, timestamp: '10:40:00', globalAccuracy: 0.90, globalLoss: 0.24, bandwidthUsed: '12.0 MB', clientLosses: { 'Factory A (CNC-800)': 0.22, 'Factory B (HP-1200)': 0.27, 'Factory C (RW-300)': 0.23, 'Factory D (HT-400)': 0.25 }, clientAccuracies: { 'Factory A (CNC-800)': 0.91, 'Factory B (HP-1200)': 0.88, 'Factory C (RW-300)': 0.90, 'Factory D (HT-400)': 0.89 }, privacyBudgetEpsilon: 2.45 },
  { roundId: 12, timestamp: '10:45:00', globalAccuracy: 0.934, globalLoss: 0.18, bandwidthUsed: '14.4 MB', clientLosses: { 'Factory A (CNC-800)': 0.16, 'Factory B (HP-1200)': 0.20, 'Factory C (RW-300)': 0.17, 'Factory D (HT-400)': 0.19 }, clientAccuracies: { 'Factory A (CNC-800)': 0.94, 'Factory B (HP-1200)': 0.91, 'Factory C (RW-300)': 0.93, 'Factory D (HT-400)': 0.93 }, privacyBudgetEpsilon: 2.80 }
];

export const CENTRALIZED_ACC_CURVE = [0.65, 0.70, 0.75, 0.81, 0.84, 0.87, 0.89, 0.91, 0.92, 0.93, 0.935, 0.94];
export const FEDERATED_ACC_CURVE = [0.55, 0.68, 0.72, 0.77, 0.79, 0.81, 0.84, 0.86, 0.88, 0.90, 0.92, 0.934];
export const COMM_ROUNDS_X = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
