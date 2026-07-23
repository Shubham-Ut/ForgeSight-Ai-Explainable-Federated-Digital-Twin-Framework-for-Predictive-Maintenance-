import React, { useState } from 'react';
import {
  ArrowUp, ArrowDown, ChevronRight, RefreshCw, TrendingUp,
} from 'lucide-react';
import { cn } from '@shared/utils/cn';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// ── Data ─────────────────────────────────────────────────────────────────────────
const HEALTH_TREND = [
  { time: '00:00', avg: 87, min: 72 }, { time: '02:00', avg: 85, min: 68 },
  { time: '04:00', avg: 83, min: 65 }, { time: '06:00', avg: 82, min: 63 },
  { time: '08:00', avg: 84, min: 67 }, { time: '10:00', avg: 86, min: 71 },
  { time: '12:00', avg: 85, min: 70 }, { time: '14:00', avg: 81, min: 62 },
  { time: '16:00', avg: 78, min: 58 }, { time: '18:00', avg: 80, min: 61 },
  { time: '20:00', avg: 82, min: 64 }, { time: '22:00', avg: 84, min: 68 },
];

const ALERT_FREQ = [
  { day: 'Mon', critical: 2, warning: 5 }, { day: 'Tue', critical: 1, warning: 4 },
  { day: 'Wed', critical: 4, warning: 7 }, { day: 'Thu', critical: 0, warning: 3 },
  { day: 'Fri', critical: 3, warning: 6 }, { day: 'Sat', critical: 1, warning: 2 },
  { day: 'Sun', critical: 0, warning: 1 },
];

const MACHINES = [
  { id: 'CNC-001', name: 'CNC Mill Alpha', factory: 'Munich Plant', health: 91, rul: 312, status: 'healthy', alerts: 0, lastUpdate: '2 min ago' },
  { id: 'CNC-002', name: 'CNC Mill Beta', factory: 'Munich Plant', health: 67, rul: 89, status: 'warning', alerts: 2, lastUpdate: '1 min ago' },
  { id: 'CNC-003', name: 'Lathe Station 1', factory: 'Stuttgart Plant', health: 43, rul: 24, status: 'critical', alerts: 4, lastUpdate: '30 sec ago' },
  { id: 'CNC-004', name: 'Assembly Robot A', factory: 'Hamburg Plant', health: 88, rul: 418, status: 'healthy', alerts: 0, lastUpdate: '3 min ago' },
  { id: 'CNC-005', name: 'Press Unit 2', factory: 'Leipzig Plant', health: 75, rul: 156, status: 'warning', alerts: 1, lastUpdate: '1 min ago' },
  { id: 'CNC-006', name: 'Drill Station X', factory: 'Stuttgart Plant', health: 94, rul: 521, status: 'healthy', alerts: 0, lastUpdate: '4 min ago' },
];

const RECENT_ALERTS = [
  { id: 1, machine: 'Lathe Station 1', type: 'Bearing degradation', severity: 'critical', time: '4 min ago' },
  { id: 2, machine: 'CNC Mill Beta', type: 'Temperature spike', severity: 'warning', time: '12 min ago' },
  { id: 3, machine: 'Press Unit 2', type: 'Vibration anomaly', severity: 'warning', time: '28 min ago' },
  { id: 4, machine: 'Lathe Station 1', type: 'Coolant pressure low', severity: 'critical', time: '41 min ago' },
  { id: 5, machine: 'CNC Mill Beta', type: 'Spindle current high', severity: 'warning', time: '1 hr ago' },
];

// ── Utils ─────────────────────────────────────────────────────────────────────────
function healthColor(h: number) {
  return h > 75 ? 'bg-emerald-500' : h > 50 ? 'bg-amber-400' : 'bg-red-500';
}
function statusBadgeClass(s: string) {
  return s === 'healthy' ? 'badge-healthy' : s === 'warning' ? 'badge-warning' : 'badge-critical';
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card p-2.5 shadow-md text-[12px] min-w-[100px]">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((e: any, i: number) => (
        <div key={i} className="flex justify-between gap-3">
          <span className="text-gray-500 capitalize">{e.name}</span>
          <span className="font-medium text-gray-900">{e.value}</span>
        </div>
      ))}
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => { setRefreshing(false); setLastRefresh(new Date()); }, 1000);
  };

  const healthyCount = MACHINES.filter(m => m.status === 'healthy').length;
  const warningCount = MACHINES.filter(m => m.status === 'warning').length;
  const criticalCount = MACHINES.filter(m => m.status === 'critical').length;

  const stats = [
    { label: 'Fleet Health Score', value: '81.4%', change: '−2.1%', positive: false, dir: 'down' },
    { label: 'Avg Remaining Life', value: '253h', change: '+18h', positive: true, dir: 'up' },
    { label: 'Active Machines', value: '6/6', change: 'All online', positive: true, dir: 'neutral' },
    { label: 'Open Alerts', value: '7', change: '3 critical', positive: false, dir: 'up' },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Fleet-wide health overview across 4 manufacturing facilities</p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[12px] text-gray-400 hidden sm:block">
            {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          <button onClick={handleRefresh} disabled={refreshing} className="btn-secondary btn-sm">
            <RefreshCw size={13} strokeWidth={2} className={cn(refreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="stat-label">{s.label}</p>
            <div className="flex items-end justify-between mt-2">
              <span className="stat-value">{s.value}</span>
              <span className={cn('text-[12px] font-medium flex items-center gap-0.5', s.positive ? 'text-emerald-600' : 'text-red-500')}>
                {s.dir === 'up' && <ArrowUp size={11} strokeWidth={2.5} />}
                {s.dir === 'down' && <ArrowDown size={11} strokeWidth={2.5} />}
                {s.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Fleet Status Bar */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-6 flex-wrap gap-y-2">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-[0.08em]">Fleet Status</p>
          <div className="flex items-center gap-5">
            {[
              { label: 'Healthy', count: healthyCount, dotClass: 'bg-emerald-500' },
              { label: 'Warning', count: warningCount, dotClass: 'bg-amber-400' },
              { label: 'Critical', count: criticalCount, dotClass: 'bg-red-500' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full', s.dotClass)} />
                <span className="text-[13px] font-medium text-gray-900">{s.count}</span>
                <span className="text-[12px] text-gray-500">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="flex-1 min-w-[120px]">
            <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
              <div className="bg-emerald-500" style={{ width: `${(healthyCount / MACHINES.length) * 100}%` }} />
              <div className="bg-amber-400" style={{ width: `${(warningCount / MACHINES.length) * 100}%` }} />
              <div className="bg-red-500" style={{ width: `${(criticalCount / MACHINES.length) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Health Trend */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="section-title">Fleet Health Trend</p>
              <p className="text-[12px] text-gray-500 mt-0.5">24-hour rolling average and minimum</p>
            </div>
            <span className="badge-neutral">Last 24h</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={HEALTH_TREND} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="avgGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis domain={[50, 100]} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="avg" stroke="#2563EB" strokeWidth={1.5} fill="url(#avgGrad)" name="Avg" dot={false} />
              <Area type="monotone" dataKey="min" stroke="#EF4444" strokeWidth={1.5} fill="none" name="Min" dot={false} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Alert Frequency */}
        <div className="card p-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="section-title">Alert Frequency</p>
              <p className="text-[12px] text-gray-500 mt-0.5">This week</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ALERT_FREQ} margin={{ top: 0, right: 0, left: -28, bottom: 0 }} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="warning" fill="#FDE68A" radius={[2, 2, 0, 0]} name="Warning" />
              <Bar dataKey="critical" fill="#FECACA" radius={[2, 2, 0, 0]} name="Critical" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Machine Table */}
        <div className="card lg:col-span-3 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <p className="section-title">Machine Fleet</p>
            <a href="/predictions" className="flex items-center gap-1 text-[12px] text-blue-600 hover:text-blue-700 transition-colors">
              View all <ChevronRight size={12} strokeWidth={2} />
            </a>
          </div>
          <div className="table-wrapper">
            <table className="forge-table">
              <thead>
                <tr>
                  <th>Machine</th>
                  <th>Factory</th>
                  <th>Health</th>
                  <th>RUL</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {MACHINES.map((m) => (
                  <tr key={m.id} className="cursor-pointer">
                    <td>
                      <div>
                        <p className="font-medium text-gray-900 text-[13px]">{m.name}</p>
                        <p className="text-[11px] text-gray-400">{m.id}</p>
                      </div>
                    </td>
                    <td><span className="text-gray-500">{m.factory}</span></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="progress-track w-14">
                          <div className={cn('progress-fill', healthColor(m.health))} style={{ width: `${m.health}%` }} />
                        </div>
                        <span className="text-[12px] font-medium text-gray-900 tabular-nums">{m.health}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={cn('text-[13px] font-medium tabular-nums', m.rul < 50 ? 'text-red-600' : m.rul < 100 ? 'text-amber-600' : 'text-gray-900')}>
                        {m.rul}h
                      </span>
                    </td>
                    <td><span className={statusBadgeClass(m.status)}>{m.status.charAt(0).toUpperCase() + m.status.slice(1)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="card lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <p className="section-title">Recent Alerts</p>
            <span className="badge-critical">{RECENT_ALERTS.filter(a => a.severity === 'critical').length} critical</span>
          </div>
          <div className="divide-y divide-gray-50">
            {RECENT_ALERTS.map((alert) => (
              <div key={alert.id} className="px-5 py-3.5 hover:bg-gray-50 transition-colors duration-150 cursor-pointer">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', alert.severity === 'critical' ? 'bg-red-500' : 'bg-amber-400')} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 truncate">{alert.type}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{alert.machine}</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-400 flex-shrink-0 mt-0.5">{alert.time}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-gray-100">
            <a href="/maintenance" className="flex items-center gap-1 text-[12px] text-blue-600 hover:text-blue-700 transition-colors">
              View all alerts <ChevronRight size={12} strokeWidth={2} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
