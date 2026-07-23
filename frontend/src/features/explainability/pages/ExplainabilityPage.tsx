import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ScatterChart, Scatter
} from 'recharts';
import { cn } from '@shared/utils/cn';
import { Info, TrendingDown, TrendingUp } from 'lucide-react';

// ── Data ─────────────────────────────────────────────────────────────────────────
const SHAP_FEATURES = [
  { feature: 'Vibration RMS', shap: 2.34, direction: 'positive', description: 'Strongest predictor — high frequency oscillation indicates bearing wear' },
  { feature: 'Spindle Temperature', shap: 1.85, direction: 'positive', description: 'Thermal stress accelerating lubricant degradation' },
  { feature: 'Motor Current Draw', shap: 1.42, direction: 'positive', description: 'Increased load due to friction from degraded bearings' },
  { feature: 'Coolant Flow Rate', shap: -0.98, direction: 'negative', description: 'Adequate coolant is slowing thermal degradation' },
  { feature: 'Axis Speed (X)', shap: 0.76, direction: 'positive', description: 'Higher traverse speed amplifying vibration harmonics' },
  { feature: 'Power Consumption', shap: 0.64, direction: 'positive', description: 'Inefficiency from mechanical resistance' },
  { feature: 'Lubricant Pressure', shap: -0.52, direction: 'negative', description: 'Current pressure within normal range, protective effect' },
  { feature: 'Acoustic Emission', shap: 0.41, direction: 'positive', description: 'Ultrasonic signature consistent with surface fatigue' },
];

const MACHINES = [
  { id: 'CNC-003', name: 'Lathe Station 1', health: 43 },
  { id: 'CNC-002', name: 'CNC Mill Beta', health: 67 },
  { id: 'CNC-005', name: 'Press Unit 2', health: 75 },
  { id: 'CNC-001', name: 'CNC Mill Alpha', health: 91 },
];

const DEPENDENCE_DATA = [
  { value: 20, shap: -0.8 },
  { value: 25, shap: -0.6 },
  { value: 30, shap: -0.3 },
  { value: 40, shap: 0.1 },
  { value: 50, shap: 0.4 },
  { value: 60, shap: 0.8 },
  { value: 70, shap: 1.2 },
  { value: 75, shap: 1.5 },
  { value: 80, shap: 1.85 },
  { value: 85, shap: 2.1 },
  { value: 90, shap: 2.4 },
  { value: 100, shap: 2.8 }
];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="card p-3 shadow-md max-w-[240px] text-[12px] bg-white">
      <p className="font-medium text-text-primary mb-1">{d.feature}</p>
      <p className="text-text-secondary">{d.description}</p>
      <p className={cn(
        'font-semibold mt-1.5',
        d.direction === 'positive' ? 'text-status-critical' : 'text-status-healthy',
      )}>
        SHAP: {d.shap > 0 ? '+' : ''}{d.shap.toFixed(2)}
      </p>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────────
export default function ExplainabilityPage() {
  const [selectedMachine, setSelectedMachine] = useState(MACHINES[0]);
  const [plotType, setPlotType] = useState<'summary' | 'waterfall' | 'force' | 'dependence'>('summary');

  const totalPositive = SHAP_FEATURES.filter(f => f.direction === 'positive').reduce((sum, f) => sum + f.shap, 0);
  const totalNegative = Math.abs(SHAP_FEATURES.filter(f => f.direction === 'negative').reduce((sum, f) => sum + f.shap, 0));

  const getWaterfallData = () => {
    let current = 110.0;
    const sortedFeatures = [...SHAP_FEATURES].sort((a, b) => b.shap - a.shap);
    const data = [];
    
    // Initial baseline
    data.push({
      feature: 'Baseline RUL',
      display: '110.0',
      range: [0, 110.0],
      color: '#9CA3AF'
    });
    
    for (const f of sortedFeatures) {
      const delta = -f.shap * (selectedMachine.health / 50); 
      const next = current + delta;
      data.push({
        feature: f.feature,
        display: `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`,
        range: [current, next],
        color: delta < 0 ? '#EF4444' : '#10B981'
      });
      current = next;
    }
    
    // Final output RUL
    data.push({
      feature: 'Predicted RUL',
      display: `${current.toFixed(1)}`,
      range: [0, current],
      color: '#2563EB'
    });
    
    return data;
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-8">
        <h1 className="page-title">Explainability</h1>
        <p className="page-subtitle">SHAP feature attributions — understand why the model made its prediction</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Machine picker */}
        <div className="card overflow-hidden bg-white">
          <div className="px-4 py-3 border-b border-border">
            <p className="section-title">Select Machine</p>
          </div>
          <div className="divide-y divide-border-subtle">
            {MACHINES.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMachine(m)}
                className={cn(
                  'w-full text-left px-4 py-3 transition-colors duration-150 cursor-pointer',
                  selectedMachine.id === m.id
                    ? 'bg-accent-light border-r-2 border-accent'
                    : 'hover:bg-bg-subtle',
                )}
              >
                <p className={cn('text-[13px] font-medium', selectedMachine.id === m.id ? 'text-accent' : 'text-text-primary')}>
                  {m.name}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="progress-track flex-1">
                    <div
                      className={cn('progress-fill', m.health > 75 ? 'bg-status-healthy' : m.health > 50 ? 'bg-status-warning' : 'bg-status-critical')}
                      style={{ width: `${m.health}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-text-secondary tabular-nums">{m.health}%</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* SHAP Chart + Details */}
        <div className="lg:col-span-3 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-4 bg-white">
              <p className="stat-label">Positive Attribution</p>
              <p className="text-xl font-semibold text-status-critical mt-1.5">+{totalPositive.toFixed(2)}</p>
              <p className="text-[11px] text-text-tertiary mt-1">Factors increasing failure risk</p>
            </div>
            <div className="card p-4 bg-white">
              <p className="stat-label">Negative Attribution</p>
              <p className="text-xl font-semibold text-status-healthy mt-1.5">−{totalNegative.toFixed(2)}</p>
              <p className="text-[11px] text-text-tertiary mt-1">Protective factors</p>
            </div>
            <div className="card p-4 bg-white">
              <p className="stat-label">Net Risk Score</p>
              <p className="text-xl font-semibold text-status-critical mt-1.5">{(totalPositive - totalNegative).toFixed(2)}</p>
              <p className="text-[11px] text-text-tertiary mt-1">Higher = more risk</p>
            </div>
          </div>

          {/* Interactive Plot selection */}
          <div className="card p-5 bg-white">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5 border-b border-gray-100 pb-3">
              <div>
                <p className="section-title">Feature Attribution (SHAP Values)</p>
                <p className="text-[12px] text-text-secondary mt-0.5">{selectedMachine.name} · Stacking Ensemble Model</p>
              </div>
              <div className="flex bg-gray-100 p-0.5 rounded-md border border-gray-200 text-[11px] font-medium">
                {(['summary', 'waterfall', 'force', 'dependence'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setPlotType(tab)}
                    className={cn(
                      "px-3 py-1 rounded-md transition-all cursor-pointer",
                      plotType === tab
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {tab === 'summary' ? 'Summary' :
                     tab === 'waterfall' ? 'Waterfall' :
                     tab === 'force' ? 'Force' : 'Dependence'}
                  </button>
                ))}
              </div>
            </div>

            {plotType === 'summary' && (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={[...SHAP_FEATURES].sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap))}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 120, bottom: 0 }}
                  barSize={14}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="feature" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} width={115} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F9FAFB' }} />
                  <Bar dataKey="shap" radius={[0, 3, 3, 0]}>
                    {SHAP_FEATURES.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.direction === 'positive' ? '#FECACA' : '#A7F3D0'}
                        stroke={entry.direction === 'positive' ? '#DC2626' : '#059669'}
                        strokeWidth={1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {plotType === 'waterfall' && (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={getWaterfallData()} margin={{ top: 10, right: 20, left: -20, bottom: 10 }} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="feature" tick={{ fontSize: 9, fill: '#6B7280' }} angle={-15} textAnchor="end" height={50} />
                  <YAxis type="number" domain={[0, 130]} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} />
                  <Tooltip formatter={(value: any) => [`${(value[1] - value[0]).toFixed(1)} cycles`, 'Delta']} />
                  <Bar dataKey="range" radius={[2, 2, 2, 2]}>
                    {getWaterfallData().map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {plotType === 'force' && (
              <div className="space-y-6 py-4">
                <div className="relative h-10 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex">
                  <div className="h-full bg-emerald-500/20 flex items-center justify-start px-4 text-emerald-800 text-[10px] font-bold" style={{ width: '35%' }}>
                    ← Protective (Reduces Risk)
                  </div>
                  <div className="h-full w-0.5 bg-gray-300" />
                  <div className="h-full bg-red-500/20 flex items-center justify-end px-4 text-red-800 text-[10px] font-bold flex-grow">
                    Increases Failure Risk →
                  </div>
                  
                  <div className="absolute top-0 bottom-0 w-1 bg-blue-600 shadow-md" style={{ left: `${Math.round(100 - selectedMachine.health)}%` }} />
                  <div className="absolute top-1/2 -translate-y-1/2 bg-blue-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm" style={{ left: `${Math.round(100 - selectedMachine.health + 1)}%` }}>
                    RUL: {Math.round(selectedMachine.health * 2.2)} hrs
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[12px]">
                  <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100 space-y-1.5">
                    <p className="font-semibold text-emerald-800 uppercase tracking-wider text-[9px]">Protective Factors</p>
                    <div className="space-y-1">
                      {SHAP_FEATURES.filter(f => f.direction === 'negative').map(f => (
                        <div key={f.feature} className="flex justify-between">
                          <span className="text-gray-600">{f.feature}</span>
                          <span className="font-semibold text-emerald-600">{f.shap.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 bg-red-50/50 rounded-lg border border-red-100 space-y-1.5">
                    <p className="font-semibold text-red-800 uppercase tracking-wider text-[9px]">Risk Drivers</p>
                    <div className="space-y-1">
                      {SHAP_FEATURES.filter(f => f.direction === 'positive').map(f => (
                        <div key={f.feature} className="flex justify-between">
                          <span className="text-gray-600">{f.feature}</span>
                          <span className="font-semibold text-red-600">+{f.shap.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {plotType === 'dependence' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="font-medium">Vibration SHAP Dependence (Temperature Cross-Feature Effect)</span>
                  <span>Non-linear degradation boundary mapping</span>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <ScatterChart margin={{ top: 10, right: 20, left: -20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis type="number" dataKey="value" name="Temperature" unit="°C" tick={{ fontSize: 10 }} axisLine={false} />
                    <YAxis type="number" dataKey="shap" name="SHAP Value" tick={{ fontSize: 10 }} axisLine={false} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter name="SHAP values" data={DEPENDENCE_DATA} fill="#2563EB" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Feature breakdown table */}
          <div className="card overflow-hidden bg-white">
            <div className="px-5 py-4 border-b border-border">
              <p className="section-title">Attribution Details</p>
            </div>
            <div className="table-wrapper">
              <table className="forge-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th className="text-right">SHAP Value</th>
                    <th>Direction</th>
                    <th>Interpretation</th>
                  </tr>
                </thead>
                <tbody>
                  {SHAP_FEATURES.map((f) => (
                    <tr key={f.feature}>
                      <td className="font-medium text-text-primary">{f.feature}</td>
                      <td className="text-right">
                        <span className={cn(
                          'tabular-nums font-mono text-[13px] font-medium',
                          f.direction === 'positive' ? 'text-status-critical' : 'text-status-healthy',
                        )}>
                          {f.shap > 0 ? '+' : ''}{f.shap.toFixed(2)}
                        </span>
                      </td>
                      <td>
                        {f.direction === 'positive'
                          ? <span className="flex items-center gap-1 text-status-critical text-[12px]"><TrendingUp size={12} /> Risk factor</span>
                          : <span className="flex items-center gap-1 text-status-healthy text-[12px]"><TrendingDown size={12} /> Protective</span>
                        }
                      </td>
                      <td className="text-text-secondary text-[12px] max-w-xs">{f.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
