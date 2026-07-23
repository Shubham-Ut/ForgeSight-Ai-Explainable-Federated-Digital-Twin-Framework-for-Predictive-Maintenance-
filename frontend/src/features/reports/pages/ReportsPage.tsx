import React, { useState } from 'react';
import {
  Download, FileText, Calendar, Filter,
  BarChart2, TrendingUp, Activity, Server,
  Clock, CheckCircle, ChevronRight,
} from 'lucide-react';
import { cn } from '@shared/utils/cn';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';

// ── Data ─────────────────────────────────────────────────────────────────────────
const MONTHLY_DOWNTIME = [
  { month: 'Jan', planned: 12, unplanned: 8 },
  { month: 'Feb', planned: 10, unplanned: 15 },
  { month: 'Mar', planned: 14, unplanned: 6 },
  { month: 'Apr', planned: 8, unplanned: 11 },
  { month: 'May', planned: 12, unplanned: 4 },
  { month: 'Jun', planned: 10, unplanned: 7 },
  { month: 'Jul', planned: 6, unplanned: 3 },
];

const FLEET_OEE = [
  { week: 'W1', oee: 74.2 }, { week: 'W2', oee: 76.8 },
  { week: 'W3', oee: 75.1 }, { week: 'W4', oee: 78.4 },
  { week: 'W5', oee: 79.2 }, { week: 'W6', oee: 81.0 },
  { week: 'W7', oee: 82.3 }, { week: 'W8', oee: 83.7 },
];

const REPORTS = [
  { id: 'RPT-2024-07', title: 'Monthly Fleet Health Report', period: 'July 2026', status: 'ready', size: '2.4 MB', generated: '2026-07-01' },
  { id: 'RPT-2024-06', title: 'Monthly Fleet Health Report', period: 'June 2026', status: 'ready', size: '2.1 MB', generated: '2026-06-01' },
  { id: 'RPT-2024-FL', title: 'Federated Learning Round Summary', period: 'Rounds 42–58', status: 'ready', size: '1.8 MB', generated: '2026-07-10' },
  { id: 'RPT-2024-MA', title: 'Maintenance Cost Analysis', period: 'Q2 2026', status: 'ready', size: '3.2 MB', generated: '2026-07-05' },
  { id: 'RPT-2024-XAI', title: 'XAI Attribution Audit', period: 'July 2026', status: 'generating', size: '—', generated: '—' },
];

const KPI_STATS = [
  { label: 'Fleet OEE', value: '83.7%', change: '+4.2%', positive: true },
  { label: 'MTBF', value: '412h', change: '+28h', positive: true },
  { label: 'Maintenance Cost', value: '$18.6K', change: '−$2.4K', positive: true },
  { label: 'Unplanned Downtime', value: '3h', change: '−8h', positive: true },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card p-2.5 shadow-md text-[12px]">
      <p className="text-text-secondary mb-1">{label}</p>
      {payload.map((e: any, i: number) => (
        <div key={i} className="flex justify-between gap-3">
          <span className="text-text-tertiary capitalize">{e.name}</span>
          <span className="font-medium">{e.value}</span>
        </div>
      ))}
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month');

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Performance analytics and downloadable fleet diagnostics</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-bg-subtle rounded-md p-1 border border-border">
            {(['week', 'month', 'quarter'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-3 py-1 rounded text-[12px] font-medium transition-colors duration-150 capitalize',
                  period === p ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <button className="btn-primary">
            <Download size={13} strokeWidth={2} />
            Export All
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {KPI_STATS.map((s) => (
          <div key={s.label} className="card p-4">
            <p className="stat-label">{s.label}</p>
            <p className="text-2xl font-semibold text-text-primary mt-1.5 tracking-tight">{s.value}</p>
            <p className={cn('text-[11px] font-medium mt-1', s.positive ? 'text-status-healthy' : 'text-status-critical')}>
              {s.change} vs last period
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Downtime */}
        <div className="card p-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="section-title">Downtime Analysis</p>
              <p className="text-[12px] text-text-secondary mt-0.5">Planned vs unplanned (hours)</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MONTHLY_DOWNTIME} margin={{ top: 0, right: 0, left: -28, bottom: 0 }} barSize={14} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="planned" fill="#BFDBFE" radius={[2, 2, 0, 0]} name="Planned" />
              <Bar dataKey="unplanned" fill="#FECACA" radius={[2, 2, 0, 0]} name="Unplanned" />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3">
            <span className="flex items-center gap-1.5 text-[11px] text-text-secondary">
              <span className="w-3 h-2 rounded-sm bg-status-info-border inline-block" /> Planned
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-text-secondary">
              <span className="w-3 h-2 rounded-sm bg-status-critical-border inline-block" /> Unplanned
            </span>
          </div>
        </div>

        {/* OEE Trend */}
        <div className="card p-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="section-title">Overall Equipment Effectiveness</p>
              <p className="text-[12px] text-text-secondary mt-0.5">8-week OEE trend</p>
            </div>
            <span className="badge-healthy">Improving</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={FLEET_OEE} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis domain={[65, 90]} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="oee" stroke="#2563EB" strokeWidth={2} dot={{ fill: '#2563EB', r: 3, strokeWidth: 0 }} name="OEE %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Report Library */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <p className="section-title">Report Library</p>
          </div>
          <span className="badge-neutral">{REPORTS.length} reports</span>
        </div>
        <div className="table-wrapper">
          <table className="forge-table">
            <thead>
              <tr>
                <th>Report</th>
                <th>Period</th>
                <th>Generated</th>
                <th>Size</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {REPORTS.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <FileText size={14} strokeWidth={1.75} className="text-text-tertiary flex-shrink-0" />
                      <div>
                        <p className="font-medium text-text-primary">{r.title}</p>
                        <p className="text-[11px] text-text-tertiary font-mono">{r.id}</p>
                      </div>
                    </div>
                  </td>
                  <td><span className="text-text-secondary">{r.period}</span></td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} strokeWidth={1.75} className="text-text-tertiary" />
                      <span className="text-text-secondary tabular-nums text-[12px]">{r.generated}</span>
                    </div>
                  </td>
                  <td><span className="text-text-secondary tabular-nums">{r.size}</span></td>
                  <td>
                    <span className={r.status === 'ready' ? 'badge-healthy' : 'badge-neutral'}>
                      {r.status === 'ready' ? 'Ready' : 'Generating…'}
                    </span>
                  </td>
                  <td>
                    {r.status === 'ready' && (
                      <button className="btn-ghost btn-sm text-accent hover:text-accent-hover">
                        <Download size={13} strokeWidth={2} />
                        Download
                      </button>
                    )}
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
