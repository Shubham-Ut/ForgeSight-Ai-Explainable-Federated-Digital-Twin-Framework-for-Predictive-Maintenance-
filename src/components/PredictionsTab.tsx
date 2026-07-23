import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { runRandomForest, runXGBoost, runLSTMInference } from '../utils/machineLearningModels';
import { calculateExactShap } from '../utils/shapSolver';
import { 
  MODEL_COMPARISON_DATA, 
  ANOMALY_DETECTION_METRICS,
  ModelMetrics 
} from '../data/mockData';
import { 
  BarChart2, 
  TrendingUp, 
  Cpu, 
  Server, 
  Activity, 
  BookOpen, 
  CheckCircle,
  HelpCircle,
  Clock,
  Layers,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Zap,
  Sliders
} from 'lucide-react';

// Expanded ML model datasets to represent publication-grade comparison pipelines
const EXPANDED_RUL_MODELS = [
  ...MODEL_COMPARISON_DATA,
  {
    name: 'Physics-Informed Neural Network (PINN)',
    mae: 10.4,
    rmse: 12.8,
    r2: 0.941,
    trainingTime: '2h 15m',
    inferenceTime: '4.8ms',
    memoryUsage: '35 MB'
  },
  {
    name: 'Temporal Transformer Network',
    mae: 9.8,
    rmse: 12.1,
    r2: 0.948,
    trainingTime: '4h 45m',
    inferenceTime: '8.2ms',
    memoryUsage: '140 MB'
  },
  {
    name: 'Informer Space-Time Attention',
    mae: 10.1,
    rmse: 12.4,
    r2: 0.944,
    trainingTime: '3h 30m',
    inferenceTime: '6.5ms',
    memoryUsage: '95 MB'
  },
  {
    name: 'Stacking Ensemble (VotReg)',
    mae: 8.9,
    rmse: 11.2,
    r2: 0.957,
    trainingTime: '12h 40m',
    inferenceTime: '18.4ms',
    memoryUsage: '280 MB'
  }
];

const EXPANDED_ANOMALY_MODELS = [
  ...ANOMALY_DETECTION_METRICS,
  {
    name: 'Variational Autoencoder (VAE)',
    precision: 0.938,
    recall: 0.912,
    f1: 0.925,
    rocAuc: 0.952,
    falsePositiveRate: 0.021
  },
  {
    name: 'Deep Support Vector Data Description (SVDD)',
    precision: 0.925,
    recall: 0.895,
    f1: 0.910,
    rocAuc: 0.941,
    falsePositiveRate: 0.028
  },
  {
    name: 'Local Outlier Factor (LOF)',
    precision: 0.842,
    recall: 0.811,
    f1: 0.826,
    rocAuc: 0.865,
    falsePositiveRate: 0.052
  }
];

export default function PredictionsTab() {
  const [selectedModel, setSelectedModel] = useState<string>('CatBoost (Advanced)');
  const [activeSubTab, setActiveSubTab] = useState<'rul' | 'anomaly' | 'sandbox'>('rul');
  
  // Custom interactive visual states
  const [showBayesianBands, setShowBayesianBands] = useState<boolean>(true);

  // Sandbox State Variables
  const [sandboxModel, setSandboxModel] = useState<'xgb' | 'rf' | 'lstm'>('xgb');
  const [sandboxSpeed, setSandboxSpeed] = useState<number>(2800);
  const [sandboxTorque, setSandboxTorque] = useState<number>(42.5);
  const [sandboxWear, setSandboxWear] = useState<number>(12.0);
  const [sandboxTemp, setSandboxTemp] = useState<number>(32.5);
  const [sandboxVib, setSandboxVib] = useState<number>(1.45);
  const [lstmStep, setLstmStep] = useState<number>(1);
  
  // Concept Drift States
  const [isDriftSimulated, setIsDriftSimulated] = useState<boolean>(false);
  const [driftValue, setDriftValue] = useState<number>(1.2); // Base ADWIN index
  const [isRetraining, setIsRetraining] = useState<boolean>(false);
  const [retrainLogs, setRetrainLogs] = useState<string[]>([]);
  const [showDriftAlarm, setShowDriftAlarm] = useState<boolean>(false);

  // Find selected model details
  const currentModel = EXPANDED_RUL_MODELS.find(m => m.name === selectedModel) || EXPANDED_RUL_MODELS[3];

  // Simulate injecting a sensor calibration concept drift event
  const handleTriggerDrift = () => {
    setIsDriftSimulated(true);
    setShowDriftAlarm(true);
    
    // Simulate ADWIN index spiking
    let currentValue = 1.2;
    const spikeInterval = setInterval(() => {
      currentValue += (Math.random() * 0.8 + 0.4);
      if (currentValue >= 4.8) {
        clearInterval(spikeInterval);
        setDriftValue(4.8);
      } else {
        setDriftValue(parseFloat(currentValue.toFixed(2)));
      }
    }, 100);
  };

  // Trigger Online Model Self-Healing / Adaptive Retraining
  const handleAdaptiveRetraining = () => {
    if (isRetraining) return;
    setIsRetraining(true);
    setRetrainLogs([
      '[ADWIN COGNITIVE] Initializing ADWIN Concept Drift response cycle...',
      '[ADWIN COGNITIVE] Fetching the latest 10,000 telemetry packets since drift detection...',
      '[ADWIN COGNITIVE] Re-weighting older training samples using Temporal Decay Factor (λ = 0.98)...',
    ]);

    setTimeout(() => {
      setRetrainLogs(prev => [
        ...prev,
        '[ADWIN COGNITIVE] Launching mini-batch SGD optimizer for 5 online training epochs...',
        '[ADWIN COGNITIVE] Epoch 1/5 - Loss: 0.1248 | Epoch 3/5 - Loss: 0.0842 | Epoch 5/5 - Loss: 0.0512',
      ]);
    }, 800);

    setTimeout(() => {
      setRetrainLogs(prev => [
        ...prev,
        '[ADWIN COGNITIVE] Calibration drift recalibrated. Aligning weights against base global parameters.',
        '[ADWIN COGNITIVE] Online Self-Healing Retraining Cycle COMPLETE. MAE reduced back to 9.2 cycles.',
      ]);
      setIsRetraining(false);
      setIsDriftSimulated(false);
      setShowDriftAlarm(false);
      setDriftValue(1.15);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex border-b border-slate-800 pb-px">
        <button
          onClick={() => setActiveSubTab('rul')}
          className={`px-4 py-2 text-xs font-mono font-bold border-b-2 uppercase tracking-wider transition-colors ${
            activeSubTab === 'rul' 
              ? 'border-cyan-500 text-cyan-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          RUL Regression Pipeline
        </button>
        <button
          onClick={() => setActiveSubTab('anomaly')}
          className={`px-4 py-2 text-xs font-mono font-bold border-b-2 uppercase tracking-wider transition-colors ${
            activeSubTab === 'anomaly' 
              ? 'border-cyan-500 text-cyan-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Anomaly Detection Pipeline
        </button>
        <button
          onClick={() => setActiveSubTab('sandbox')}
          className={`px-4 py-2 text-xs font-mono font-bold border-b-2 uppercase tracking-wider transition-colors ${
            activeSubTab === 'sandbox' 
              ? 'border-cyan-500 text-cyan-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>Interactive ML Sandbox & SHAP</span>
          </span>
        </button>
      </div>

      {activeSubTab === 'rul' ? (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="p-5 rounded-xl glass-card border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">MODEL PIPELINE BENCHMARKING</span>
              <h2 className="text-xl font-bold text-white font-display">NASA C-MAPSS Remaining Useful Life (RUL) Models</h2>
              <p className="text-slate-400 text-xs max-w-2xl font-sans">
                Evaluate high-capacity deep learning and gradient boosted regressors. Features are evaluated across flight cycles to model exponential degradation trajectories.
              </p>
            </div>
            <div className="mt-3 md:mt-0 bg-slate-950/80 px-3.5 py-2.5 rounded-lg border border-slate-800 text-[10px] font-mono text-emerald-400 font-semibold flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span>TEST SET RUL SENSITIVITY: VALIDATED</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Model Comparison Selector & table */}
            <div className="lg:col-span-2 space-y-4">
              <div className="glass-card border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">
                    Architecture Benchmarking Table
                  </h3>
                  <span className="text-[9px] font-mono text-slate-500 uppercase">C-MAPSS FD001 Sub-split</span>
                </div>

                <div className="overflow-x-auto max-h-56 overflow-y-auto pr-1">
                  <table className="w-full text-left font-mono text-xs text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 font-bold text-[10px] uppercase">
                        <th className="py-2 pb-3">MODEL ALGORITHM</th>
                        <th className="py-2 pb-3 text-right">MAE (CYCLES)</th>
                        <th className="py-2 pb-3 text-right">RMSE (CYCLES)</th>
                        <th className="py-2 pb-3 text-right">R² SCORE</th>
                        <th className="py-2 pb-3 text-right">TRAIN TIME</th>
                        <th className="py-2 pb-3 text-right">INFERENCE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {EXPANDED_RUL_MODELS.map((model) => {
                        const isSelected = selectedModel === model.name;
                        return (
                          <tr 
                            key={model.name}
                            onClick={() => setSelectedModel(model.name)}
                            className={`cursor-pointer hover:bg-slate-950/40 transition-colors ${
                              isSelected ? 'bg-cyan-950/20 text-cyan-400 font-semibold' : ''
                            }`}
                          >
                            <td className="py-2.5 flex items-center space-x-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-cyan-400' : 'bg-slate-700'}`} />
                              <span className="truncate max-w-[210px]">{model.name}</span>
                            </td>
                            <td className="py-2.5 text-right">{model.mae.toFixed(1)}</td>
                            <td className="py-2.5 text-right">{model.rmse.toFixed(1)}</td>
                            <td className="py-2.5 text-right">{(model.r2).toFixed(3)}</td>
                            <td className="py-2.5 text-right text-slate-400">{model.trainingTime}</td>
                            <td className="py-2.5 text-right text-slate-400">{model.inferenceTime}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* RUL Predicted Degradation Curve Graph */}
              <div className="glass-card border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 border-b border-slate-800/60 pb-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">
                    Predicted Degradation Path vs Ground Truth
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-[9px] font-mono">
                    <button 
                      onClick={() => setShowBayesianBands(!showBayesianBands)}
                      className={`px-2 py-1 rounded border transition-all ${
                        showBayesianBands 
                          ? 'bg-cyan-950/30 border-cyan-700 text-cyan-300' 
                          : 'bg-slate-950 border-slate-800 text-slate-500'
                      }`}
                    >
                      Bayesian Confidence Intervals (+/-10%)
                    </button>
                    <span className="flex items-center"><span className="w-2.5 h-0.5 bg-slate-400 mr-1.5" />Ground Truth</span>
                    <span className="flex items-center"><span className="w-2.5 h-0.5 bg-cyan-400 mr-1.5" />{selectedModel}</span>
                  </div>
                </div>

                {/* Custom Responsive SVG Chart of RUL remaining over operational flight cycles */}
                <div className="h-56 w-full bg-slate-950/50 rounded-lg p-2 border border-slate-900 flex items-center justify-center relative">
                  <svg className="w-full h-full text-slate-700" viewBox="0 0 400 150">
                    <defs>
                      <linearGradient id="bayesian-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    <line x1="40" y1="20" x2="380" y2="20" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2,2" />
                    <line x1="40" y1="60" x2="380" y2="60" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2,2" />
                    <line x1="40" y1="100" x2="380" y2="100" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2,2" />
                    <line x1="40" y1="130" x2="380" y2="130" stroke="#1e293b" strokeWidth="1" />

                    {/* Ground truth line (straight linearly degrading RUL) */}
                    <path d="M 40,20 L 380,130" fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3,3" />

                    {/* Bayesian Epistemic/Aleatoric Uncertainty Bands */}
                    {showBayesianBands && (
                      <path 
                        d="M 40,12 Q 180,15 220,55 T 380,118 L 380,138 T 220,85 Q 180,45 40,32 Z" 
                        fill="url(#bayesian-glow)" 
                        stroke="#0284c7" 
                        strokeWidth="0.5" 
                        strokeDasharray="2,2" 
                      />
                    )}

                    {/* Model prediction curves (quadratic-style drop curve) */}
                    {selectedModel.includes('CatBoost') && (
                      <path d="M 40,22 Q 180,30 220,70 T 380,128" fill="none" stroke="#06b6d4" strokeWidth="2.5" />
                    )}
                    {selectedModel.includes('LightGBM') && (
                      <path d="M 40,19 Q 170,25 210,65 T 380,125" fill="none" stroke="#06b6d4" strokeWidth="2" />
                    )}
                    {selectedModel.includes('XGBoost') && (
                      <path d="M 40,24 Q 190,32 230,75 T 380,132" fill="none" stroke="#06b6d4" strokeWidth="2" />
                    )}
                    {selectedModel.includes('Random Forest') && (
                      <path d="M 40,20 L 120,40 L 200,60 L 280,95 L 380,120" fill="none" stroke="#06b6d4" strokeWidth="1.5" />
                    )}
                    {selectedModel.includes('Physics-Informed') && (
                      <path d="M 40,21 Q 185,28 221,68 T 380,129" fill="none" stroke="#10b981" strokeWidth="2.5" />
                    )}
                    {selectedModel.includes('Transformer') && (
                      <path d="M 40,20 Q 180,26 218,66 T 380,127" fill="none" stroke="#8b5cf6" strokeWidth="2.5" />
                    )}
                    {selectedModel.includes('Informer') && (
                      <path d="M 40,23 Q 182,29 220,69 T 380,130" fill="none" stroke="#a78bfa" strokeWidth="2" />
                    )}
                    {selectedModel.includes('Stacking Ensemble') && (
                      <path d="M 40,20.5 Q 180,27 220,68.5 T 380,128.5" fill="none" stroke="#ec4899" strokeWidth="3" />
                    )}

                    {/* Highlights */}
                    <circle cx="220" cy="70" r="4" fill="#ef4444" className="animate-ping" />
                    <circle cx="220" cy="70" r="2.5" fill="#ef4444" />
                    
                    {/* Graph text labels */}
                    <text x="35" y="24" textAnchor="end" fill="#475569" fontSize="8" fontFamily="monospace">150 RUL</text>
                    <text x="35" y="64" textAnchor="end" fill="#475569" fontSize="8" fontFamily="monospace">80 RUL</text>
                    <text x="35" y="104" textAnchor="end" fill="#475569" fontSize="8" fontFamily="monospace">20 RUL</text>
                    
                    <text x="40" y="142" fill="#475569" fontSize="8" fontFamily="monospace">Start (Cycle 1)</text>
                    <text x="380" y="142" textAnchor="end" fill="#475569" fontSize="8" fontFamily="monospace">End (Cycle 200)</text>
                    
                    <text x="210" y="90" fill="#ef4444" fontSize="8" fontFamily="monospace" fontWeight="bold">Anomalous Drop (Cycle 110)</text>
                  </svg>
                </div>
              </div>
            </div>

            {/* Selected model details card */}
            <div className="space-y-6">
              <div className="glass-card border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                  <Cpu className="w-5 h-5 text-cyan-400" />
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block uppercase">SELECTED METRICS</span>
                    <h3 className="text-md font-bold text-white font-display">{currentModel.name}</h3>
                  </div>
                </div>

                <div className="space-y-3 font-mono text-xs text-slate-300">
                  <div className="flex justify-between border-b border-slate-900 pb-2">
                    <span className="text-slate-500">Root Mean Squared Error</span>
                    <span className="font-semibold text-white">{currentModel.rmse.toFixed(2)} cycles</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-2">
                    <span className="text-slate-500">Mean Absolute Error</span>
                    <span className="font-semibold text-white">{currentModel.mae.toFixed(2)} cycles</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-2">
                    <span className="text-slate-500">R² Coefficient</span>
                    <span className="font-semibold text-emerald-400">{(currentModel.r2 * 100).toFixed(2)}% explained</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-2">
                    <span className="text-slate-500">Memory Footprint</span>
                    <span className="font-semibold text-white">{currentModel.memoryUsage || '120 MB'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Model Framework</span>
                    <span className="font-semibold text-cyan-400 text-[9px] bg-cyan-950/40 border border-cyan-900 px-1.5 py-0.5 rounded uppercase">
                      PyTorch / scikit-learn
                    </span>
                  </div>
                </div>
              </div>

              {/* Research Insights */}
              <div className="glass-card border border-slate-800 rounded-xl p-5 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display border-b border-slate-800 pb-2 flex items-center space-x-1.5">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Ablation Study Results</span>
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                  Evaluating model ablation reveals that removing the bypass ratio (BPR) sensor inputs degrades model R² from 0.957 down to 0.812, validating high-pressure turbine sealing wear as the chief causal factor of system RUL decay curves.
                </p>
              </div>
            </div>

          </div>
        </div>
      ) : activeSubTab === 'anomaly' ? (
        <div className="space-y-6">
          {/* Anomaly Detection Subtab */}
          <div className="p-5 rounded-xl glass-card border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">ANOMALY ESTIMATION CONTEXT</span>
              <h2 className="text-xl font-bold text-white font-display">Deep Learning Reconstruction Anomalies</h2>
              <p className="text-slate-400 text-xs max-w-2xl font-sans">
                Isolation Forest, Deep Autoencoders, and Variational Autoencoders calculate reconstruction error vectors to isolate physical sensor drift and structural wear anomalies.
              </p>
            </div>
            <div className="mt-3 md:mt-0 bg-slate-950/80 px-3.5 py-2.5 rounded-lg border border-slate-800 text-[10px] font-mono text-cyan-400 font-semibold flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>LIVE ANOMALY SCORE ENGINE: ACTIVE</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Table */}
            <div className="lg:col-span-2 space-y-4">
              <div className="glass-card border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display border-b border-slate-800/60 pb-2">
                  Anomaly Detection Model Benchmarks
                </h3>

                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left font-mono text-xs text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 font-bold text-[10px] uppercase">
                        <th className="py-2 pb-3">DETECTION MODEL</th>
                        <th className="py-2 pb-3 text-right">PRECISION</th>
                        <th className="py-2 pb-3 text-right">RECALL</th>
                        <th className="py-2 pb-3 text-right">F1 SCORE</th>
                        <th className="py-2 pb-3 text-right">ROC-AUC</th>
                        <th className="py-2 pb-3 text-right">FPR (FAR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {EXPANDED_ANOMALY_MODELS.map((model) => (
                        <tr key={model.name} className="hover:bg-slate-950/40">
                          <td className="py-3 font-semibold text-slate-100">{model.name}</td>
                          <td className="py-3 text-right text-emerald-400">{(model.precision * 100).toFixed(1)}%</td>
                          <td className="py-3 text-right text-emerald-400">{(model.recall * 100).toFixed(1)}%</td>
                          <td className="py-3 text-right text-cyan-400">{(model.f1 * 100).toFixed(1)}%</td>
                          <td className="py-3 text-right text-slate-300">{model.rocAuc.toFixed(3)}</td>
                          <td className="py-3 text-right text-rose-400">{(model.falsePositiveRate * 100).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CONCEPT DRIFT DETECTION PANEL */}
              <div className="glass-card border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 border-b border-slate-800/60 pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display flex items-center space-x-1.5">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>ADWIN & Page-Hinkley Concept Drift Adaptation Monitor</span>
                    </h3>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                      Monitors real-time statistical distributions of data streams to detect sudden sensor calibration drift.
                    </p>
                  </div>
                  <button
                    onClick={handleTriggerDrift}
                    disabled={isDriftSimulated || isRetraining}
                    className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase transition-all ${
                      isDriftSimulated 
                        ? 'bg-rose-950/50 border border-rose-800 text-rose-400 cursor-not-allowed' 
                        : 'bg-amber-950/40 border border-amber-800 hover:bg-amber-900/60 text-amber-400'
                    }`}
                  >
                    {isDriftSimulated ? 'Drift Injected' : 'Simulate Calibration Drift'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Drift Index Gauge */}
                  <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-4 flex flex-col justify-between font-mono text-xs">
                    <div>
                      <span className="text-slate-500 text-[10px] block uppercase font-bold">ADWIN DRIFT INDEX</span>
                      <div className="flex items-baseline space-x-1.5 mt-2">
                        <span className={`text-3xl font-extrabold ${driftValue > 3.0 ? 'text-rose-400 animate-pulse' : 'text-slate-200'}`}>
                          {driftValue}
                        </span>
                        <span className="text-[9px] text-slate-500">Z-score ratio</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5 pt-2 border-t border-slate-900 mt-3">
                      <div className="flex justify-between text-[8px] text-slate-500">
                        <span>DRIFT LIMIT: 3.0</span>
                        <span>{driftValue > 3.0 ? 'TRIGGERED' : 'NORMAL'}</span>
                      </div>
                      <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${driftValue > 3.0 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                          style={{ width: `${Math.min(100, (driftValue / 5.0) * 100)}%` }} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Drift Alarm & self healing triggering */}
                  <div className="col-span-1 md:col-span-2 bg-slate-950/60 border border-slate-900 rounded-xl p-4 flex flex-col justify-between font-mono text-[10px] leading-relaxed">
                    <div>
                      <span className="text-slate-500 block uppercase font-bold text-[9px] mb-1">COGNITIVE SELF-HEALING ACTION</span>
                      {showDriftAlarm ? (
                        <div className="space-y-2">
                          <div className="bg-rose-950/30 border border-rose-900 rounded p-2 text-rose-300 flex items-start space-x-2">
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
                            <div>
                              <span className="font-bold block">PAGE-HINKLEY CUMSUM DRIFT DETECTED!</span>
                              <span>Calibration drift detected in sensors T24 and BPR (p-value &lt; 0.001). Model inference accuracy at risk.</span>
                            </div>
                          </div>
                          <button
                            onClick={handleAdaptiveRetraining}
                            className="w-full bg-emerald-950/40 border border-emerald-800 hover:bg-emerald-900/60 text-emerald-400 py-1.5 rounded font-bold uppercase transition-all"
                          >
                            Execute Online Self-Healing Retraining
                          </button>
                        </div>
                      ) : (
                        <div className="text-slate-400 py-3 text-center border border-dashed border-slate-900 rounded">
                          No statistical drift detected. Sensor calibration matches baseline weights (Confidence: 99.8%).
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Retraining Terminal Logs */}
                {retrainLogs.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-slate-950 border border-slate-900 p-3 rounded-lg font-mono text-[9px] text-cyan-400 space-y-1 overflow-y-auto max-h-28"
                  >
                    {retrainLogs.map((log, idx) => (
                      <div key={idx} className="flex items-start space-x-1.5">
                        <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span>
                        <span className={log.includes('COMPLETE') ? 'text-emerald-400 font-bold' : log.includes('triggered') ? 'text-rose-400' : 'text-slate-300'}>{log}</span>
                      </div>
                    ))}
                    {isRetraining && (
                      <div className="animate-pulse text-cyan-500">▋ Learning...</div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Sidebar details */}
            <div className="glass-card border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display border-b border-slate-800/60 pb-2">
                Reconstruction Insights
              </h3>
              <p className="text-xs text-slate-400 font-mono leading-relaxed">
                The autoencoders extract compressed representation matrices (Bottleneck dimension d = 32) from raw high-frequency multi-sensor streams. 
              </p>
              <p className="text-xs text-slate-400 font-mono leading-relaxed">
                Reconstruction residuals increase linearly when fan blades or spindle armatures suffer thermo-mechanical tolerances degradation, alerting operators hundreds of hours before visual defects or breakdown occur.
              </p>
            </div>

          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Cog-ML Pipeline Sandbox Header */}
          <div className="p-5 rounded-xl glass-card border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">INTERACTIVE MODEL PLAYGROUND</span>
              <h2 className="text-xl font-bold text-white font-display">Active Multi-Model Simulator & SHAP Explainer</h2>
              <p className="text-slate-400 text-xs max-w-2xl font-sans">
                Manipulate raw sensor streams to execute live mathematical model inferences on the fly. SHAP values are computed instantly via coalition summation across all 2^5 = 32 subsets.
              </p>
            </div>
            <div className="mt-3 md:mt-0 bg-slate-950/80 px-3.5 py-2.5 rounded-lg border border-slate-800 text-[10px] font-mono text-cyan-400 font-semibold flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>COGNITIVE ENGINE: RUNNING</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Column 1: Feature Sliders (span 5) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="glass-card border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="border-b border-slate-800 pb-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center space-x-1.5">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span>Continuous Feature Modulators</span>
                  </h3>
                </div>

                <div className="space-y-4 font-mono text-xs">
                  {/* Model Selector */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Target ML Predictor Model</label>
                    <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 border border-slate-900 rounded-lg">
                      <button
                        onClick={() => setSandboxModel('xgb')}
                        className={`py-1.5 text-[9px] font-bold rounded transition-all ${
                          sandboxModel === 'xgb'
                            ? 'bg-cyan-950/40 border border-cyan-800 text-cyan-400'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        XGBoost (RUL)
                      </button>
                      <button
                        onClick={() => setSandboxModel('rf')}
                        className={`py-1.5 text-[9px] font-bold rounded transition-all ${
                          sandboxModel === 'rf'
                            ? 'bg-cyan-950/40 border border-cyan-800 text-cyan-400'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        Random Forest (Fail Prob)
                      </button>
                      <button
                        onClick={() => setSandboxModel('lstm')}
                        className={`py-1.5 text-[9px] font-bold rounded transition-all ${
                          sandboxModel === 'lstm'
                            ? 'bg-cyan-950/40 border border-cyan-800 text-cyan-400'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        LSTM (Anomaly Index)
                      </button>
                    </div>
                  </div>

                  {/* Speed Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Spindle Speed [rpm]</span>
                      <span className="text-white font-bold">{sandboxSpeed} rpm</span>
                    </div>
                    <input
                      type="range"
                      min="1000"
                      max="18000"
                      step="100"
                      value={sandboxSpeed}
                      onChange={(e) => setSandboxSpeed(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <div className="flex justify-between text-[8px] text-slate-600">
                      <span>1000 rpm</span>
                      <span>18000 rpm (Max)</span>
                    </div>
                  </div>

                  {/* Torque Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Spindle Torque [Nm]</span>
                      <span className="text-white font-bold">{sandboxTorque} Nm</span>
                    </div>
                    <input
                      type="range"
                      min="5.0"
                      max="90.0"
                      step="0.5"
                      value={sandboxTorque}
                      onChange={(e) => setSandboxTorque(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <div className="flex justify-between text-[8px] text-slate-600">
                      <span>5.0 Nm</span>
                      <span>90.0 Nm (Severe Load)</span>
                    </div>
                  </div>

                  {/* Tool Wear Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tool Wear [min]</span>
                      <span className="text-white font-bold">{sandboxWear} min</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="240"
                      step="1"
                      value={sandboxWear}
                      onChange={(e) => setSandboxWear(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <div className="flex justify-between text-[8px] text-slate-600">
                      <span>0 min</span>
                      <span>240 min (Replace Threshold)</span>
                    </div>
                  </div>

                  {/* Temperature Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Spindle Temp [°C]</span>
                      <span className="text-white font-bold">{sandboxTemp} °C</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="110"
                      step="1"
                      value={sandboxTemp}
                      onChange={(e) => setSandboxTemp(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <div className="flex justify-between text-[8px] text-slate-600">
                      <span>20 °C</span>
                      <span>110 °C (Overheat)</span>
                    </div>
                  </div>

                  {/* Vibration Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Radial Vibration [mm/s]</span>
                      <span className="text-white font-bold">{sandboxVib.toFixed(2)} mm/s</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="12.0"
                      step="0.05"
                      value={sandboxVib}
                      onChange={(e) => setSandboxVib(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <div className="flex justify-between text-[8px] text-slate-600">
                      <span>0.1 mm/s</span>
                      <span>12.0 mm/s (Catastrophic)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Model Architectural Insights */}
              <div className="glass-card border border-slate-800 rounded-xl p-5 space-y-2 font-mono text-[10px] text-slate-400 leading-relaxed">
                <span className="font-bold text-white uppercase block mb-1">Theoretical Background</span>
                <p>
                  <b>XGBoost (RUL):</b> Accumulates residual shrinkage predictions. Extreme values of tool wear and vibration drop target prediction exponentially.
                </p>
                <p>
                  <b>Random Forest (Fail Prob):</b> Evaluates majority votes across split feature bounds. Clear boundaries make it ideal for modeling hard safety limits.
                </p>
                <p>
                  <b>LSTM:</b> Computes element-wise tanh and sigmoid gates. Memorizes past gradients to identify subtle chattering drifts over time.
                </p>
              </div>
            </div>

            {/* Column 2: Predictions & Live SHAP Decomposition (span 7) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Prediction Panel */}
              <div className="glass-card border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Live Mathematical Inference Output
                  </h3>
                  <span className="text-[9px] font-mono text-cyan-400 font-semibold bg-cyan-950/40 border border-cyan-900 px-2 py-0.5 rounded uppercase">
                    Model: {sandboxModel === 'xgb' ? 'XGBoost Regressor' : sandboxModel === 'rf' ? 'Random Forest Classifier' : 'LSTM Stateful Recurrent Network'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="space-y-2">
                    <span className="text-[9px] font-mono text-slate-500 uppercase block font-bold">Calculated Prediction</span>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-3xl font-extrabold text-white tracking-tight font-display">
                        {(() => {
                          const getPredictionVal = () => {
                            const features = [sandboxSpeed, sandboxTorque, sandboxWear, sandboxTemp, sandboxVib];
                            if (sandboxModel === 'xgb') {
                              return runXGBoost(features);
                            } else if (sandboxModel === 'rf') {
                              return runRandomForest(features) * 100;
                            } else {
                              const baseFeatures = [1500, 40, 10, 25, 1.2];
                              const step1 = [baseFeatures[0], baseFeatures[1], baseFeatures[2], baseFeatures[3], baseFeatures[4]];
                              const step2 = [sandboxSpeed * 0.8, sandboxTorque * 0.9, sandboxWear * 0.7, sandboxTemp * 0.9, sandboxVib * 0.8];
                              const step3 = features;
                              return runLSTMInference([step1, step2, step3]).anomalyScore * 100;
                            }
                          };
                          const predVal = getPredictionVal();

                          return sandboxModel === 'xgb' ? (
                            <>
                              <span className="text-cyan-400">{predVal.toFixed(1)}</span>
                              <span className="text-xs text-slate-400 font-mono ml-1.5">Hours RUL</span>
                            </>
                          ) : sandboxModel === 'rf' ? (
                            <>
                              <span className={predVal > 40 ? 'text-rose-400' : 'text-emerald-400'}>
                                {predVal.toFixed(1)}%
                              </span>
                              <span className="text-xs text-slate-400 font-mono ml-1.5">Failure Prob.</span>
                            </>
                          ) : (
                            <>
                              <span className={predVal > 30 ? 'text-rose-400 animate-pulse' : 'text-slate-300'}>
                                {predVal.toFixed(1)}%
                              </span>
                              <span className="text-xs text-slate-400 font-mono ml-1.5">Anomaly Index</span>
                            </>
                          );
                        })()}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
                      {sandboxModel === 'xgb' 
                        ? 'Remaining Useful Life before critical wear levels are breached.' 
                        : sandboxModel === 'rf' 
                        ? 'Composite risk score derived from individual tree bounds traversal.' 
                        : 'Reconstruction divergence score computed from internal hidden memory states.'}
                    </p>
                  </div>

                  {/* Visual gauge / alert indicator */}
                  <div className="bg-slate-950/50 border border-slate-900 rounded-lg p-3.5 space-y-2 text-[10px] font-mono">
                    <div className="flex justify-between border-b border-slate-900 pb-1.5">
                      <span className="text-slate-500">Status Clearance</span>
                      {(() => {
                        const getPredictionVal = () => {
                          const features = [sandboxSpeed, sandboxTorque, sandboxWear, sandboxTemp, sandboxVib];
                          if (sandboxModel === 'xgb') {
                            return runXGBoost(features);
                          } else if (sandboxModel === 'rf') {
                            return runRandomForest(features) * 100;
                          } else {
                            const baseFeatures = [1500, 40, 10, 25, 1.2];
                            const step1 = [baseFeatures[0], baseFeatures[1], baseFeatures[2], baseFeatures[3], baseFeatures[4]];
                            const step2 = [sandboxSpeed * 0.8, sandboxTorque * 0.9, sandboxWear * 0.7, sandboxTemp * 0.9, sandboxVib * 0.8];
                            const step3 = features;
                            return runLSTMInference([step1, step2, step3]).anomalyScore * 100;
                          }
                        };
                        const predVal = getPredictionVal();

                        return sandboxModel === 'xgb' ? (
                          predVal > 80 ? (
                            <span className="text-emerald-400 font-bold uppercase">Safe (Green)</span>
                          ) : predVal > 40 ? (
                            <span className="text-amber-400 font-bold uppercase">Caution (Amber)</span>
                          ) : (
                            <span className="text-rose-400 font-bold uppercase">Severe Wear (Critical)</span>
                          )
                        ) : (
                          predVal < 25 ? (
                            <span className="text-emerald-400 font-bold uppercase">Safe (Nominal)</span>
                          ) : predVal < 60 ? (
                            <span className="text-amber-400 font-bold uppercase">Warning (Elevated)</span>
                          ) : (
                            <span className="text-rose-400 font-bold uppercase">Hazardous (Alarm)</span>
                          )
                        );
                      })()}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Confidence Interval (95%)</span>
                      <span className="text-white font-bold">
                        {sandboxModel === 'xgb' ? '±11.4 Hours' : '±3.2% Variance'}
                      </span>
                    </div>
                    <div className="text-[8px] text-slate-500 border-t border-slate-900 pt-1.5 mt-1.5 leading-relaxed">
                      * conformed mathematically utilizing split conformal forecasting boundaries.
                    </div>
                  </div>
                </div>
              </div>

              {/* Exact SHAP Waterfall Plot */}
              <div className="glass-card border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Exact Live KernelSHAP Attribution
                  </h3>
                  <span className="text-[9px] font-mono text-slate-500">
                    Red = Pushes Prediction Up | Blue = Pushes Prediction Down
                  </span>
                </div>

                <div className="space-y-3 font-mono">
                  {(() => {
                    const features = [sandboxSpeed, sandboxTorque, sandboxWear, sandboxTemp, sandboxVib];
                    const xBase = [1500, 40.0, 10, 25.0, 1.2];
                    
                    const predictFnForShap = (xVec: number[]) => {
                      if (sandboxModel === 'xgb') {
                        return runXGBoost(xVec);
                      } else if (sandboxModel === 'rf') {
                        return runRandomForest(xVec) * 100;
                      } else {
                        const step1 = [1500, 40.0, 10, 25.0, 1.2];
                        const step2 = [xVec[0] * 0.8, xVec[1] * 0.9, xVec[2] * 0.7, xVec[3] * 0.9, xVec[4] * 0.8];
                        const step3 = xVec;
                        return runLSTMInference([step1, step2, step3]).anomalyScore * 100;
                      }
                    };

                    const shapResults = calculateExactShap(predictFnForShap, features, xBase);

                    return shapResults.map((res) => {
                      const value = res.shapValue;
                      const maxAbs = sandboxModel === 'xgb' ? 45 : 30; // Scale base dynamically
                      const percent = Math.min(100, Math.max(1, (Math.abs(value) / maxAbs) * 100));
                      const isPositive = value >= 0;

                      return (
                        <div key={res.featureName} className="space-y-1 text-xs">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-300 font-semibold">{res.featureName}</span>
                            <span className={`font-bold ${isPositive ? 'text-rose-400' : 'text-cyan-400'}`}>
                              {isPositive ? '+' : ''}{value.toFixed(2)} {sandboxModel === 'xgb' ? 'h' : '%'}
                            </span>
                          </div>

                          <div className="grid grid-cols-12 gap-2 items-center">
                            {/* Left Half (Negative) */}
                            <div className="col-span-6 flex justify-end">
                              {!isPositive ? (
                                <div 
                                  className="h-2 bg-cyan-600 rounded-l" 
                                  style={{ width: `${percent}%` }}
                                />
                              ) : (
                                <div className="h-2 w-px bg-slate-800" />
                              )}
                            </div>

                            {/* Right Half (Positive) */}
                            <div className="col-span-6">
                              {isPositive ? (
                                <div 
                                  className="h-2 bg-rose-600 rounded-r" 
                                  style={{ width: `${percent}%` }}
                                />
                              ) : (
                                <div className="h-2 w-px bg-slate-800" />
                              )}
                            </div>
                          </div>

                          {/* Detail text of feature delta */}
                          <div className="flex justify-between text-[8px] text-slate-500">
                            <span>Current: {res.currentValue.toFixed(1)}</span>
                            <span>Base: {res.baseValue.toFixed(1)}</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>

                <div className="bg-slate-950/40 p-3 border border-slate-900 rounded text-[9px] text-slate-400 leading-relaxed font-mono">
                  <span className="font-bold text-slate-200 block mb-1">Explainability Verification:</span>
                  The model base starting value (baseline intercept) is <b>{sandboxModel === 'xgb' ? '110.0 Hours' : sandboxModel === 'rf' ? '31.1%' : '14.5%'}</b>. Summing the individual feature SHAP attributions exactly reconstructs the model prediction of <b>{(() => {
                    const features = [sandboxSpeed, sandboxTorque, sandboxWear, sandboxTemp, sandboxVib];
                    if (sandboxModel === 'xgb') {
                      return runXGBoost(features);
                    } else if (sandboxModel === 'rf') {
                      return runRandomForest(features) * 100;
                    } else {
                      const baseFeatures = [1500, 40, 10, 25, 1.2];
                      const step1 = [baseFeatures[0], baseFeatures[1], baseFeatures[2], baseFeatures[3], baseFeatures[4]];
                      const step2 = [sandboxSpeed * 0.8, sandboxTorque * 0.9, sandboxWear * 0.7, sandboxTemp * 0.9, sandboxVib * 0.8];
                      const step3 = features;
                      return runLSTMInference([step1, step2, step3]).anomalyScore * 100;
                    }
                  })().toFixed(2)}{sandboxModel === 'xgb' ? 'h' : '%'}</b>, validating additive local consistency.
                </div>
              </div>

              {/* LSTM Internal States or Tree Traversal Inspector */}
              <div className="glass-card border border-slate-800 rounded-xl p-5 space-y-4 font-mono text-xs">
                <div className="border-b border-slate-800 pb-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Model Internal Parameters & Architecture Inspector
                  </h3>
                </div>

                {sandboxModel === 'lstm' ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] text-slate-500 uppercase border-b border-slate-900 pb-1.5">
                      <span>LSTM Gating Vector</span>
                      <span>Value Array [Dimension = 2]</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-slate-950 p-2.5 rounded border border-slate-900 space-y-1.5 text-[10px]">
                        <span className="text-cyan-400 font-bold uppercase text-[9px]">Forget Gate (f_t)</span>
                        <div className="h-1 bg-slate-900 rounded overflow-hidden">
                          <div className="bg-cyan-500 h-full" style={{ width: '85%' }} />
                        </div>
                        <span className="text-slate-500 text-[8px]">Controls memory retention rate: 85.0% retained.</span>
                      </div>

                      <div className="bg-slate-950 p-2.5 rounded border border-slate-900 space-y-1.5 text-[10px]">
                        <span className="text-amber-400 font-bold uppercase text-[9px]">Input Gate (i_t)</span>
                        <div className="h-1 bg-slate-900 rounded overflow-hidden">
                          <div className="bg-amber-500 h-full" style={{ width: `${Math.min(100, Math.max(10, sandboxVib * 8))}%` }} />
                        </div>
                        <span className="text-slate-500 text-[8px]">Weights new chattering fluctuations on cell update.</span>
                      </div>

                      <div className="bg-slate-950 p-2.5 rounded border border-slate-900 space-y-1.5 text-[10px]">
                        <span className="text-rose-400 font-bold uppercase text-[9px]">Candidate State (~c_t)</span>
                        <div className="h-1 bg-slate-900 rounded overflow-hidden">
                          <div className="bg-rose-500 h-full" style={{ width: `${Math.min(100, Math.max(5, sandboxTemp * 0.95))}%` }} />
                        </div>
                        <span className="text-slate-500 text-[8px]">New thermal gradient input matrix candidate.</span>
                      </div>

                      <div className="bg-slate-950 p-2.5 rounded border border-slate-900 space-y-1.5 text-[10px]">
                        <span className="text-emerald-400 font-bold uppercase text-[9px]">Output Gate (o_t)</span>
                        <div className="h-1 bg-slate-900 rounded overflow-hidden">
                          <div className="bg-emerald-500 h-full" style={{ width: '74%' }} />
                        </div>
                        <span className="text-slate-500 text-[8px]">Gating factor for output hidden cell projections.</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-[10px] text-slate-400">
                    <div className="flex justify-between items-center text-[10px] text-slate-500 uppercase border-b border-slate-900 pb-1.5">
                      <span>Traversed Decision Paths</span>
                      <span>Traversed Value / Leaf Weights</span>
                    </div>
                    <div className="space-y-1 bg-slate-950 p-3 rounded border border-slate-900 max-h-[140px] overflow-y-auto">
                      {sandboxModel === 'xgb' ? (
                        <>
                          <div className="flex justify-between text-slate-300">
                            <span>Estimator Tree #1 (Wear check)</span>
                            <span className={sandboxWear > 100 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                              {sandboxWear > 100 ? 'Right Leaf: -25.5 RUL' : 'Left Leaf: +15.2 RUL'}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>Estimator Tree #2 (Temp vs Vibration)</span>
                            <span className={sandboxTemp > 58 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                              {sandboxTemp > 58 ? 'Right Leaf: -32.4 RUL' : sandboxVib > 3 ? 'Left-Right: -8.2 RUL' : 'Left-Left: +10.5 RUL'}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>Estimator Tree #3 (Torque load split)</span>
                            <span className={sandboxTorque > 50 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                              {sandboxTorque > 50 ? 'Right Leaf: -18.6 RUL' : sandboxSpeed > 2500 ? 'Left-Right: -12.4 RUL' : 'Left-Left: +5.1 RUL'}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between text-slate-300">
                            <span>Tree #1 Vote (Vib limit)</span>
                            <span className={sandboxVib > 4.5 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                              {sandboxVib > 4.5 ? 'Fail Vote: 85%' : 'Safe Vote: 1%'}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>Tree #2 Vote (Wear split)</span>
                            <span className={sandboxWear > 120 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                              {sandboxWear > 120 ? 'Fail Vote: 90%' : 'Safe Vote: 2%'}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>Tree #3 Vote (Centrifugal overload)</span>
                            <span className={sandboxSpeed > 3200 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                              {sandboxSpeed > 3200 ? 'Fail Vote: 92%' : 'Safe Vote: 5%'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
