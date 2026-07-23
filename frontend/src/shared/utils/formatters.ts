/**
 * ForgeSight AI — Formatting Utility Functions
 * Centralised data formatting for consistent display across all views
 */
import { format, formatDistanceToNow, parseISO } from 'date-fns';

// ── RUL Formatting ──────────────────────────────────────────────────────────────

/**
 * Format Remaining Useful Life in cycles or hours
 */
export function formatRUL(cycles: number): string {
  if (cycles < 0) return 'OVERDUE';
  if (cycles === 0) return '< 1 cycle';
  if (cycles >= 10_000) return `${(cycles / 1000).toFixed(1)}k cycles`;
  return `${Math.round(cycles)} cycles`;
}

/**
 * Format RUL as estimated hours
 */
export function formatRULHours(cycles: number, hoursPerCycle = 0.5): string {
  const hours = cycles * hoursPerCycle;
  if (hours < 1) return '< 1 hr';
  if (hours < 24) return `${Math.round(hours)} hrs`;
  const days = Math.floor(hours / 24);
  const remHours = Math.round(hours % 24);
  return remHours > 0 ? `${days}d ${remHours}h` : `${days} days`;
}

// ── Health Score ────────────────────────────────────────────────────────────────

export interface HealthConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  badgeClass: string;
  gaugeFill: string;
}

export function getHealthConfig(score: number): HealthConfig {
  if (score >= 75) return {
    label: 'Healthy',
    color: '#10b981',
    bgColor: 'bg-emerald-950/60',
    borderColor: 'border-emerald-900/50',
    textColor: 'text-emerald-400',
    badgeClass: 'badge-healthy',
    gaugeFill: '#10b981',
  };
  if (score >= 50) return {
    label: 'Warning',
    color: '#f59e0b',
    bgColor: 'bg-amber-950/60',
    borderColor: 'border-amber-900/50',
    textColor: 'text-amber-400',
    badgeClass: 'badge-warning',
    gaugeFill: '#f59e0b',
  };
  if (score >= 25) return {
    label: 'Critical',
    color: '#f43f5e',
    bgColor: 'bg-rose-950/60',
    borderColor: 'border-rose-900/50',
    textColor: 'text-rose-400',
    badgeClass: 'badge-critical',
    gaugeFill: '#f43f5e',
  };
  return {
    label: 'Failed',
    color: '#dc2626',
    bgColor: 'bg-red-950/80',
    borderColor: 'border-red-900/60',
    textColor: 'text-red-400',
    badgeClass: 'badge-critical',
    gaugeFill: '#dc2626',
  };
}

export function getHealthColor(score: number): string {
  return getHealthConfig(score).color;
}

// ── Severity ────────────────────────────────────────────────────────────────────

export interface SeverityConfig {
  color: string;
  bgColor: string;
  borderColor: string;
  textClass: string;
  label: string;
}

export function getSeverityConfig(severity: string): SeverityConfig {
  const map: Record<string, SeverityConfig> = {
    info: { color: '#60a5fa', bgColor: 'bg-blue-950/60', borderColor: 'border-blue-900/50', textClass: 'text-blue-400', label: 'Info' },
    warning: { color: '#f59e0b', bgColor: 'bg-amber-950/60', borderColor: 'border-amber-900/50', textClass: 'text-amber-400', label: 'Warning' },
    critical: { color: '#f43f5e', bgColor: 'bg-rose-950/60', borderColor: 'border-rose-900/50', textClass: 'text-rose-400', label: 'Critical' },
    emergency: { color: '#dc2626', bgColor: 'bg-red-950/80', borderColor: 'border-red-900/60', textClass: 'text-red-400', label: 'Emergency' },
  };
  return map[severity] ?? map['info'];
}

// ── Sensor Values ───────────────────────────────────────────────────────────────

export function formatSensorValue(value: number, unit: string, precision = 1): string {
  if (isNaN(value) || value === null || value === undefined) return '—';
  return `${value.toFixed(precision)} ${unit}`;
}

export function formatPercent(value: number, precision = 1): string {
  return `${Math.min(100, Math.max(0, value)).toFixed(precision)}%`;
}

// ── Time & Duration ─────────────────────────────────────────────────────────────

export function formatTimestamp(ts: string): string {
  try {
    return format(parseISO(ts), 'MMM d, yyyy HH:mm:ss');
  } catch {
    return ts;
  }
}

export function formatTimeAgo(ts: string): string {
  try {
    return formatDistanceToNow(parseISO(ts), { addSuffix: true });
  } catch {
    return 'Unknown';
  }
}

export function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${hours.toFixed(1)} hrs`;
  const days = Math.floor(hours / 24);
  const rem = Math.round(hours % 24);
  return rem > 0 ? `${days}d ${rem}h` : `${days} days`;
}

// ── Currency ────────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Numbers ─────────────────────────────────────────────────────────────────────

export function formatNumber(n: number, precision = 2): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(precision);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

// ── Failure Probability Color ───────────────────────────────────────────────────

export function getFailureProbColor(prob: number): string {
  if (prob < 20) return '#10b981';
  if (prob < 50) return '#f59e0b';
  if (prob < 75) return '#f97316';
  return '#f43f5e';
}
