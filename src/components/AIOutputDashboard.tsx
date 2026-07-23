/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AIOutputDashboard — Unified AI Predictive Maintenance Output Console
 * Consolidates all 12 predictive maintenance outputs into a single premium view.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  DollarSign,
  FileText,
  Heart,
  Layers,
  Shield,
  Sparkles,
  TrendingUp,
  Wrench,
  Zap,
  Info,
  BarChart2,
  Bell,
  XCircle,
  ThermometerSun,
  Gauge,
  Component,
  ScanEye,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  Printer
} from 'lucide-react';
import { MachineDigitalTwin, SensorData, ShapExplainer, ComponentHealth } from '../types';
import { calculatePhysicalHealth, HealthMetrics } from '../utils/healthFormula';
import { calculateExactShap } from '../utils/shapSolver';
import { runXGBoost, sensorsToFeatureArray, FEATURE_LABELS } from '../utils/machineLearningModels';
import { FAULT_CLASSIFICATION_LABELS } from '../data/mockData';

interface AIOutputDashboardProps {
  activeTwin: MachineDigitalTwin;
  liveSensors: SensorData;
  getShapFeatures: () => ShapExplainer[];
  selectedFactory: string;
}

// ─────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────
function statusFromHealth(h: number): 'Healthy' | 'Warning' | 'Critical' {
  if (h >= 75) return 'Healthy';
  if (h >= 50) return 'Warning';
  return 'Critical';
}

function riskFromProbability(p: number): 'Low' | 'Medium' | 'High' {
  if (p < 20) return 'Low';
  if (p < 60) return 'Medium';
  return 'High';
}

function statusColor(s: string) {
  if (s === 'Healthy' || s === 'healthy') return '#22C55E';
  if (s === 'Warning' || s === 'warning') return '#F59E0B';
  if (s === 'Critical' || s === 'critical') return '#EF4444';
  if (s === 'failed') return '#DC2626';
  return '#9CA3AF';
}

function riskColor(r: string) {
  if (r === 'Low') return '#22C55E';
  if (r === 'Medium') return '#F59E0B';
  return '#EF4444';
}

function formatTimestamp() {
  const now = new Date();
  return now.toTimeString().split(' ')[0];
}

// ─────────────────────────────────────────────────────────
// SVG Radial Gauge Component
// ─────────────────────────────────────────────────────────
function RadialGauge({ value, max = 100, size = 120, strokeWidth = 8, color, label, unit = '%' }: {
  value: number; max?: number; size?: number; strokeWidth?: number; color: string; label: string; unit?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(1, Math.max(0, value / max));
  const dashOffset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth}
        />
        {/* Filled arc */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease-in-out, stroke 0.5s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-2xl font-bold text-white font-mono">{Math.round(value)}</span>
        <span className="text-[9px] text-slate-400 font-mono uppercase">{unit}</span>
      </div>
      <span className="text-[10px] text-slate-400 font-mono mt-1.5 uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SVG Horizontal Bar Component
// ─────────────────────────────────────────────────────────
function HealthBar({ name, score, status }: { name: string; score: number; status: string }) {
  const clr = statusColor(status);
  return (
    <div className="flex items-center space-x-3 group">
      <span className="text-[10px] font-mono text-slate-400 w-40 truncate group-hover:text-white transition-colors">{name}</span>
      <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: clr }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(2, score)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className="text-[10px] font-mono font-bold w-10 text-right" style={{ color: clr }}>{score}%</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SHAP Waterfall Chart (Pure SVG)
// ─────────────────────────────────────────────────────────
function ShapWaterfall({ shapValues, baseValue, predictedValue }: {
  shapValues: ShapExplainer[]; baseValue: number; predictedValue: number;
}) {
  // Take top 5 features sorted by absolute SHAP value
  const sorted = [...shapValues].sort((a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue)).slice(0, 5);
  const maxAbsShap = Math.max(...sorted.map(s => Math.abs(s.shapValue)), 1);
  const barMaxWidth = 200;
  const rowHeight = 32;
  const svgHeight = (sorted.length + 2) * rowHeight + 20;
  const labelX = 10;
  const barStartX = 175;

  return (
    <svg width="100%" height={svgHeight} viewBox={`0 0 500 ${svgHeight}`} className="overflow-visible">
      {/* Baseline */}
      <text x={labelX} y={18} fill="#9CA3AF" fontSize="9" fontFamily="JetBrains Mono, monospace">
        Baseline RUL
      </text>
      <text x={barStartX} y={18} fill="#FFFFFF" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
        {baseValue.toFixed(0)} hrs
      </text>

      {/* Feature bars */}
      {sorted.map((feat, idx) => {
        const y = (idx + 1) * rowHeight + 10;
        const barWidth = (Math.abs(feat.shapValue) / maxAbsShap) * barMaxWidth;
        const isPositive = feat.shapValue >= 0;
        const barColor = isPositive ? '#22C55E' : '#EF4444';
        const featureName = feat.featureName.length > 22 ? feat.featureName.slice(0, 20) + '…' : feat.featureName;

        return (
          <g key={feat.featureName}>
            <text x={labelX} y={y + 5} fill="#9CA3AF" fontSize="9" fontFamily="JetBrains Mono, monospace">
              {featureName}
            </text>
            {/* Bar */}
            <rect
              x={isPositive ? barStartX : barStartX - barWidth}
              y={y - 8}
              width={barWidth}
              height={14}
              rx={3}
              fill={barColor}
              opacity={0.85}
            >
              <animate attributeName="width" from="0" to={String(barWidth)} dur="0.6s" fill="freeze" />
            </rect>
            {/* Value label */}
            <text
              x={isPositive ? barStartX + barWidth + 6 : barStartX - barWidth - 6}
              y={y + 4}
              fill={barColor}
              fontSize="9"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="bold"
              textAnchor={isPositive ? 'start' : 'end'}
            >
              {isPositive ? '+' : ''}{feat.shapValue.toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* Predicted Value */}
      <line
        x1={barStartX} y1={25} x2={barStartX} y2={svgHeight - 15}
        stroke="rgba(255,255,255,0.1)" strokeWidth={1} strokeDasharray="3,3"
      />
      <text x={labelX} y={svgHeight - 5} fill="#FFFFFF" fontSize="9" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
        Predicted RUL
      </text>
      <text x={barStartX} y={svgHeight - 5} fill="#FFFFFF" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
        {predictedValue.toFixed(0)} hrs
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
// Digital Twin SVG Machine Diagram
// ─────────────────────────────────────────────────────────
function DigitalTwinSVG({ components, onSelectComponent, selectedId }: {
  components: ComponentHealth[];
  onSelectComponent: (id: string) => void;
  selectedId: string;
}) {
  // Map component IDs to diagram positions (simplified CNC schematic)
  const layout: Record<string, { x: number; y: number; w: number; h: number; label: string }> = {
    'machine-body':       { x: 20,  y: 20,  w: 360, h: 220, label: 'Body' },
    'control-panel':      { x: 30,  y: 30,  w: 80,  h: 50,  label: 'Control' },
    'spindle':            { x: 150, y: 35,  w: 70,  h: 55,  label: 'Spindle' },
    'chuck':              { x: 230, y: 40,  w: 50,  h: 45,  label: 'Chuck' },
    'cutting-tool':       { x: 290, y: 40,  w: 50,  h: 45,  label: 'Tool' },
    'workpiece':          { x: 290, y: 100, w: 70,  h: 40,  label: 'Workpiece' },
    'coolant-system':     { x: 30,  y: 100, w: 80,  h: 40,  label: 'Coolant' },
    'servo-motors':       { x: 130, y: 110, w: 60,  h: 35,  label: 'Servos' },
    'hydraulic-unit':     { x: 200, y: 110, w: 70,  h: 35,  label: 'Hydraulic' },
    'electrical-cabinet': { x: 30,  y: 160, w: 80,  h: 40,  label: 'Electrical' },
    'safety-doors':       { x: 130, y: 165, w: 60,  h: 35,  label: 'Safety' },
    'axis-x':             { x: 200, y: 160, w: 55,  h: 30,  label: 'X-Axis' },
    'axis-y':             { x: 260, y: 160, w: 55,  h: 30,  label: 'Y-Axis' },
    'axis-z':             { x: 320, y: 160, w: 55,  h: 30,  label: 'Z-Axis' },
  };

  return (
    <svg width="100%" height="260" viewBox="0 0 400 260" className="overflow-visible">
      {/* Outer machine shell */}
      <rect x={15} y={15} width={370} height={232} rx={12} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1.5} strokeDasharray="6,4" />

      {components.map(comp => {
        const pos = layout[comp.id];
        if (!pos) return null;
        const clr = statusColor(comp.status);
        const isSelected = comp.id === selectedId;
        const isOuter = comp.id === 'machine-body';

        return (
          <g key={comp.id} onClick={() => onSelectComponent(comp.id)} style={{ cursor: 'pointer' }}>
            {!isOuter && (
              <>
                <rect
                  x={pos.x} y={pos.y} width={pos.w} height={pos.h}
                  rx={6}
                  fill={isSelected ? `${clr}22` : 'rgba(21,21,21,0.9)'}
                  stroke={isSelected ? clr : `${clr}66`}
                  strokeWidth={isSelected ? 2 : 1}
                  style={{ transition: 'all 0.3s ease' }}
                />
                {/* Health micro-bar inside component */}
                <rect
                  x={pos.x + 3} y={pos.y + pos.h - 5}
                  width={(pos.w - 6) * (comp.healthScore / 100)} height={3}
                  rx={1.5} fill={clr} opacity={0.7}
                />
                <text
                  x={pos.x + pos.w / 2} y={pos.y + pos.h / 2 - 2}
                  textAnchor="middle" fill="white" fontSize="8" fontFamily="JetBrains Mono, monospace" fontWeight="600"
                >
                  {pos.label}
                </text>
                <text
                  x={pos.x + pos.w / 2} y={pos.y + pos.h / 2 + 9}
                  textAnchor="middle" fill={clr} fontSize="8" fontFamily="JetBrains Mono, monospace" fontWeight="bold"
                >
                  {comp.healthScore}%
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* Title */}
      <text x={200} y={252} textAnchor="middle" fill="#9CA3AF" fontSize="8" fontFamily="JetBrains Mono, monospace" letterSpacing="2">
        CNC MACHINE DIGITAL TWIN — INTERACTIVE SCHEMATIC
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
// Main AIOutputDashboard Component
// ─────────────────────────────────────────────────────────
export default function AIOutputDashboard({
  activeTwin,
  liveSensors,
  getShapFeatures,
  selectedFactory
}: AIOutputDashboardProps) {

  // Compute all metrics from live sensors
  const metrics: HealthMetrics = useMemo(() => calculatePhysicalHealth(liveSensors), [liveSensors]);
  const shapFeatures = useMemo(() => getShapFeatures(), [liveSensors]);
  const features = useMemo(() => sensorsToFeatureArray(liveSensors), [liveSensors]);
  const xgbPrediction = useMemo(() => runXGBoost(features), [features]);

  const machineStatus = statusFromHealth(metrics.healthScore);
  const failureRisk = riskFromProbability(metrics.failureProbability);

  // Digital Twin component selection
  const [selectedCompId, setSelectedCompId] = useState<string>(activeTwin.components[2]?.id || 'spindle');
  const selectedComp = activeTwin.components.find(c => c.id === selectedCompId) || activeTwin.components[0];

  // Alert expansion toggle
  const [alertsExpanded, setAlertsExpanded] = useState(true);
  const [reportExpanded, setReportExpanded] = useState(true);

  // Derive alerts from components
  const activeAlerts = activeTwin.components
    .filter(c => c.healthScore < 50)
    .sort((a, b) => a.healthScore - b.healthScore);

  // Sort components by health for bar chart
  const sortedComponents = [...activeTwin.components].sort((a, b) => a.healthScore - b.healthScore);

  // Match fault to FAULT_CLASSIFICATION_LABELS
  const matchedFault = useMemo(() => {
    const mode = metrics.activeFailureMode.toLowerCase();
    if (mode.includes('tool wear')) return FAULT_CLASSIFICATION_LABELS.find(f => f.id === 'bearing') || FAULT_CLASSIFICATION_LABELS[0];
    if (mode.includes('heat')) return FAULT_CLASSIFICATION_LABELS.find(f => f.id === 'thermal_slip') || FAULT_CLASSIFICATION_LABELS[2];
    if (mode.includes('power')) return FAULT_CLASSIFICATION_LABELS.find(f => f.id === 'shaft_imbalance') || FAULT_CLASSIFICATION_LABELS[7];
    if (mode.includes('overstrain')) return FAULT_CLASSIFICATION_LABELS.find(f => f.id === 'hydraulic') || FAULT_CLASSIFICATION_LABELS[1];
    return null;
  }, [metrics.activeFailureMode]);

  // SHAP base value (XGBoost base score)
  const shapBaseValue = 110;

  // Generate NLP AI Maintenance Report
  const aiReport = useMemo(() => {
    const urgency = metrics.failureProbability > 60 ? 'CRITICAL' : metrics.failureProbability > 20 ? 'ELEVATED' : 'NOMINAL';
    const topShap = [...shapFeatures].sort((a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue));
    const primaryDrivers = topShap.slice(0, 3).map(s => `${s.featureName} (SHAP: ${s.shapValue > 0 ? '+' : ''}${s.shapValue.toFixed(1)})`);
    const degradedComponents = activeTwin.components.filter(c => c.healthScore < 80).sort((a, b) => a.healthScore - b.healthScore).slice(0, 3);

    return {
      timestamp: new Date().toISOString(),
      machineName: activeTwin.metadata.name,
      machineId: activeTwin.metadata.id,
      factory: selectedFactory.replace('factory-', 'Factory ').toUpperCase(),
      urgency,
      predictedRUL: metrics.predictedRUL,
      healthScore: metrics.healthScore,
      failureProbability: metrics.failureProbability,
      anomalyScore: metrics.anomalyScore,
      failureMode: metrics.activeFailureMode,
      primaryDrivers,
      degradedComponents: degradedComponents.map(c => `${c.name} (${c.healthScore}%)`),
      recommendation: activeTwin.recommendedAction,
      confidence: metrics.confidenceScore,
    };
  }, [metrics, shapFeatures, activeTwin, selectedFactory]);

  // Panel card wrapper
  const Panel = ({ title, icon, children, className = '', colSpan = '', badge, badgeColor }: {
    title: string; icon: React.ReactNode; children: React.ReactNode;
    className?: string; colSpan?: string; badge?: string; badgeColor?: string;
  }) => (
    <motion.div
      className={`bg-slate-800 border border-slate-800 rounded-xl p-4 flex flex-col ${colSpan} ${className}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <span className="text-white/60">{icon}</span>
          <h3 className="text-[10px] font-bold text-white uppercase tracking-widest font-mono">{title}</h3>
        </div>
        {badge && (
          <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded-full border"
            style={{ color: badgeColor || '#9CA3AF', borderColor: (badgeColor || '#9CA3AF') + '44', backgroundColor: (badgeColor || '#9CA3AF') + '11' }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white font-sans">AI Predictive Maintenance Outputs</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time consolidated intelligence for <span className="text-white font-semibold">{activeTwin.metadata.name}</span>
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
          <span className="text-[9px] font-mono text-slate-400">LIVE — {formatTimestamp()}</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          ROW 1: Hero Metrics (RUL, Health, Status, Risk)
          ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* 1. Predicted RUL */}
        <Panel title="Predicted RUL" icon={<Clock className="w-3.5 h-3.5" />}
          badge={`±${Math.round(metrics.confidenceInterval[1] - metrics.predictedRUL)} hrs`}
          badgeColor="#9CA3AF">
          <div className="flex-1 flex flex-col items-center justify-center py-2 relative">
            <RadialGauge
              value={metrics.predictedRUL}
              max={200}
              size={110}
              strokeWidth={7}
              color={metrics.predictedRUL > 100 ? '#22C55E' : metrics.predictedRUL > 40 ? '#F59E0B' : '#EF4444'}
              label="operational hours"
              unit="hrs"
            />
            <div className="mt-2 flex items-center space-x-2 text-[9px] font-mono">
              <span className="text-slate-400/60">CI: [{metrics.confidenceInterval[0]}–{metrics.confidenceInterval[1]}]</span>
            </div>
          </div>
        </Panel>

        {/* 2. Health Score */}
        <Panel title="Health Score" icon={<Heart className="w-3.5 h-3.5" />}
          badge={`${metrics.confidenceScore}% conf`}
          badgeColor={metrics.healthScore >= 75 ? '#22C55E' : metrics.healthScore >= 50 ? '#F59E0B' : '#EF4444'}>
          <div className="flex-1 flex flex-col items-center justify-center py-2 relative">
            <RadialGauge
              value={metrics.healthScore}
              max={100}
              size={110}
              strokeWidth={7}
              color={metrics.healthScore >= 75 ? '#22C55E' : metrics.healthScore >= 50 ? '#F59E0B' : '#EF4444'}
              label="machine health"
            />
          </div>
        </Panel>

        {/* 3. Machine Status */}
        <Panel title="Machine Status" icon={<Activity className="w-3.5 h-3.5" />}
          badge={machineStatus.toUpperCase()}
          badgeColor={statusColor(machineStatus)}>
          <div className="flex-1 flex flex-col items-center justify-center py-4 space-y-3">
            <div className="relative">
              <div className="w-16 h-16 rounded-full flex items-center justify-center border-2"
                style={{
                  borderColor: statusColor(machineStatus),
                  backgroundColor: statusColor(machineStatus) + '15',
                  boxShadow: `0 0 20px ${statusColor(machineStatus)}22`
                }}>
                {machineStatus === 'Healthy' && <CheckCircle className="w-7 h-7" style={{ color: statusColor(machineStatus) }} />}
                {machineStatus === 'Warning' && <AlertTriangle className="w-7 h-7" style={{ color: statusColor(machineStatus) }} />}
                {machineStatus === 'Critical' && <XCircle className="w-7 h-7" style={{ color: statusColor(machineStatus) }} />}
              </div>
              {machineStatus !== 'Healthy' && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: statusColor(machineStatus) }} />
              )}
            </div>
            <span className="text-lg font-bold font-mono" style={{ color: statusColor(machineStatus) }}>{machineStatus}</span>
            <span className="text-[9px] text-slate-400/60 font-mono">
              {machineStatus === 'Healthy' ? 'All systems nominal' : machineStatus === 'Warning' ? 'Degradation detected' : 'Immediate action required'}
            </span>
          </div>
        </Panel>

        {/* 4. Failure Risk */}
        <Panel title="Failure Risk" icon={<Shield className="w-3.5 h-3.5" />}
          badge={failureRisk.toUpperCase()}
          badgeColor={riskColor(failureRisk)}>
          <div className="flex-1 flex flex-col items-center justify-center py-2 space-y-2">
            {/* Risk gauge meter */}
            <svg width="130" height="75" viewBox="0 0 130 75">
              {/* Gauge background arcs */}
              <path d="M 15 65 A 50 50 0 0 1 48 18" fill="none" stroke="#22C55E" strokeWidth={8} strokeLinecap="round" opacity={0.3} />
              <path d="M 48 18 A 50 50 0 0 1 82 18" fill="none" stroke="#F59E0B" strokeWidth={8} strokeLinecap="round" opacity={0.3} />
              <path d="M 82 18 A 50 50 0 0 1 115 65" fill="none" stroke="#EF4444" strokeWidth={8} strokeLinecap="round" opacity={0.3} />
              {/* Needle */}
              {(() => {
                const angle = -90 + (metrics.failureProbability / 100) * 180;
                const rads = (angle * Math.PI) / 180;
                const nx = 65 + Math.cos(rads) * 38;
                const ny = 65 + Math.sin(rads) * 38;
                return (
                  <line x1={65} y1={65} x2={nx} y2={ny}
                    stroke="white" strokeWidth={2.5} strokeLinecap="round"
                    style={{ transition: 'all 0.8s ease-in-out' }}
                  />
                );
              })()}
              <circle cx={65} cy={65} r={4} fill="white" />
            </svg>
            <span className="text-xl font-bold font-mono" style={{ color: riskColor(failureRisk) }}>
              {metrics.failureProbability.toFixed(1)}%
            </span>
            <span className="text-[9px] text-slate-400/60 font-mono">FAILURE PROBABILITY</span>
          </div>
        </Panel>
      </div>

      {/* ═══════════════════════════════════════════════════════
          ROW 2: Anomaly + Fault Type + Component Health
          ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* 5. Anomaly Score */}
        <Panel title="Anomaly Score" icon={<ScanEye className="w-3.5 h-3.5" />}
          badge={metrics.isAnomaly ? 'ANOMALY DETECTED' : 'NORMAL'}
          badgeColor={metrics.isAnomaly ? '#EF4444' : '#22C55E'}>
          <div className="flex-1 flex flex-col space-y-3 py-2">
            {/* Anomaly bar */}
            <div className="relative">
              <div className="h-6 bg-slate-900 rounded-lg border border-slate-800 overflow-hidden relative">
                <motion.div
                  className="h-full rounded-lg"
                  style={{
                    backgroundColor: metrics.anomalyScore > 3.5 ? '#EF4444' : metrics.anomalyScore > 2 ? '#F59E0B' : '#22C55E',
                    boxShadow: metrics.isAnomaly ? `0 0 12px ${metrics.anomalyScore > 3.5 ? '#EF444444' : '#F59E0B44'}` : 'none',
                  }}
                  animate={{ width: `${Math.min(100, (metrics.anomalyScore / 10) * 100)}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
                {/* Threshold line at 3.5 */}
                <div className="absolute top-0 bottom-0 w-px bg-white/40" style={{ left: '35%' }}>
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[7px] font-mono text-white/50">θ=3.5</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold font-mono text-white">{metrics.anomalyScore.toFixed(2)}</span>
              <span className="text-[9px] font-mono text-slate-400/60">LSTM reconstruction loss</span>
            </div>
            <p className="text-[10px] text-slate-400/70 font-mono leading-relaxed">
              {metrics.isAnomaly
                ? 'Reconstruction error exceeds threshold. Possible fault pattern detected in sensor sequence data.'
                : 'Sensor sequence within normal operating envelope. No anomalous patterns detected.'}
            </p>
          </div>
        </Panel>

        {/* 6. Fault Type */}
        <Panel title="Fault Type" icon={<Zap className="w-3.5 h-3.5" />}
          badge={metrics.activeFailureMode === 'No Failure' ? 'NONE' : 'ACTIVE'}
          badgeColor={metrics.activeFailureMode === 'No Failure' ? '#22C55E' : '#EF4444'}>
          <div className="flex-1 flex flex-col space-y-3 py-2">
            {metrics.activeFailureMode === 'No Failure' ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-2 py-4">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-400 font-mono">No Active Fault</span>
                <span className="text-[9px] text-slate-400/60 font-mono">All sensor signatures nominal</span>
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-[#EF4444]/10 border border-red-500/30/30 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white">{metrics.activeFailureMode}</span>
                    {matchedFault && (
                      <span className="block text-[9px] text-slate-400/60 font-mono mt-0.5">{matchedFault.label}</span>
                    )}
                  </div>
                </div>
                {matchedFault && (
                  <p className="text-[10px] text-slate-400/70 font-mono leading-relaxed border-t border-slate-800 pt-2">
                    {matchedFault.description}
                  </p>
                )}
              </>
            )}
          </div>
        </Panel>

        {/* 7. Component Health (Top 8) */}
        <Panel title="Component Health" icon={<Layers className="w-3.5 h-3.5" />}
          badge={`${activeTwin.components.filter(c => c.status !== 'healthy').length} degraded`}
          badgeColor={activeTwin.components.some(c => c.healthScore < 50) ? '#EF4444' : '#F59E0B'}>
          <div className="flex-1 flex flex-col space-y-1.5 py-1 overflow-y-auto max-h-48 pr-1" style={{ scrollbarWidth: 'thin' }}>
            {sortedComponents.slice(0, 10).map((comp, idx) => (
              <div key={comp.id}>
                <HealthBar name={comp.name} score={comp.healthScore} status={comp.status} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ═══════════════════════════════════════════════════════
          ROW 3: SHAP Explanation + Maintenance Recommendation
          ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* 8. SHAP Explanation */}
        <Panel title="SHAP Explanation" icon={<BrainCircuit className="w-3.5 h-3.5" />}
          badge="KernelSHAP" badgeColor="#9CA3AF">
          <div className="flex-1 py-1">
            <ShapWaterfall
              shapValues={shapFeatures}
              baseValue={shapBaseValue}
              predictedValue={metrics.predictedRUL}
            />
            <p className="text-[9px] text-slate-400/50 font-mono mt-2 leading-relaxed">
              Shapley game-theory attributions showing how each sensor feature pushes the predicted RUL above or below the baseline of {shapBaseValue} hours.
            </p>
          </div>
        </Panel>

        {/* 9. Maintenance Recommendation */}
        <Panel title="Maintenance Recommendation" icon={<Wrench className="w-3.5 h-3.5" />}
          badge={metrics.failureProbability > 60 ? 'URGENT' : metrics.failureProbability > 20 ? 'ADVISORY' : 'ROUTINE'}
          badgeColor={metrics.failureProbability > 60 ? '#EF4444' : metrics.failureProbability > 20 ? '#F59E0B' : '#22C55E'}>
          <div className="flex-1 flex flex-col space-y-3 py-1">
            {/* Primary recommendation */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
              <p className="text-xs text-slate-400 font-mono leading-relaxed">
                {activeTwin.recommendedAction}
              </p>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2 p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                <div>
                  <span className="text-[8px] font-mono text-slate-400/60 block">EST. REPAIR COST</span>
                  <span className="text-sm font-bold text-white font-mono">${activeTwin.estimatedRepairCost.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <div>
                  <span className="text-[8px] font-mono text-slate-400/60 block">EST. DOWNTIME</span>
                  <span className="text-sm font-bold text-white font-mono">{activeTwin.estimatedDowntime}h</span>
                </div>
              </div>
            </div>

            {/* SOP-grounded action items */}
            <div className="space-y-1.5">
              <span className="text-[8px] font-mono text-slate-400/50 uppercase tracking-widest">SOP ACTION ITEMS</span>
              {[
                'Verify LOTO lockout on active line segments',
                'Inspect spindle bearing casing for metal debris',
                'Flush coolant nozzle orifices via ultrasonic sweep',
                'Recalibrate axis servo encoder feedback loops'
              ].map((step, i) => (
                <div key={i} className="flex items-start space-x-2 text-[10px] font-mono text-slate-400">
                  <span className="text-white/40 mt-px">{i + 1}.</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* ═══════════════════════════════════════════════════════
          ROW 4: AI Report + Digital Twin + Alerts
          ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* 10. AI Maintenance Report */}
        <Panel title="AI Maintenance Report" icon={<FileText className="w-3.5 h-3.5" />}
          badge="AUTO-GENERATED" badgeColor="#9CA3AF">
          <div className="flex-1 flex flex-col space-y-2 py-1">
            <button
              onClick={() => setReportExpanded(!reportExpanded)}
              className="flex items-center justify-between text-[9px] font-mono text-slate-400 hover:text-white transition-colors"
            >
              <span>Report ID: MR-{Date.now().toString(36).toUpperCase().slice(-6)}</span>
              {reportExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <AnimatePresence>
              {reportExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 p-3 bg-slate-900 border border-slate-800 rounded-lg text-[10px] font-mono leading-relaxed max-h-64 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    <div className="flex justify-between text-slate-400/60">
                      <span>Generated: {new Date().toLocaleString()}</span>
                      <span className="font-bold" style={{ color: aiReport.urgency === 'CRITICAL' ? '#EF4444' : aiReport.urgency === 'ELEVATED' ? '#F59E0B' : '#22C55E' }}>
                        {aiReport.urgency}
                      </span>
                    </div>

                    <div className="border-t border-slate-800 pt-2">
                      <span className="text-white font-bold block mb-1">MACHINE IDENTIFICATION</span>
                      <span className="text-slate-400">{aiReport.machineName} ({aiReport.machineId})</span>
                      <span className="block text-slate-400/60">Site: {aiReport.factory}</span>
                    </div>

                    <div className="border-t border-slate-800 pt-2">
                      <span className="text-white font-bold block mb-1">PREDICTIVE METRICS</span>
                      <span className="text-slate-400">RUL: <strong className="text-white">{aiReport.predictedRUL} hrs</strong></span>
                      <span className="block text-slate-400">Health: <strong className="text-white">{aiReport.healthScore}%</strong></span>
                      <span className="block text-slate-400">Failure Prob: <strong className="text-white">{aiReport.failureProbability}%</strong></span>
                      <span className="block text-slate-400">Anomaly: <strong className="text-white">{aiReport.anomalyScore}</strong></span>
                    </div>

                    <div className="border-t border-slate-800 pt-2">
                      <span className="text-white font-bold block mb-1">FAILURE MODE</span>
                      <span className="text-slate-400">{aiReport.failureMode}</span>
                    </div>

                    <div className="border-t border-slate-800 pt-2">
                      <span className="text-white font-bold block mb-1">PRIMARY RISK DRIVERS (SHAP)</span>
                      {aiReport.primaryDrivers.map((d, i) => (
                        <span key={i} className="block text-slate-400">• {d}</span>
                      ))}
                    </div>

                    {aiReport.degradedComponents.length > 0 && (
                      <div className="border-t border-slate-800 pt-2">
                        <span className="text-white font-bold block mb-1">DEGRADED COMPONENTS</span>
                        {aiReport.degradedComponents.map((c, i) => (
                          <span key={i} className="block text-amber-400">⚠ {c}</span>
                        ))}
                      </div>
                    )}

                    <div className="border-t border-slate-800 pt-2">
                      <span className="text-white font-bold block mb-1">RECOMMENDATION</span>
                      <span className="text-slate-400">{aiReport.recommendation}</span>
                    </div>

                    <div className="border-t border-slate-800 pt-2 text-slate-400/40">
                      <span>Model Confidence: {aiReport.confidence}% • Generated by ForgeSight RUL-Agent v3.5</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Panel>

        {/* 11. Digital Twin Visualization */}
        <Panel title="Digital Twin Visualization" icon={<Cpu className="w-3.5 h-3.5" />}
          badge="INTERACTIVE" badgeColor="#9CA3AF">
          <div className="flex-1 py-1">
            <DigitalTwinSVG
              components={activeTwin.components}
              onSelectComponent={setSelectedCompId}
              selectedId={selectedCompId}
            />
            {/* Selected component detail */}
            {selectedComp && (
              <div className="mt-2 p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-white">{selectedComp.name}</span>
                  <span className="text-[9px] font-mono font-bold" style={{ color: statusColor(selectedComp.status) }}>
                    {selectedComp.healthScore}%
                  </span>
                </div>
                <p className="text-[9px] font-mono text-slate-400/70 mt-1 leading-relaxed">
                  {selectedComp.description}
                </p>
              </div>
            )}
          </div>
        </Panel>

        {/* 12. Dashboard Alerts */}
        <Panel title="Dashboard Alerts" icon={<Bell className="w-3.5 h-3.5" />}
          badge={`${activeAlerts.length} active`}
          badgeColor={activeAlerts.length > 0 ? '#EF4444' : '#22C55E'}>
          <div className="flex-1 flex flex-col py-1">
            {activeAlerts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-2 py-6">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400 font-mono">No Active Alerts</span>
                <span className="text-[9px] text-slate-400/60 font-mono text-center">All component health scores are within acceptable bounds.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                {activeAlerts.map((alert, idx) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-2.5 bg-slate-900 border rounded-lg flex items-start space-x-2.5"
                    style={{ borderColor: statusColor(alert.status) + '44' }}
                  >
                    <div className="mt-0.5">
                      {alert.healthScore < 25 ? (
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-white truncate">{alert.name}</span>
                        <span className="text-[8px] font-mono font-bold ml-2"
                          style={{ color: statusColor(alert.status) }}>
                          {alert.healthScore}%
                        </span>
                      </div>
                      <p className="text-[9px] font-mono text-slate-400/70 mt-0.5 leading-relaxed truncate">
                        {alert.description}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-[7px] font-mono text-slate-400/40">
                          SHAP: {alert.shapContribution > 0 ? '+' : ''}{alert.shapContribution.toFixed(2)}
                        </span>
                        <span className="text-[7px] font-mono text-slate-400/40">
                          {formatTimestamp()}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
