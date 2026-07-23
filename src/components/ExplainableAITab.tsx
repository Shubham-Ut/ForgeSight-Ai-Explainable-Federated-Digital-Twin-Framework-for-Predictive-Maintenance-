import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShapExplainer, MachineDigitalTwin } from '../types';
import { 
  Shield, 
  HelpCircle, 
  ArrowRight, 
  ChevronRight, 
  Zap, 
  TrendingUp, 
  Info,
  Sliders,
  AlertTriangle,
  RotateCw,
  Sparkles,
  GitCommit,
  Network,
  Activity,
  CheckCircle,
  BarChart2
} from 'lucide-react';

interface ExplainableAITabProps {
  activeTwin: MachineDigitalTwin;
  getShapFeatures: () => ShapExplainer[];
}

interface CausalNode {
  id: string;
  name: string;
  category: string;
  coefficient: number;
  probability: number;
  description: string;
  x: number;
  y: number;
}

const CAUSAL_NODES: CausalNode[] = [
  {
    id: 'lube',
    name: 'Lubrication Starvation',
    category: 'Operational Antecedent',
    coefficient: 0.28,
    probability: 21,
    description: 'Sliding boundary film collapse. Micro-particulate debris causes abrasive shearing at contact surfaces.',
    x: 80,
    y: 50
  },
  {
    id: 'align',
    name: 'Rotor Misalignment',
    category: 'Geometric Deviance',
    coefficient: 0.15,
    probability: 15,
    description: 'Angular shaft offset. Generates persistent asymmetric radial forces and high centrifugal load stress.',
    x: 80,
    y: 170
  },
  {
    id: 'wear',
    name: 'Main Axis Bearings Wear',
    category: 'Mechanical Degradation',
    coefficient: 0.68,
    probability: 68,
    description: 'Primary Root Cause. Outer-race pitting and micro-cracking generate acoustic emission chattering.',
    x: 230,
    y: 110
  },
  {
    id: 'vib',
    name: 'Radial Vibration Surge',
    category: 'Dynamic Phenomenon',
    coefficient: 0.55,
    probability: 58,
    description: 'High-frequency vibration. Accelerates structural micro-fractures in surrounding mounts and spindles.',
    x: 380,
    y: 50
  },
  {
    id: 'cool',
    name: 'Coolant Flow Blockage',
    category: 'Thermal Antecedent',
    coefficient: 0.35,
    probability: 11,
    description: 'Nozzle micro-channel clogging. Drastically reduces heat absorption and induces high thermal expansion stress.',
    x: 230,
    y: 190
  },
  {
    id: 'thermal',
    name: 'Core Thermal Runaway',
    category: 'Thermal Phenomenon',
    coefficient: 0.52,
    probability: 45,
    description: 'Thermal expansion creep. Restricts operational clearances and leads to mechanical armature locking risks.',
    x: 380,
    y: 170
  }
];

export default function ExplainableAITab({ activeTwin, getShapFeatures }: ExplainableAITabProps) {
  const [activePlotTab, setActivePlotTab] = useState<'waterfall' | 'importance' | 'dependence' | 'causal'>('waterfall');
  const [selectedFeature, setSelectedFeature] = useState<string>('Rotational Speed [rpm]');
  const [selectedCausalNodeId, setSelectedCausalNodeId] = useState<string>('wear');

  const shapFeatures = getShapFeatures();
  
  // Base value (e.g., standard starting RUL of a brand-new engine)
  const baseValue = 110; // XGBOOST_BASE_SCORE is 110.0
  // Current predicted RUL
  const finalPrediction = activeTwin?.predictedRUL || 110;

  // Dynamic Waterfall Calculation
  const maxCycles = 180;
  const graphWidth = 340; // from x=100 to x=440
  const xScale = graphWidth / maxCycles; // pixels per cycle
  
  let currentCycles = baseValue;
  
  const waterfallSteps = shapFeatures.map((feat, idx) => {
    const val = feat.shapValue; // positive means pushes toward failure (decreases RUL)
    const startCycles = currentCycles;
    const endCycles = Math.max(0, Math.min(maxCycles, currentCycles - val));
    
    const res = {
      name: feat.featureName.split(' ')[0], // short name
      fullName: feat.featureName,
      val: -val, // negative effect on RUL
      startX: 100 + startCycles * xScale,
      endX: 100 + endCycles * xScale,
      y: 55 + idx * 30
    };
    currentCycles = endCycles;
    return res;
  });

  const activeCausalNode = CAUSAL_NODES.find(n => n.id === selectedCausalNodeId) || CAUSAL_NODES[2];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="p-5 rounded-xl glass-card border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">LOCALIZED ATTRIBUTION FRAMEWORK</span>
          </div>
          <h2 className="text-xl font-bold text-white font-display">Explainable AI (KernelSHAP & Causal Networks)</h2>
          <p className="text-slate-400 text-xs max-w-2xl font-sans">
            Deconstruct model decisions in real-time. SHAP values calculate the additive impact of each sensor reading, while our Causal Network traces Bayesian dependency paths to isolate failure originations.
          </p>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg shrink-0">
          Workstation: <b className="text-white">{activeTwin?.metadata.name}</b>
        </span>
      </div>

      {/* Plot Selector Tabs */}
      <div className="flex border-b border-slate-800 pb-px">
        <button
          onClick={() => setActivePlotTab('waterfall')}
          className={`px-4 py-2 text-xs font-mono font-bold border-b-2 uppercase tracking-wider transition-colors ${
            activePlotTab === 'waterfall' 
              ? 'border-cyan-500 text-cyan-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          SHAP Waterfall Plot
        </button>
        <button
          onClick={() => setActivePlotTab('causal')}
          className={`px-4 py-2 text-xs font-mono font-bold border-b-2 uppercase tracking-wider transition-colors ${
            activePlotTab === 'causal' 
              ? 'border-cyan-500 text-cyan-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Causal Root Cause Graph
        </button>
        <button
          onClick={() => setActivePlotTab('importance')}
          className={`px-4 py-2 text-xs font-mono font-bold border-b-2 uppercase tracking-wider transition-colors ${
            activePlotTab === 'importance' 
              ? 'border-cyan-500 text-cyan-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Global Feature Importance
        </button>
        <button
          onClick={() => setActivePlotTab('dependence')}
          className={`px-4 py-2 text-xs font-mono font-bold border-b-2 uppercase tracking-wider transition-colors ${
            activePlotTab === 'dependence' 
              ? 'border-cyan-500 text-cyan-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Partial Dependence Plot
        </button>
      </div>

      {activePlotTab === 'waterfall' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Interactive SHAP Waterfall Schematic */}
          <div className="lg:col-span-2 glass-card border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">
                SHAP Local Attribution Waterfall (Starting Base: {baseValue} Cycles)
              </h3>
              <span className="text-[9px] font-mono text-slate-500">
                Red = Decreases RUL | Cyan = Increases RUL (Healthy)
              </span>
            </div>

            {/* Waterfall Diagram Renderer using responsive SVG */}
            <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 flex flex-col items-center">
              <svg className="w-full max-w-xl h-auto animate-fade-in" viewBox="0 0 500 240">
                <line x1="80" y1="20" x2="460" y2="20" stroke="#111827" strokeWidth="1" />
                <line x1="80" y1="220" x2="460" y2="220" stroke="#111827" strokeWidth="1" />
                
                <line x1="100" y1="20" x2="100" y2="220" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="220" y1="20" x2="220" y2="220" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="340" y1="20" x2="340" y2="220" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="440" y1="20" x2="440" y2="220" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />

                <text x="100" y="232" textAnchor="middle" fill="#475569" fontSize="8" fontFamily="monospace">0 Cycles</text>
                <text x="220" y="232" textAnchor="middle" fill="#475569" fontSize="8" fontFamily="monospace">60 Cycles</text>
                <text x="340" y="232" textAnchor="middle" fill="#475569" fontSize="8" fontFamily="monospace">120 Cycles</text>
                <text x="440" y="232" textAnchor="middle" fill="#475569" fontSize="8" fontFamily="monospace">180 Cycles</text>

                <line x1={100 + baseValue * xScale} y1="20" x2={100 + baseValue * xScale} y2="50" stroke="#475569" strokeWidth="1.5" strokeDasharray="2,2" />
                <rect x={100 + baseValue * xScale - 25} y="30" width="50" height="15" fill="#334155" rx="2" />
                <text x={100 + baseValue * xScale} y="41" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">Base: {baseValue}</text>

                {/* Dynamically calculated Waterfall steps */}
                {waterfallSteps.map((step, idx) => {
                  const isHealthy = step.val > 0;
                  const x = Math.min(step.startX, step.endX);
                  const w = Math.max(2, Math.abs(step.startX - step.endX));
                  return (
                    <g key={step.fullName}>
                      <rect 
                        x={x} 
                        y={step.y} 
                        width={w} 
                        height={16} 
                        fill={isHealthy ? "#06b6d4" : "#f43f5e"} 
                        rx="2" 
                      />
                      <text 
                        x={x + w / 2} 
                        y={step.y + 11} 
                        textAnchor="middle" 
                        fill="#020617" 
                        fontSize="8" 
                        fontFamily="monospace" 
                        fontWeight="bold"
                      >
                        {step.val > 0 ? '+' : ''}{step.val.toFixed(1)}
                      </text>
                      {/* Dotted connector line to next step */}
                      {idx < waterfallSteps.length - 1 && (
                        <line 
                          x1={step.endX} 
                          y1={step.y + 16} 
                          x2={step.endX} 
                          y2={step.y + 30} 
                          stroke={isHealthy ? "#06b6d4" : "#f43f5e"} 
                          strokeWidth="1" 
                          strokeDasharray="2,2" />
                      )}
                      <text x="75" y={step.y + 11} textAnchor="end" fill="#f1f5f9" fontSize="8" fontFamily="monospace">
                        {step.name}
                      </text>
                    </g>
                  );
                })}

                {/* Final Prediction Display */}
                <rect x={Math.max(85, Math.min(415, 100 + finalPrediction * xScale - 15))} y={205} width={30} height={15} fill="#1e293b" stroke="#06b6d4" strokeWidth="1" rx="2" />
                <text x={Math.max(100, Math.min(430, 100 + finalPrediction * xScale))} y={216} textAnchor="middle" fill="#ffffff" fontSize="8" fontFamily="monospace" fontWeight="bold">
                  {Math.round(finalPrediction)}
                </text>
                <text x="75" y="216" textAnchor="end" fill="#06b6d4" fontSize="8" fontFamily="monospace" fontWeight="bold">
                  Predicted RUL
                </text>
                
                <line 
                  x1={waterfallSteps[waterfallSteps.length - 1].endX} 
                  y1={waterfallSteps[waterfallSteps.length - 1].y + 16} 
                  x2={100 + finalPrediction * xScale} 
                  y2={205} 
                  stroke="#334155" 
                  strokeWidth="1" 
                  strokeDasharray="2,2" 
                />

                <circle cx={100 + finalPrediction * xScale} cy="212" r="3" fill="#ef4444" className="animate-ping" />
                <circle cx={100 + finalPrediction * xScale} cy="212" r="1.5" fill="#ef4444" />
              </svg>
            </div>
          </div>

          {/* Local Attribution Drivers Summary Panel */}
          <div className="space-y-6">
            <div className="glass-card border border-slate-800 rounded-xl p-5 space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display border-b border-slate-800 pb-2">
                Top Risk Attributions Drivers
              </h4>

              <div className="space-y-3">
                {shapFeatures.map((feat) => {
                  const isNegative = feat.shapValue < 0;
                  return (
                    <div key={feat.featureName} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-300 font-semibold truncate max-w-[180px]">{feat.featureName}</span>
                        <span className={isNegative ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
                          {isNegative ? '' : '+'}{feat.shapValue.toFixed(1)} RUL
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden flex">
                        {isNegative ? (
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, Math.abs(feat.shapValue) * 3)}%` }} />
                        ) : (
                          <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(100, feat.shapValue * 3)}%` }} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass-card border border-slate-800 rounded-xl p-5 text-xs text-slate-400 font-mono leading-relaxed space-y-2">
              <span className="text-white font-bold uppercase block tracking-wider text-[10px]">How to read SHAP values:</span>
              <p>
                Each row indicates how much a specific sensor's current value deviated from the nominal baseline of a newly minted turbofan.
              </p>
              <p>
                A high positive SHAP value indicates that the sensor is highly elevated or abnormal, heavily compressing the predicted remaining useful life.
              </p>
            </div>
          </div>

        </div>
      ) : activePlotTab === 'causal' ? (
        /* INTERACTIVE CAUSAL RCA GRAPH */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card border border-slate-800 rounded-xl p-5 space-y-4 relative overflow-hidden flex flex-col justify-between min-h-[480px]">
            <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
            
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display flex items-center space-x-1.5">
                  <Network className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <span>Structural Causal Directed Acyclic Graph (DAG)</span>
                </h3>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                  Traces causal dependency paths using Bayesian path coefficients ($\beta_c$) to differentiate correlation from physical causation.
                </p>
              </div>
              <span className="text-[9px] font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-900">
                ROOT NODE: BEARINGS WEAR
              </span>
            </div>

            {/* SVG Causal Graph representation */}
            <div className="my-6 flex justify-center items-center relative py-4">
              <svg viewBox="0 0 460 240" className="w-full max-w-lg h-auto relative z-10 overflow-visible">
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155" />
                  </marker>
                  <marker id="arrow-active" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#06b6d4" />
                  </marker>
                </defs>

                {/* Draw causal links / paths */}
                {/* Lube -> Wear */}
                <line x1="80" y1="50" x2="230" y2="110" stroke={selectedCausalNodeId === 'lube' || selectedCausalNodeId === 'wear' ? '#06b6d4' : '#334155'} strokeWidth={selectedCausalNodeId === 'lube' || selectedCausalNodeId === 'wear' ? '2' : '1'} markerEnd={selectedCausalNodeId === 'lube' || selectedCausalNodeId === 'wear' ? 'url(#arrow-active)' : 'url(#arrow)'} />
                <text x="145" y="70" fill="#475569" fontSize="7" fontFamily="monospace" fontWeight="bold">β=0.28</text>

                {/* Align -> Wear */}
                <line x1="80" y1="170" x2="230" y2="110" stroke={selectedCausalNodeId === 'align' || selectedCausalNodeId === 'wear' ? '#06b6d4' : '#334155'} strokeWidth={selectedCausalNodeId === 'align' || selectedCausalNodeId === 'wear' ? '2' : '1'} markerEnd={selectedCausalNodeId === 'align' || selectedCausalNodeId === 'wear' ? 'url(#arrow-active)' : 'url(#arrow)'} />
                <text x="145" y="150" fill="#475569" fontSize="7" fontFamily="monospace" fontWeight="bold">β=0.15</text>

                {/* Wear -> Vib */}
                <line x1="230" y1="110" x2="380" y2="50" stroke={selectedCausalNodeId === 'wear' || selectedCausalNodeId === 'vib' ? '#06b6d4' : '#334155'} strokeWidth={selectedCausalNodeId === 'wear' || selectedCausalNodeId === 'vib' ? '2' : '1'} markerEnd={selectedCausalNodeId === 'wear' || selectedCausalNodeId === 'vib' ? 'url(#arrow-active)' : 'url(#arrow)'} />
                <text x="310" y="75" fill="#475569" fontSize="7" fontFamily="monospace" fontWeight="bold">β=0.68</text>

                {/* Cool -> Thermal */}
                <line x1="230" y1="190" x2="380" y2="170" stroke={selectedCausalNodeId === 'cool' || selectedCausalNodeId === 'thermal' ? '#06b6d4' : '#334155'} strokeWidth={selectedCausalNodeId === 'cool' || selectedCausalNodeId === 'thermal' ? '2' : '1'} markerEnd={selectedCausalNodeId === 'cool' || selectedCausalNodeId === 'thermal' ? 'url(#arrow-active)' : 'url(#arrow)'} />
                <text x="310" y="195" fill="#475569" fontSize="7" fontFamily="monospace" fontWeight="bold">β=0.35</text>

                {/* Wear -> Thermal */}
                <line x1="230" y1="110" x2="380" y2="170" stroke={selectedCausalNodeId === 'wear' || selectedCausalNodeId === 'thermal' ? '#06b6d4' : '#334155'} strokeWidth={selectedCausalNodeId === 'wear' || selectedCausalNodeId === 'thermal' ? '2' : '1'} markerEnd={selectedCausalNodeId === 'wear' || selectedCausalNodeId === 'thermal' ? 'url(#arrow-active)' : 'url(#arrow)'} />
                <text x="290" y="135" fill="#475569" fontSize="7" fontFamily="monospace" fontWeight="bold">β=0.52</text>

                {/* Render Interactive Nodes */}
                {CAUSAL_NODES.map((node) => {
                  const isSelected = selectedCausalNodeId === node.id;
                  return (
                    <g 
                      key={node.id} 
                      onClick={() => setSelectedCausalNodeId(node.id)} 
                      className="cursor-pointer group"
                    >
                      {/* Outer Ring glow */}
                      <circle 
                        cx={node.x} 
                        cy={node.y} 
                        r="14" 
                        fill={isSelected ? 'rgba(6, 182, 212, 0.15)' : 'rgba(30, 41, 59, 0.2)'} 
                        stroke={isSelected ? '#06b6d4' : '#1e293b'} 
                        strokeWidth={isSelected ? '2' : '1'} 
                        className="transition-all"
                      />
                      {/* Inner point */}
                      <circle 
                        cx={node.x} 
                        cy={node.y} 
                        r="5" 
                        fill={isSelected ? '#06b6d4' : node.id === 'wear' ? '#ef4444' : '#64748b'} 
                      />
                      
                      {/* Label block */}
                      <rect 
                        x={node.x - 55} 
                        y={node.y - 28} 
                        width="110" 
                        height="11" 
                        rx="2" 
                        fill="#020617" 
                        stroke={isSelected ? '#06b6d4' : '#334155'} 
                        strokeWidth="0.5" 
                      />
                      <text 
                        x={node.x} 
                        y={node.y - 20} 
                        textAnchor="middle" 
                        fill={isSelected ? '#e0f2fe' : '#94a3b8'} 
                        fontSize="6" 
                        fontFamily="monospace" 
                        fontWeight="bold"
                      >
                        {node.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Quick node selector buttons */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 z-10 border-t border-slate-800/80 pt-3">
              {CAUSAL_NODES.map((node) => (
                <button
                  key={node.id}
                  onClick={() => setSelectedCausalNodeId(node.id)}
                  className={`py-1 rounded text-[8px] font-mono uppercase font-bold border transition-colors truncate ${
                    selectedCausalNodeId === node.id
                      ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300'
                      : 'bg-slate-950/60 border-slate-900 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {node.id.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Node detailed analysis sheet */}
          <div className="space-y-6">
            <div className="glass-card border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                <Sliders className="w-5 h-5 text-cyan-400" />
                <div>
                  <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold">{activeCausalNode.category}</span>
                  <h3 className="text-md font-bold text-white font-display">{activeCausalNode.name}</h3>
                </div>
              </div>

              <div className="space-y-3 font-mono text-xs text-slate-300">
                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-500">Bayesian Path Strength</span>
                  <span className="font-semibold text-cyan-400">β_c = {activeCausalNode.coefficient}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-500">Posterior Probability</span>
                  <span className={`font-semibold ${activeCausalNode.probability > 50 ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                    {activeCausalNode.probability}%
                  </span>
                </div>
                <div className="space-y-1 pt-1">
                  <span className="text-slate-500 block">Causal Link Mechanism:</span>
                  <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/70 border border-slate-900 p-2.5 rounded">
                    {activeCausalNode.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Diagnostic recommendations */}
            <div className="glass-card border border-slate-800 rounded-xl p-5 bg-gradient-to-br from-slate-950 to-cyan-950/10 border-l-4 border-l-cyan-500 relative overflow-hidden font-mono text-xs">
              <span className="text-cyan-400 font-bold uppercase block tracking-wider text-[10px] mb-1">Causal Intervention policy:</span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Intervening at <strong>Main Axis Bearings Wear</strong> yields a <b>92% decrease</b> in upstream thermal runaway hazards and radial vibration shocks. Relubrication prevents pit growth but does not repair micro-pitting once surface boundaries shatter.
              </p>
              <span className="absolute right-2 bottom-1.5 text-[8px] fill-slate-500 text-slate-500 uppercase">POLICY ID: BAYES-INT-82</span>
            </div>
          </div>
        </div>
      ) : activePlotTab === 'importance' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Global feature importance bar chart */}
          <div className="lg:col-span-2 glass-card border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display border-b border-slate-800/60 pb-2">
              Global Feature Importance (Average SHAP magnitude across all cycles)
            </h3>

            <div className="space-y-4">
              {[
                { name: 'Tool Wear [min]', score: 0.42, rank: 1 },
                { name: 'Rotational Speed [rpm]', score: 0.35, rank: 2 },
                { name: 'Torque [Nm]', score: 0.28, rank: 3 },
                { name: 'Process Temperature [K]', score: 0.18, rank: 4 },
                { name: 'Air Temperature [K]', score: 0.12, rank: 5 },
                { name: 'Power Consumption [kW]', score: 0.08, rank: 6 },
              ].map((feat) => (
                <div key={feat.name} className="space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="font-semibold">{feat.rank}. {feat.name}</span>
                    <span className="text-cyan-400">{(feat.score * 100).toFixed(1)}% Relative Gini</span>
                  </div>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-2 rounded-full" style={{ width: `${feat.score * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card border border-slate-800 rounded-xl p-5 space-y-4 font-mono text-xs text-slate-400 leading-relaxed">
            <h4 className="text-white font-bold uppercase tracking-wider border-b border-slate-800 pb-2 text-[10px]">
              Global SHAP Aggregates
            </h4>
            <p>
              Across the full training dataset, the <strong>Tool Wear [min]</strong> emerges as the most influential indicator of progressive workpiece finish degradation and micro-fractures.
            </p>
            <p>
              This aligns with standard manufacturing physics, where tool tip friction and chipping act as precursors to micro-structural surface defects and catastrophic failures.
            </p>
          </div>

        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Partial Dependence Plot */}
          <div className="lg:col-span-2 glass-card border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">
                SHAP Partial Dependence Curve (S-Curve)
              </h3>
              <select
                value={selectedFeature}
                onChange={(e) => setSelectedFeature(e.target.value)}
                className="text-xs border border-slate-800 bg-slate-950 font-mono text-slate-300 rounded px-2.5 py-1 focus:border-cyan-500 focus:outline-hidden"
              >
                <option value="Rotational Speed [rpm]">Speed (Rotational Speed)</option>
                <option value="Tool Wear [min]">Wear (Tool Wear)</option>
              </select>
            </div>

            <div className="h-48 w-full bg-slate-950/50 rounded-lg p-2 border border-slate-900 flex items-center justify-center">
              <svg className="w-full h-full text-slate-700" viewBox="0 0 400 120">
                <line x1="40" y1="60" x2="380" y2="60" stroke="#1e293b" strokeWidth="0.5" />
                <line x1="40" y1="10" x2="380" y2="10" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="40" y1="110" x2="380" y2="110" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />

                {selectedFeature.includes('Speed') ? (
                  <path d="M 40,105 Q 160,105 200,60 T 380,15" fill="none" stroke="#0ea5e9" strokeWidth="2.5" />
                ) : (
                  <path d="M 40,95 Q 180,95 220,50 T 380,25" fill="none" stroke="#0ea5e9" strokeWidth="2.5" />
                )}

                <circle cx="200" cy="60" r="4" fill="#f43f5e" className="animate-ping" />
                <circle cx="200" cy="60" r="2.5" fill="#f43f5e" />

                <text x="35" y="14" textAnchor="end" fill="#475569" fontSize="7" fontFamily="monospace">HIGH RISK</text>
                <text x="35" y="112" textAnchor="end" fill="#475569" fontSize="7" fontFamily="monospace">PROTECTIVE</text>

                <text x="40" y="118" fill="#475569" fontSize="7" fontFamily="monospace">Low Value</text>
                <text x="380" y="118" textAnchor="end" fill="#ef4444" fontSize="7" fontFamily="monospace" fontWeight="bold">High Value (Anomalous)</text>
              </svg>
            </div>
          </div>

          <div className="glass-card border border-slate-800 rounded-xl p-5 space-y-4 font-mono text-xs text-slate-400 leading-relaxed">
            <h4 className="text-white font-bold uppercase tracking-wider border-b border-slate-800 pb-2 text-[10px]">
              Dependence Insights
            </h4>
            <p>
              The Partial Dependence Plot highlights non-linear threshold bounds. 
              As tool wear crosses the critical <strong>150 min</strong> threshold, the local SHAP value transitions from a flat protective slope and climbs exponentially, reflecting friction-induced thermal degradation acceleration.
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
