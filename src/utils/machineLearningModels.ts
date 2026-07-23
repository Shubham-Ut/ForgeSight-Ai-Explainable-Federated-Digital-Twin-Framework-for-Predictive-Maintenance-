/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SensorData } from '../types';

// Standard background values representing baseline nominal machines
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
};

// Feature Names mapped in coalitions
export const FEATURE_LABELS = [
  'Rotational Speed [rpm]',
  'Torque [Nm]',
  'Tool Wear [min]',
  'Spindle Temp [°C]',
  'Radial Vibration [mm/s]'
];

// Helper to convert SensorData object into standard ordered feature array [speed, torque, wear, temperature, vibration]
export function sensorsToFeatureArray(s: SensorData): number[] {
  return [
    s.speed ?? 1500,
    s.torque ?? 40.0,
    s.wear ?? 10,
    s.temperature ?? 25.0,
    s.vibration ?? 1.2
  ];
}

// -------------------------------------------------------------
// 1. RANDOM FOREST CLASSIFIER INFERENCE
// -------------------------------------------------------------
// An ensemble of 5 Decision Trees trained to predict failure probability [0, 1]
export interface DecisionTreeNode {
  featureIdx?: number; // index of feature to split on (0: speed, 1: torque, 2: wear, 3: temp, 4: vib)
  threshold?: number;  // value to split on
  left?: DecisionTreeNode | number; // Node or leaf value (probability of failure)
  right?: DecisionTreeNode | number;
}

export const RANDOM_FOREST_TREES: DecisionTreeNode[] = [
  // Tree 1: Focuses on Temperature and Vibration
  {
    featureIdx: 3, // Temperature
    threshold: 65.0,
    left: {
      featureIdx: 4, // Vibration
      threshold: 4.5,
      left: 0.01,
      right: 0.15
    },
    right: {
      featureIdx: 4, // Vibration
      threshold: 6.2,
      left: 0.35,
      right: 0.85
    }
  },
  // Tree 2: Focuses on Tool Wear and Torque
  {
    featureIdx: 2, // Tool Wear
    threshold: 120.0,
    left: {
      featureIdx: 1, // Torque
      threshold: 55.0,
      left: 0.02,
      right: 0.28
    },
    right: {
      featureIdx: 1, // Torque
      threshold: 62.0,
      left: 0.40,
      right: 0.90
    }
  },
  // Tree 3: Focuses on Rotational Speed and Torque interaction (Power output)
  {
    featureIdx: 0, // Speed
    threshold: 3200.0,
    left: {
      featureIdx: 1, // Torque
      threshold: 45.0,
      left: 0.05,
      right: 0.30
    },
    right: {
      featureIdx: 4, // Vibration
      threshold: 5.0,
      left: 0.55,
      right: 0.92
    }
  },
  // Tree 4: Focuses on Multi-variate Wear and Temperature
  {
    featureIdx: 2, // Wear
    threshold: 160.0,
    left: {
      featureIdx: 3, // Temp
      threshold: 55.0,
      left: 0.01,
      right: 0.18
    },
    right: {
      featureIdx: 3, // Temp
      threshold: 75.0,
      left: 0.60,
      right: 0.95
    }
  },
  // Tree 5: Outlier & Bearing-focus (Vibration and Speed)
  {
    featureIdx: 4, // Vibration
    threshold: 3.5,
    left: {
      featureIdx: 0, // Speed
      threshold: 2800.0,
      left: 0.005,
      right: 0.10
    },
    right: {
      featureIdx: 2, // Wear
      threshold: 80.0,
      left: 0.25,
      right: 0.78
    }
  }
];

function traverseTree(node: DecisionTreeNode | number, features: number[]): number {
  if (typeof node === 'number') return node;
  const val = features[node.featureIdx!];
  if (val <= node.threshold!) {
    return traverseTree(node.left!, features);
  } else {
    return traverseTree(node.right!, features);
  }
}

export function runRandomForest(features: number[]): number {
  let sum = 0;
  for (const tree of RANDOM_FOREST_TREES) {
    sum += traverseTree(tree, features);
  }
  return sum / RANDOM_FOREST_TREES.length;
}


// -------------------------------------------------------------
// 2. XGBOOST REGRESSOR INFERENCE (Gradient Boosted Trees)
// -------------------------------------------------------------
// Returns predicted Remaining Useful Life (RUL) in operational hours
// Uses shrinkage (learning rate) and additive estimators
export interface XGBoostTree {
  featureIdx?: number;
  threshold?: number;
  left?: XGBoostTree | number; // weight adjustment leaf
  right?: XGBoostTree | number;
}

export const XGBOOST_BASE_SCORE = 110.0; // base prediction RUL
export const XGBOOST_LEARNING_RATE = 0.3;

export const XGBOOST_ESTIMATORS: XGBoostTree[] = [
  // Tree 1: Tool wear impact
  {
    featureIdx: 2, // Wear
    threshold: 100.0,
    left: 15.2,
    right: -25.5
  },
  // Tree 2: Thermal and Vibration cascade
  {
    featureIdx: 3, // Temp
    threshold: 58.0,
    left: {
      featureIdx: 4, // Vibration
      threshold: 3.0,
      left: 10.5,
      right: -8.2
    },
    right: -32.4
  },
  // Tree 3: Mechanical Loading (Torque & Speed)
  {
    featureIdx: 1, // Torque
    threshold: 50.0,
    left: {
      featureIdx: 0, // Speed
      threshold: 2500,
      left: 5.1,
      right: -12.4
    },
    right: -18.6
  },
  // Tree 4: Direct degradation correction
  {
    featureIdx: 4, // Vibration
    threshold: 5.2,
    left: 4.8,
    right: -22.0
  },
  // Tree 5: Interaction limit (Wear and speed)
  {
    featureIdx: 2, // Wear
    threshold: 180.0,
    left: {
      featureIdx: 0, // Speed
      threshold: 3500.0,
      left: 2.0,
      right: -15.0
    },
    right: -45.0
  }
];

function traverseXGBTree(node: XGBoostTree | number, features: number[]): number {
  if (typeof node === 'number') return node;
  const val = features[node.featureIdx!];
  if (val <= node.threshold!) {
    return traverseXGBTree(node.left!, features);
  } else {
    return traverseXGBTree(node.right!, features);
  }
}

export function runXGBoost(features: number[]): number {
  let score = XGBOOST_BASE_SCORE;
  for (const tree of XGBOOST_ESTIMATORS) {
    score += XGBOOST_LEARNING_RATE * traverseXGBTree(tree, features);
  }
  // Clamp RUL between 5 and 180 hours
  return Math.max(5.0, Math.min(180.0, score));
}


// -------------------------------------------------------------
// 3. LSTM (LONG SHORT-TERM MEMORY) STATEFUL NETWORK INFERENCE
// -------------------------------------------------------------
// Fulfills recurrent sequence modeling of the previous 5 cycles
// Runs actual gated matrix equations for LSTM Cell state updates
export interface LSTMWeights {
  W_f: number[][]; // Forget gate weights [hidden_dim, feature_dim]
  W_i: number[][]; // Input gate weights
  W_c: number[][]; // Cell state weights
  W_o: number[][]; // Output gate weights
  U_f: number[][]; // Recurrent hidden weights [hidden_dim, hidden_dim]
  U_i: number[][];
  U_c: number[][];
  U_o: number[][];
  b_f: number[];   // Biases [hidden_dim]
  b_i: number[];
  b_c: number[];
  b_o: number[];
}

// 2-dimensional hidden-state LSTM cell weights for compact representation
export const LSTM_MODEL_WEIGHTS: LSTMWeights = {
  W_f: [
    [0.12, -0.05, -0.22, 0.18, -0.45],
    [-0.08, 0.15, -0.34, 0.22, -0.52]
  ],
  W_i: [
    [-0.21, 0.35, 0.11, -0.12, 0.44],
    [0.18, -0.25, 0.15, -0.19, 0.58]
  ],
  W_c: [
    [0.25, -0.18, 0.62, -0.34, 0.82],
    [-0.15, 0.22, 0.55, -0.41, 0.94]
  ],
  W_o: [
    [0.11, 0.08, -0.12, 0.15, -0.33],
    [-0.05, 0.12, -0.18, 0.25, -0.41]
  ],
  U_f: [
    [0.22, -0.15],
    [0.11, 0.34]
  ],
  U_i: [
    [0.15, 0.25],
    [-0.18, 0.12]
  ],
  U_c: [
    [0.32, -0.12],
    [0.14, 0.45]
  ],
  U_o: [
    [0.08, 0.18],
    [-0.12, 0.22]
  ],
  b_f: [0.5, 0.4], // Positively biased to maintain long-term memory
  b_i: [-0.1, -0.2],
  b_c: [0.0, 0.1],
  b_o: [0.1, 0.0]
};

// Math Helpers
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function tanh(x: number): number {
  return Math.tanh(x);
}

// Full recurrence loop over high-frequency historical time-series buffer
export interface LSTMStepResult {
  hiddenState: number[];
  cellState: number[];
  forgetGate: number[];
  inputGate: number[];
  outputGate: number[];
}

export function runLSTMRecurrence(history: number[][]): LSTMStepResult[] {
  const steps: LSTMStepResult[] = [];
  const dim = 2; // hidden state dimension
  let h = [0.0, 0.0]; // initial hidden state
  let c = [0.0, 0.0]; // initial cell state

  const weights = LSTM_MODEL_WEIGHTS;

  for (const x of history) {
    const f: number[] = [];
    const idx_g: number[] = [];
    const c_tilde: number[] = [];
    const o: number[] = [];

    // Calculate forgetting, input, candidate cell, and output gates
    for (let i = 0; i < dim; i++) {
      // 1. Forget Gate: f_t = σ(W_f x_t + U_f h_{t-1} + b_f)
      let sum_f = weights.b_f[i];
      for (let j = 0; j < x.length; j++) sum_f += weights.W_f[i][j] * x[j];
      for (let j = 0; j < dim; j++) sum_f += weights.U_f[i][j] * h[j];
      f.push(sigmoid(sum_f));

      // 2. Input Gate: i_t = σ(W_i x_t + U_i h_{t-1} + b_i)
      let sum_i = weights.b_i[i];
      for (let j = 0; j < x.length; j++) sum_i += weights.W_i[i][j] * x[j];
      for (let j = 0; j < dim; j++) sum_i += weights.U_i[i][j] * h[j];
      idx_g.push(sigmoid(sum_i));

      // 3. Candidate Cell State: c_tilde_t = tanh(W_c x_t + U_c h_{t-1} + b_c)
      let sum_c = weights.b_c[i];
      for (let j = 0; j < x.length; j++) sum_c += weights.W_c[i][j] * x[j];
      for (let j = 0; j < dim; j++) sum_c += weights.U_c[i][j] * h[j];
      c_tilde.push(tanh(sum_c));

      // 4. Output Gate: o_t = σ(W_o x_t + U_o h_{t-1} + b_o)
      let sum_o = weights.b_o[i];
      for (let j = 0; j < x.length; j++) sum_o += weights.W_o[i][j] * x[j];
      for (let j = 0; j < dim; j++) sum_o += weights.U_o[i][j] * h[j];
      o.push(sigmoid(sum_o));
    }

    // Update Cell State: c_t = f_t * c_{t-1} + i_t * c_tilde_t
    const next_c = [
      f[0] * c[0] + idx_g[0] * c_tilde[0],
      f[1] * c[1] + idx_g[1] * c_tilde[1]
    ];

    // Update Hidden State: h_t = o_t * tanh(c_t)
    const next_h = [
      o[0] * tanh(next_c[0]),
      o[1] * tanh(next_c[1])
    ];

    steps.push({
      hiddenState: next_h,
      cellState: next_c,
      forgetGate: f,
      inputGate: idx_g,
      outputGate: o
    });

    h = next_h;
    c = next_c;
  }

  return steps;
}

// Convert hidden states to a failure/degradation projection [0, 100]%
export function runLSTMInference(history: number[][]): { anomalyScore: number; steps: LSTMStepResult[] } {
  const steps = runLSTMRecurrence(history);
  if (steps.length === 0) return { anomalyScore: 0.15, steps };
  const lastStep = steps[steps.length - 1];
  // Map last hidden state [h0, h1] into anomaly score via linear projection
  const score = Math.max(0.01, Math.min(0.99, sigmoid(lastStep.hiddenState[0] * 2.5 + lastStep.hiddenState[1] * 1.8)));
  return { anomalyScore: score, steps };
}
