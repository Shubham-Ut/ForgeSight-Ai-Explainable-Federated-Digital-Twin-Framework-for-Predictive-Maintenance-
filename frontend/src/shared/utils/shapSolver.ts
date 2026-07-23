/**
 * ForgeSight AI — SHAP Result Types
 *
 * SHAP computations are performed server-side using TreeSHAP on the trained
 * XGBoost model. This file provides only TypeScript types for the API response.
 *
 * Endpoint: GET /api/v1/machines/{machine_id}/shap
 * Returns: ShapExplanation with real TreeSHAP values from the trained model.
 */

export interface ShapFeature {
  feature_name: string;
  shap_value: number;
  base_value: number;
  current_value: number;
  percent_contribution: number;
  direction: 'positive' | 'negative';
}

export interface ShapExplanation {
  machine_id: string;
  prediction_id: string;
  timestamp: string;
  baseline_rul: number;
  predicted_rul: number;
  shap_values: ShapFeature[];
  global_importance: ShapFeature[];
  nlp_explanation: string;
  model: string;
}

/**
 * Sort SHAP features by absolute contribution (descending).
 * Use for waterfall charts and feature importance bars.
 */
export function sortByAbsShap(features: ShapFeature[]): ShapFeature[] {
  return [...features].sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value));
}

/**
 * Get top-N most impactful SHAP features.
 */
export function topNShapFeatures(features: ShapFeature[], n: number): ShapFeature[] {
  return sortByAbsShap(features).slice(0, n);
}

/**
 * Split SHAP features into positive (increasing RUL) and negative (reducing RUL).
 */
export function splitByDirection(features: ShapFeature[]): {
  positive: ShapFeature[];
  negative: ShapFeature[];
} {
  return {
    positive: features.filter(f => f.direction === 'positive'),
    negative: features.filter(f => f.direction === 'negative'),
  };
}

/**
 * Format a SHAP value for display (e.g., "+12.4 cycles" or "−8.3 cycles").
 */
export function formatShapValue(value: number, unit: string = 'cycles'): string {
  const sign = value >= 0 ? '+' : '−';
  return `${sign}${Math.abs(value).toFixed(1)} ${unit}`;
}
