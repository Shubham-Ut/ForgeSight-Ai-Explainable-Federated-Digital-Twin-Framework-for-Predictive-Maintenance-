import React, { useState } from 'react';
import {
  Wrench, Clock, AlertTriangle, CheckCircle, Plus,
  Filter, Search, MoreHorizontal, Calendar, User,
  ChevronRight, TrendingUp,
} from 'lucide-react';
import { cn } from '@shared/utils/cn';

// ── Data ─────────────────────────────────────────────────────────────────────────
const WORK_ORDERS = [
  { id: 'WO-2401', machine: 'Lathe Station 1', type: 'Bearing Replacement', priority: 'critical', status: 'open', assignee: 'T. Weber', due: '2026-07-15', cost: 12400, rul: 24 },
  { id: 'WO-2402', machine: 'CNC Mill Beta', type: 'Spindle Inspection', priority: 'high', status: 'in-progress', assignee: 'M. Fischer', due: '2026-07-17', cost: 3200, rul: 89 },
  { id: 'WO-2403', machine: 'Press Unit 2', type: 'Vibration Analysis', priority: 'medium', status: 'open', assignee: 'K. Braun', due: '2026-07-20', cost: 850, rul: 156 },
  { id: 'WO-2404', machine: 'CNC Mill Alpha', type: 'Lubrication Service', priority: 'low', status: 'scheduled', assignee: 'T. Weber', due: '2026-07-25', cost: 1450, rul: 312 },
  { id: 'WO-2405', machine: 'Assembly Robot A', type: 'Calibration Check', priority: 'low', status: 'completed', assignee: 'M. Fischer', due: '2026-07-12', cost: 620, rul: 418 },
  { id: 'WO-2406', machine: 'Drill Station X', type: 'Coolant Flush', priority: 'medium', status: 'scheduled', assignee: 'K. Braun', due: '2026-07-28', cost: 480, rul: 521 },
];

const STATS = [
  { label: 'Open Orders', value: '3', sub: '1 critical', color: 'text-status-critical' },
  { label: 'In Progress', value: '1', sub: 'On schedule', color: 'text-status-warning' },
  { label: 'This Month Cost', value: '$18.6K', sub: 'Under budget', color: 'text-text-primary' },
  { label: 'MTTR (avg)', value: '4.2h', sub: '↓ 0.8h vs last month', color: 'text-status-healthy' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    critical: 'badge-critical',
    high: 'badge-warning',
    medium: 'badge-neutral',
    low: 'badge-neutral',
  };
  return <span className={map[priority] ?? 'badge-neutral'}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: 'badge-critical',
    'in-progress': 'badge-info',
    scheduled: 'badge-neutral',
    completed: 'badge-healthy',
  };
  const labels: Record<string, string> = {
    'in-progress': 'In Progress',
    scheduled: 'Scheduled',
    completed: 'Completed',
    open: 'Open',
  };
  return <span className={map[status] ?? 'badge-neutral'}>{labels[status] ?? status}</span>;
}

// ── Page ──────────────────────────────────────────────────────────────────────────
export default function MaintenancePage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = WORK_ORDERS.filter(w => {
    const matchesSearch = w.machine.toLowerCase().includes(search.toLowerCase()) ||
      w.type.toLowerCase().includes(search.toLowerCase()) ||
      w.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="page-title">Maintenance</h1>
          <p className="page-subtitle">Work order management and scheduled maintenance operations</p>
        </div>
        <button className="btn-primary">
          <Plus size={14} strokeWidth={2.5} />
          New Work Order
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {STATS.map((s) => (
          <div key={s.label} className="card p-4">
            <p className="stat-label">{s.label}</p>
            <p className={cn('text-2xl font-semibold mt-1.5 tracking-tight', s.color)}>{s.value}</p>
            <p className="text-[11px] text-text-tertiary mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Work Orders Table */}
      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search work orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input w-full"
            />
          </div>
          <div className="flex items-center gap-1 bg-bg-subtle rounded-md p-1 border border-border">
            {(['all', 'open', 'in-progress', 'scheduled', 'completed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-1 rounded text-[12px] font-medium transition-colors duration-150',
                  statusFilter === s
                    ? 'bg-bg-surface text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {s === 'all' ? 'All' : s === 'in-progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-text-tertiary ml-auto">{filtered.length} orders</p>
        </div>

        <div className="table-wrapper">
          <table className="forge-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Machine</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assignee</th>
                <th>Due Date</th>
                <th className="text-right">Est. Cost</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((wo) => (
                <tr key={wo.id}>
                  <td>
                    <span className="font-mono text-[12px] text-text-secondary">{wo.id}</span>
                  </td>
                  <td>
                    <div>
                      <p className="font-medium text-text-primary">{wo.machine}</p>
                      <p className="text-[11px] text-text-tertiary">RUL: {wo.rul}h</p>
                    </div>
                  </td>
                  <td>{wo.type}</td>
                  <td><PriorityBadge priority={wo.priority} /></td>
                  <td><StatusBadge status={wo.status} /></td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center">
                        <span className="text-[9px] font-semibold text-accent">
                          {wo.assignee.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <span className="text-text-secondary">{wo.assignee}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} strokeWidth={1.75} className="text-text-tertiary" />
                      <span className="text-text-secondary tabular-nums">{wo.due}</span>
                    </div>
                  </td>
                  <td className="text-right">
                    <span className="font-medium tabular-nums">${wo.cost.toLocaleString()}</span>
                  </td>
                  <td>
                    <button className="btn-icon">
                      <MoreHorizontal size={14} strokeWidth={1.75} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Wrench size={28} strokeWidth={1.5} className="text-text-tertiary mb-3" />
            <p className="text-[14px] font-medium text-text-primary">No work orders found</p>
            <p className="text-[13px] text-text-secondary mt-1">Try adjusting your search or filter criteria</p>
          </div>
        )}

        <div className="px-5 py-3 border-t border-border bg-bg-base flex items-center justify-between">
          <p className="text-[12px] text-text-tertiary">
            Showing {filtered.length} of {WORK_ORDERS.length} work orders
          </p>
        </div>
      </div>
    </div>
  );
}
