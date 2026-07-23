import type { SensorData } from '@shared/types';
import { runXGBoost, runRandomForest, runLSTMInference, sensorsToFeatureArray } from './machineLearningModels';

export interface HealthMetrics {
  healthScore: number;
  predictedRUL: number;
  failureProbability: number;
  confidenceScore: number;
  confidenceInterval: [number, number];
  anomalyScore: number;
  isAnomaly: boolean;
  activeFailureMode: string;
}

export function calculatePhysicalHealth(sensors: SensorData): HealthMetrics {
  const temperature = sensors.temperature || 25.0;
  const vibration = sensors.vibration || 1.2;
  
  const features = sensorsToFeatureArray(sensors);

  const predictedRUL = Math.round(runXGBoost(features));
  const failureProbability = parseFloat((runRandomForest(features) * 100).toFixed(1));

  const history = Array.from({ length: 5 }).map((_, stepIdx) => {
    const t = stepIdx / 4;
    return [
      (sensors.speed ?? 1500) * (0.98 + t * 0.02),
      (sensors.torque ?? 40.0) * (0.97 + t * 0.03),
      Math.max(0, (sensors.wear ?? sensors.toolWear ?? 10.0) - (4 - stepIdx) * 0.2),
      (sensors.temperature ?? 25.0) * (0.99 + t * 0.01),
      (sensors.vibration ?? 1.2) * (0.95 + t * 0.05)
    ];
  });
  const lstmResult = runLSTMInference(history);
  const anomalyScore = parseFloat((lstmResult.anomalyScore * 9.9).toFixed(2));
  const isAnomaly = anomalyScore > 3.5;

  const baseHealth = 100 - (failureProbability * 0.75 + Math.max(0, 180 - predictedRUL) * 0.15);
  const healthScore = Math.max(1, Math.min(100, Math.round(baseHealth)));

  const uncertaintyMargin = Math.round(12 + vibration * 2.0 + (temperature > 65 ? (temperature - 65) * 0.5 : 0));
  const confidenceInterval: [number, number] = [
    Math.max(1, predictedRUL - uncertaintyMargin),
    predictedRUL + uncertaintyMargin
  ];

  const confidenceScore = parseFloat(
    Math.min(98.5, Math.max(68.0, 96.0 - (vibration * 1.5) - (temperature > 50 ? (temperature - 50) * 0.15 : 0))).toFixed(1)
  );

  let activeFailureMode = 'No Failure';
  if (isAnomaly) {
    const speedDev = Math.abs((sensors.speed ?? 1500) - 1500) / 1500;
    const torqueDev = Math.abs((sensors.torque ?? 40.0) - 40.0) / 40.0;
    const wearDev = Math.abs((sensors.wear ?? sensors.toolWear ?? 10.0) - 100.0) / 100.0;
    const tempDev = Math.abs((sensors.temperature ?? 25.0) - 25.0) / 25.0;
    const vibDev = Math.abs((sensors.vibration ?? 1.2) - 1.2) / 1.2;

    const devs = [
      { name: 'Tool Wear Failure', val: wearDev },
      { name: 'Heat Dissipation Failure', val: tempDev },
      { name: 'Power Failure', val: torqueDev },
      { name: 'Overstrain Failure', val: vibDev + speedDev }
    ];
    devs.sort((a, b) => b.val - a.val);
    activeFailureMode = devs[0].name;
  }

  return {
    healthScore,
    predictedRUL,
    failureProbability,
    confidenceScore,
    confidenceInterval,
    anomalyScore,
    isAnomaly,
    activeFailureMode
  };
}
