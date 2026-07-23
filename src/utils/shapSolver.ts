/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BASELINE_SENSORS, FEATURE_LABELS } from './machineLearningModels';

export interface ShapResult {
  featureName: string;
  shapValue: number;
  baseValue: number;
  currentValue: number;
}

// Factorial helper
function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

// Computes exact Shapley Values for 5 features
// M = 5 features. Total combinations = 2^5 = 32 coalitions.
export function calculateExactShap(
  predictFn: (features: number[]) => number,
  x: number[], // Current features [speed, torque, wear, temp, vib]
  xBase: number[] = [1500, 40.0, 10, 25.0, 1.2] // Background features
): ShapResult[] {
  const M = 5;
  const shapleyValues = new Array(M).fill(0);

  // Pre-calculate all subset prediction values to make coalition lookup O(1)
  // Coalitions are index-encoded as an integer mask from 0 to 31
  const coalitionValues = new Array(32).fill(0);
  
  for (let mask = 0; mask < 32; mask++) {
    const hybridFeatures = new Array(M);
    for (let i = 0; i < M; i++) {
      const isFeatureInSubset = (mask & (1 << i)) !== 0;
      hybridFeatures[i] = isFeatureInSubset ? x[i] : xBase[i];
    }
    coalitionValues[mask] = predictFn(hybridFeatures);
  }

  // Calculate Shapley Value for each feature 'i'
  for (let i = 0; i < M; i++) {
    let shap = 0;
    
    // Iterate over all subsets S of features excluding 'i'
    for (let mask = 0; mask < 32; mask++) {
      const isFeatureInSubset = (mask & (1 << i)) !== 0;
      if (isFeatureInSubset) continue; // Skip if 'i' is already in S

      // Size of subset S
      let sSize = 0;
      for (let j = 0; j < M; j++) {
        if ((mask & (1 << j)) !== 0) sSize++;
      }

      // Shapley combinatorial weight: |S|!(M - |S| - 1)! / M!
      const weight = (factorial(sSize) * factorial(M - sSize - 1)) / factorial(M);

      // Marginal contribution: f(S ∪ {i}) - f(S)
      const maskWithI = mask | (1 << i);
      const marginalContribution = coalitionValues[maskWithI] - coalitionValues[mask];

      shap += weight * marginalContribution;
    }
    
    shapleyValues[i] = parseFloat(shap.toFixed(4));
  }

  // Format into results array with labels
  return FEATURE_LABELS.map((label, idx) => ({
    featureName: label,
    shapValue: shapleyValues[idx],
    baseValue: xBase[idx],
    currentValue: x[idx]
  }));
}
