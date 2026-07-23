/**
 * ForgeSight AI — Machine Learning Utilities
 *
 * All predictions come from the backend API (trained XGBoost / Random Forest models).
 * This file only contains:
 *   - Type definitions and baseline sensor constants (for UI forms/sliders)
 *   - Feature label mappings
 *   - Helper to convert SensorData → ordered array for API submission
 *
 * DO NOT add client-side tree inference here — all ML must run server-side
 * on trained models. See: /api/v1/predictions/batch and /api/v1/machines/{id}/shap
 */

import { SensorData } from '@shared/types';

/** Baseline nominal sensor values (used for UI sliders default state only) */
export const BASELINE_SENSORS: SensorData = {
  timestamp: new Date().toISOString(),
  temperature: 25.0,
  vibration: 1.2,
  speed: 1500,
  torque: 40.0,
  wear: 10,
  airTemp: 298.5,
  processTemp: 308.3,
  pressure: 110.0,
  w31: 42.5,
  w32: 38.0,
  rotationalSpeed: 1500,
  toolWear: 10,
  powerConsumption: 5.5,
  motorCurrent: 12.0
};

/**
 * Human-readable labels for the 5 legacy sensor features.
 * Used for display only — not for inference.
 */
export const FEATURE_LABELS = [
  'Rotational Speed [rpm]',
  'Torque [Nm]',
  'Tool Wear [min]',
  'Spindle Temp [°C]',
  'Radial Vibration [mm/s]'
];

/**
 * C-MAPSS informative sensor labels (14 sensors used by the trained model).
 * Matches the backend feature_names.json order.
 */
export const CMAPSS_SENSOR_LABELS: Record<string, string> = {
  s2:  'Fan Inlet Temp (T2)',
  s3:  'LPC Outlet Temp (T24)',
  s4:  'HPC Outlet Temp (T30)',
  s7:  'HPC Outlet Pressure (P30)',
  s8:  'Physical Fan Speed (Nf)',
  s9:  'Physical Core Speed (Nc)',
  s11: 'Bypass Ratio (BPR)',
  s12: 'Fuel Flow (Wf)',
  s13: 'Fan Outlet Velocity (Vs)',
  s14: 'Corrected Fan Speed',
  s15: 'Corrected Core Speed',
  s17: 'HPT Coolant Bleed',
  s20: 'LPT Coolant Bleed (W31)',
  s21: 'LPT Inlet Pressure',
};

/**
 * Convert a SensorData object to the 5-element ordered feature array
 * [speed, torque, wear, temperature, vibration].
 * This array can be sent to the backend for what-if simulations.
 * It does NOT run local inference.
 */
export function sensorsToFeatureArray(s: SensorData): number[] {
  return [
    s.speed ?? 1500,
    s.torque ?? 40.0,
    s.wear ?? s.toolWear ?? 10,
    s.temperature ?? 25.0,
    s.vibration ?? 1.2
  ];
}

/**
 * Returns the human-readable label for a feature name.
 * Falls back to the raw feature name if not found.
 */
export function getFeatureLabel(featureName: string): string {
  // Check C-MAPSS sensor labels
  const cmapssLabel = CMAPSS_SENSOR_LABELS[featureName];
  if (cmapssLabel) return cmapssLabel;

  // Check legacy feature labels by index
  const legacyIdx = FEATURE_LABELS.findIndex(
    l => l.toLowerCase().includes(featureName.toLowerCase())
  );
  if (legacyIdx >= 0) return FEATURE_LABELS[legacyIdx];

  // Format snake_case to Title Case as fallback
  return featureName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Health score → status label mapping.
 * Mirrors backend logic (no inference, just display).
 */
export function healthToStatus(healthScore: number): 'healthy' | 'warning' | 'critical' | 'failed' {
  if (healthScore >= 75) return 'healthy';
  if (healthScore >= 50) return 'warning';
  if (healthScore >= 25) return 'critical';
  return 'failed';
}

/**
 * Health score → color for UI visualization.
 */
export function healthToColor(healthScore: number): string {
  if (healthScore >= 75) return '#10b981';  // emerald
  if (healthScore >= 50) return '#f59e0b';  // amber
  if (healthScore >= 25) return '#f97316';  // orange
  return '#f43f5e';                          // rose
}

/**
 * RUL → urgency label for maintenance scheduling.
 */
export function rulToUrgency(rul: number): 'routine' | 'monitor' | 'scheduled' | 'immediate' {
  if (rul > 80) return 'routine';
  if (rul > 40) return 'monitor';
  if (rul > 15) return 'scheduled';
  return 'immediate';
}
