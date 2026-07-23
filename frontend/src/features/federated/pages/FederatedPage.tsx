import React, { useState, useEffect } from 'react';
import {
  Network, Shield, Activity, Server, RefreshCw,
  CheckCircle, Clock, ArrowRight, Layers,
} from 'lucide-react';
import { cn } from '@shared/utils/cn';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ── Data ─────────────────────────────────────────────────────────────────────────
const CLIENTS = [
  { id: 'C1', name: 'Munich Plant', status: 'active', rounds: 58, accuracy: 94.2, samples: 12400, last: '2 min ago', contribution: 34 },
  { id: 'C2', name: 'Stuttgart Plant', status: 'active', rounds: 58, accuracy: 91.8, samples: 8900, last: '1 min ago', contribution: 26 },
  { id: 'C3', name: 'Hamburg Plant', status: 'active', rounds: 57, accuracy: 93.1, samples: 11200, last: '3 min ago', contribution: 31 },
  { id: 'C4', name: 'Leipzig Plant', status: 'syncing', rounds: 56, accuracy: 89.4, samples: 6800, last: '8 min ago', contribution: 9 },
];

const CONVERGENCE = Array.from({ length: 58 }, (_, i) => ({
  round: i + 1,
  global: Math.min(94.5, 60 + 34.5 * (1 - Math.exp(-i / 12)) + (Math.random() - 0.5) * 1.5),
  local: Math.min(93.0, 58 + 35 * (1 - Math.exp(-i / 14)) + (Math.random() - 0.5) * 2),
})).filter((_, i) => i % 4 === 0);

const STATS = [
  { label: 'Training Rounds', value: '58', sub: 'Completed' },
  { label: 'Active Clients', value: '4', sub: 'Participating' },
  { label: 'Global Accuracy', value: '94.2%', sub: 'FedProx aggregate' },
  { label: 'Privacy Budget', value: 'ε=2.8', sub: 'DP-SGD active' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card p-2.5 shadow-md text-[12px]">
      <p className="text-text-secondary mb-1">Round {label}</p>
      {payload.map((e: any, i: number) => (
        <div key={i} className="flex justify-between gap-3">
          <span className="text-text-tertiary">{e.name}</span>
          <span className="font-medium">{e.value.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────────
export default function FederatedPage() {
  const [currentRound, setCurrentRound] = useState(58);
  const [isTraining, setIsTraining] = useState(false);

  const handleNextRound = () => {
    setIsTraining(true);
    setTimeout(() => {
      setCurrentRound(r => r + 1);
      setIsTraining(false);
    }, 2500);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="page-title">Federated Learning</h1>
          <p className="page-subtitle">Distributed model training across {CLIENTS.length} factory nodes with differential privacy</p>
        </div>
        <button onClick={handleNextRound} disabled={isTraining} className="btn-primary">
          {isTraining
            ? <RefreshCw size={13} strokeWidth={2} className="animate-spin" />
            : <ArrowRight size={13} strokeWidth={2} />
          }
          {isTraining ? 'Aggregating…' : 'Run Round'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {STATS.map((s) => (
          <div key={s.label} className="card p-4">
            <p className="stat-label">{s.label}</p>
            <p className="text-2xl font-semibold text-text-primary mt-1.5 tracking-tight">{
              s.label === 'Training Rounds' ? currentRound : s.value
            }</p>
            <p className="text-[11px] text-text-tertiary mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Convergence chart + client list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Convergence */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="section-title">Model Convergence</p>
              <p className="text-[12px] text-text-secondary mt-0.5">Global vs local accuracy over training rounds</p>
            </div>
            <span className="badge-healthy">FedProx</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={CONVERGENCE} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="round" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} label={{ value: 'Round', position: 'insideBottom', offset: -4, fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis domain={[55, 100]} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="global" stroke="#2563EB" strokeWidth={2} dot={false} name="Global" />
              <Line type="monotone" dataKey="local" stroke="#9CA3AF" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="Local avg" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-[11px] text-text-secondary">
              <span className="w-4 h-px bg-accent inline-block align-middle" style={{ display: 'inline-block', height: 2 }} /> Global model
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-text-secondary">
              <span className="w-4 inline-block align-middle border-t border-dashed border-text-tertiary" /> Local average
            </span>
          </div>
        </div>

        {/* Privacy info */}
        <div className="card p-5 flex flex-col gap-4">
          <div>
            <p className="section-title mb-3">Privacy Guarantees</p>
            <div className="space-y-3">
              {[
                { label: 'Mechanism', value: 'DP-SGD' },
                { label: 'ε (epsilon)', value: '2.8' },
                { label: 'δ (delta)', value: '1e-5' },
                { label: 'Clip norm', value: '1.2' },
                { label: 'Noise mult.', value: '0.8' },
                { label: 'Aggregation', value: 'FedProx' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[12px] text-text-secondary">{label}</span>
                  <span className="text-[12px] font-mono font-medium text-text-primary">{value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-auto p-3 bg-status-healthy-bg border border-status-healthy-border rounded-md">
            <div className="flex items-center gap-2">
              <Shield size={14} strokeWidth={2} className="text-status-healthy" />
              <p className="text-[12px] font-medium text-status-healthy">Raw data never leaves factories</p>
            </div>
          </div>
        </div>
      </div>

      {/* Client Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <p className="section-title">Participant Nodes</p>
          <div className="flex items-center gap-1.5">
            <div className="live-dot" />
            <span className="text-[12px] text-status-healthy">3 active</span>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="forge-table">
            <thead>
              <tr>
                <th>Factory</th>
                <th>Status</th>
                <th className="text-right">Rounds</th>
                <th className="text-right">Local Accuracy</th>
                <th className="text-right">Samples</th>
                <th>Contribution</th>
                <th>Last Sync</th>
              </tr>
            </thead>
            <tbody>
              {CLIENTS.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Server size={14} strokeWidth={1.75} className="text-text-tertiary" />
                      <span className="font-medium text-text-primary">{c.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className={c.status === 'active' ? 'badge-healthy' : 'badge-warning'}>
                      {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                    </span>
                  </td>
                  <td className="text-right tabular-nums">{c.rounds}</td>
                  <td className="text-right tabular-nums font-medium">{c.accuracy}%</td>
                  <td className="text-right tabular-nums text-text-secondary">{c.samples.toLocaleString()}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="progress-track w-16">
                        <div className="progress-fill bg-accent" style={{ width: `${c.contribution}%` }} />
                      </div>
                      <span className="text-[12px] text-text-secondary tabular-nums">{c.contribution}%</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} strokeWidth={1.75} className="text-text-tertiary" />
                      <span className="text-text-secondary text-[12px]">{c.last}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
