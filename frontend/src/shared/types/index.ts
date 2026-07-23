/**
 * ForgeSight AI — Complete TypeScript Type Definitions
 * Research Platform: Explainable Federated Digital Twin Predictive Maintenance
 * @module types
 */

// ============================================================
// CORE DOMAIN TYPES
// ============================================================

export type MachineStatus = 'healthy' | 'warning' | 'critical' | 'failed' | 'offline';
export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';
export type ComponentStatus = 'healthy' | 'degraded' | 'warning' | 'critical' | 'failed';

// ============================================================
// FACTORY & MACHINE
// ============================================================

export interface FactoryDetails {
  readonly id: string;
  readonly name: string;
  readonly location: string;
  readonly timezone: string;
  readonly machineCount: number;
  readonly operatingShift: string;
  readonly coordinates: { lat: number; lon: number };
}

export interface ComponentHealth {
  readonly id: string;
  readonly name: string;
  healthScore: number;           // 0–100
  status: ComponentStatus;
  shapContribution: number;      // SHAP attribution value
  description: string;
  lastInspected?: string;
  replacementDueIn?: number;     // hours
}

export interface SensorData {
  readonly timestamp: string;
  temperature: number;           // °C
  pressure: number;              // bar
  vibration: number;             // mm/s
  speed: number;                 // RPM
  torque: number;                // Nm
  wear: number;                  // min (tool wear)
  airTemp: number;               // K
  processTemp: number;           // K
  rotationalSpeed: number;       // RPM
  toolWear: number;              // min
  powerConsumption: number;      // kW
  motorCurrent: number;          // A
  humidity?: number;             // %
  // NASA C-MAPSS specific
  t24?: number;                  // Total temperature at HPC outlet (°R)
  t30?: number;                  // Total temperature at HPC outlet (°R)
  t50?: number;                  // Total temperature at LPT outlet (°R)
  p30?: number;                  // Total pressure at HPC outlet (psia)
  nf?: number;                   // Physical fan speed (rpm)
  nc?: number;                   // Physical core speed (rpm)
  ps30?: number;                 // Static pressure at HPC outlet (psia)
  bpr?: number;                  // Bypass ratio
  htBleed?: number;              // Bleed enthalpy
  w31?: number;                  // HPT coolant bleed (lbm/s)
  w32?: number;                  // LPT coolant bleed (lbm/s)
  machineType?: string;
  failureType?: string;
  target?: number;
}

export interface MachineMetadata {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly factoryId: string;
  readonly commissionedDate: string;
  readonly manufacturer?: string;
  readonly model?: string;
  readonly serialNumber?: string;
}

export interface MachineDigitalTwin {
  readonly metadata: MachineMetadata;
  sensors: SensorData;
  healthScore: number;           // 0–100
  predictedRUL: number;          // remaining hours/cycles
  failureProbability: number;    // 0–100 %
  components: ComponentHealth[];
  recommendedAction: string;
  estimatedDowntime: number;     // hours
  estimatedRepairCost: number;   // USD
  status?: MachineStatus;
  lastUpdated?: string;
  anomalyScore?: number;
}

// ============================================================
// SENSOR STREAMING
// ============================================================

export interface SensorReading {
  machineId: string;
  factoryId: string;
  sensors: SensorData;
  timestamp: string;
}

export interface SensorHistory {
  machineId: string;
  readings: SensorReading[];     // Circular buffer, last 120
  windowDuration: number;        // seconds
}

// ============================================================
// PREDICTION RESULTS
// ============================================================

export interface PredictionResult {
  readonly machineId: string;
  readonly timestamp: string;
  readonly modelName: string;
  readonly modelVersion: string;
  rul: number;                   // Remaining Useful Life (cycles)
  rulLower: number;              // Conformal prediction lower bound
  rulUpper: number;              // Conformal prediction upper bound
  healthScore: number;           // 0–100
  failureProbability: number;    // 0–100 %
  anomalyScore: number;          // 0–1 (Isolation Forest)
  confidence: number;            // 0–100 %
  maintenancePriority: 'immediate' | 'scheduled' | 'routine' | 'monitor';
  estimatedFailureDate?: string;
  spareParts?: SparePartRecommendation[];
}

export interface SparePartRecommendation {
  partId: string;
  partName: string;
  quantity: number;
  leadTimeDays: number;
  estimatedCost: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface ModelMetrics {
  readonly name: string;
  mae: number;
  rmse: number;
  r2: number;
  mape: number;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1?: number;
  rocAuc?: number;
  trainingTime: string;
  inferenceTime: string;
  memoryUsage: string;
  conformalCoverage?: number;
}

export interface AnomalyDetectionResult {
  readonly machineId: string;
  readonly timestamp: string;
  isAnomaly: boolean;
  anomalyScore: number;
  detectorUsed: 'isolation_forest' | 'one_class_svm' | 'autoencoder' | 'lstm_ae';
  affectedSensors: string[];
  severity: AlertSeverity;
}

// ============================================================
// EXPLAINABLE AI (SHAP / LIME)
// ============================================================

export interface ShapValue {
  featureName: string;
  shapValue: number;             // Additive attribution
  baseValue: number;             // Background value
  currentValue: number;          // Actual sensor value
  percentContribution: number;   // % of total explanation
  direction: 'positive' | 'negative'; // Effect on RUL
}

export interface ShapExplanation {
  readonly machineId: string;
  readonly predictionId: string;
  readonly timestamp: string;
  baselineRUL: number;
  predictedRUL: number;
  shapValues: ShapValue[];
  globalImportance: ShapValue[]; // Averaged across all instances
  nlpExplanation: string;        // Auto-generated natural language
  plotData?: {
    waterfall: WaterfallStep[];
    forceData: ForceData;
    dependencePlots: DependencePlot[];
  };
}

export interface WaterfallStep {
  feature: string;
  value: number;
  startX: number;
  endX: number;
  contribution: number;
  cumulative: number;
}

export interface ForceData {
  baseValue: number;
  outputValue: number;
  features: { name: string; value: number; shapValue: number }[];
}

export interface DependencePlot {
  featureName: string;
  interactionFeature: string;
  points: Array<{ x: number; y: number; color: number }>;
}

export interface LimeExplanation {
  readonly machineId: string;
  featureWeights: Array<{ feature: string; weight: number; value: string }>;
  localFidelity: number;
  predictedLabel: string;
  predictedProbability: number;
}

export interface CounterfactualExplanation {
  readonly machineId: string;
  readonly originalRUL: number;
  readonly targetRUL: number;
  changes: Array<{
    feature: string;
    originalValue: number;
    counterfactualValue: number;
    delta: number;
    unit: string;
    feasible: boolean;
  }>;
  achievedRUL: number;
  rulImprovement: number;        // %
  maintenanceCost: number;       // USD
  roi: number;                   // %
  nlpExplanation: string;
}

// ============================================================
// FEDERATED LEARNING
// ============================================================

export interface FederatedClient {
  id: string;
  name: string;
  factoryId: string;
  status: 'idle' | 'training' | 'uploading' | 'synced' | 'error';
  dataSamples: number;
  skewFactor: number;            // Non-IID heterogeneity
  localLoss: number;
  localAccuracy: number;
  localWeights?: number[];
  bandwidthUsed: number;         // MB
  privacyBudgetUsed: number;     // epsilon consumed
  computeTime: number;           // seconds
  lastSyncedAt?: string;
}

export interface FederatedRound {
  readonly roundId: number;
  readonly timestamp: string;
  globalAccuracy: number;
  globalLoss: number;
  globalMAE: number;
  bandwidthUsed: string;         // "1.2 MB"
  privacyBudgetEpsilon: number;
  clientCount: number;
  clientMetrics: Record<string, { loss: number; accuracy: number }>;
  aggregationStrategy: 'FedAvg' | 'FedProx' | 'FedNova' | 'SCAFFOLD';
  dpNoiseSigma: number;
  convergenceGap: number;        // Distance to global optimum
  durationSeconds: number;
}

export interface FLConfig {
  strategy: 'FedAvg' | 'FedProx' | 'FedNova' | 'SCAFFOLD';
  numClients: number;
  localEpochs: number;
  localBatchSize: number;
  learningRate: number;
  noiseSigma: number;            // DP noise
  clippingC: number;             // L2 norm clipping
  alphaDirichlet: number;        // Data heterogeneity
  targetRounds: number;
  minFitClients: number;
  minEvaluateClients: number;
}

export interface FLTrainingMetrics {
  rounds: FederatedRound[];
  centralizedBaseline: ModelMetrics;
  federatedFinal: ModelMetrics;
  privacyMetrics: {
    totalEpsilon: number;
    delta: number;
    mechanism: string;
    renyiOrder?: number;
  };
  communicationStats: {
    totalBandwidth: number;      // MB
    avgBandwidthPerRound: number;
    totalRounds: number;
    convergenceRound: number;
  };
}

// ============================================================
// DIGITAL TWIN
// ============================================================

export interface DigitalTwinState {
  readonly machineId: string;
  readonly timestamp: string;
  sensors: SensorData;
  componentHealth: Record<string, number>;
  componentColors: Record<string, string>;
  degradationCurve: number[];
  predictedRUL: number;
  failureProbability: number;
  healthScore: number;
  activeAlerts: ComponentAlert[];
  futureTrajectory: FuturePoint[];
  whatIfScenario?: WhatIfScenario;
  simulationMode: 'live' | 'replay' | 'whatif' | 'forecast';
}

export interface ComponentAlert {
  componentId: string;
  componentName: string;
  severity: AlertSeverity;
  message: string;
  detectedAt: string;
  shapContribution: number;
}

export interface FuturePoint {
  cycle: number;
  predictedHealth: number;
  predictedRUL: number;
  confidenceLower: number;
  confidenceUpper: number;
}

export interface WhatIfScenario {
  id: string;
  name: string;
  description: string;
  maintenance: {
    type: string;
    cost: number;
    downtimeHours: number;
    rulGain: number;
    cascadeAvoidedCost: number;
  };
  sensorOverrides: Partial<SensorData>;
  projectedRUL: number;
  projectedHealthScore: number;
  roi: number;
}

// ============================================================
// RAG ASSISTANT
// ============================================================

export interface RagMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: RagSource[];
  machineContext?: { machineId: string; rul: number; healthScore: number };
  loading?: boolean;
}

export interface RagSource {
  documentId: string;
  title: string;
  similarity: number;            // 0–1
  excerpt: string;
  page?: number;
}

export interface RagDocument {
  id: string;
  title: string;
  category: 'manual' | 'sop' | 'bulletin' | 'incident_report' | 'safety';
  content: string;
  uploadedAt: string;
  pageCount?: number;
  embedding?: number[];          // Vector embedding
}

export interface MaintenanceReport {
  id: string;
  machineId: string;
  machineName: string;
  factoryId: string;
  reportType: 'health' | 'failure' | 'maintenance' | 'twin' | 'shap' | 'federated';
  generatedAt: string;
  generatedBy: string;           // model + version
  sections: ReportSection[];
  summary: string;
  recommendations: string[];
  urgencyLevel: 'immediate' | 'within_24h' | 'within_week' | 'routine';
  estimatedCost: number;
  attachments?: string[];
}

export interface ReportSection {
  title: string;
  content: string;
  data?: Record<string, unknown>;
  charts?: ChartData[];
}

export interface ChartData {
  type: 'bar' | 'line' | 'scatter' | 'pie';
  title: string;
  labels: string[];
  datasets: { label: string; data: number[]; color?: string }[];
}

// ============================================================
// COMPUTER VISION
// ============================================================

export interface DefectDetection {
  id: string;
  imageUrl: string;
  timestamp: string;
  machineId: string;
  componentId: string;
  detections: BoundingBox[];
  overallSeverity: AlertSeverity;
  defectReport: string;
}

export interface BoundingBox {
  x: number; y: number;
  width: number; height: number;
  confidence: number;            // 0–1
  classId: number;
  className: 'bearing_wear' | 'crack' | 'corrosion' | 'oil_leakage' | 'surface_defect' | 'thermal_hotspot';
  severity: AlertSeverity;
}

// ============================================================
// ALERTS
// ============================================================

export interface Alert {
  id: string;
  machineId: string;
  machineName: string;
  factoryId: string;
  severity: AlertSeverity;
  type: 'rul_critical' | 'health_degradation' | 'anomaly' | 'component_failure' | 'sensor_fault' | 'cv_defect';
  title: string;
  message: string;
  triggeredAt: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  actions?: string[];
  relatedSensors?: string[];
}

// ============================================================
// API RESPONSE WRAPPERS
// ============================================================

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
  requestId?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}

export interface ApiError {
  statusCode: number;
  message: string;
  detail?: string | Record<string, string[]>;
  timestamp: string;
}

// ============================================================
// WEBSOCKET MESSAGES
// ============================================================

export type WebSocketMessageType =
  | 'sensor_update'
  | 'prediction_update'
  | 'alert_triggered'
  | 'twin_state_update'
  | 'fl_round_update'
  | 'fl_client_update'
  | 'cv_detection'
  | 'ping'
  | 'pong';

export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  machineId?: string;
  payload: T;
  timestamp: string;
  sequenceId: number;
}
