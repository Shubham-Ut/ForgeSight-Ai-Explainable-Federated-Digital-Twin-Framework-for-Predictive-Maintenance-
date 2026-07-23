import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Box, Activity, FlaskConical, Network,
  MessageSquare, Camera, Wrench, FileText,
  ChevronLeft, Bell, Settings, Wifi, WifiOff, Menu, X,
  Zap, Shield,
} from 'lucide-react';
import { cn } from '@shared/utils/cn';
import { useAlertStore } from '@shared/stores/useAlertStore';

// ── Types & Navigation ──────────────────────────────────────────────────────────
interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/digital-twin',   icon: Box,          label: 'Digital Twin' },
      { to: '/predictions',    icon: Activity,     label: 'Predictions' },
      { to: '/explainability', icon: FlaskConical, label: 'Explainability' },
      { to: '/federated',      icon: Network,      label: 'Federated' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/assistant',   icon: MessageSquare, label: 'AI Assistant' },
      { to: '/vision',      icon: Camera,        label: 'Computer Vision' },
      { to: '/maintenance', icon: Wrench,        label: 'Maintenance' },
      { to: '/reports',     icon: FileText,      label: 'Reports' },
    ],
  },
];

const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap(g => g.items);

// ── Logo ────────────────────────────────────────────────────────────────────────
function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="flex-shrink-0 w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
        <Zap size={14} className="text-white" strokeWidth={2.5} />
      </div>
      {!collapsed && (
        <div className="min-w-0 overflow-hidden">
          <p className="text-[13px] font-semibold text-gray-900 leading-none tracking-tight">ForgeSight</p>
          <p className="text-[10px] text-gray-400 leading-none mt-0.5">AI Platform</p>
        </div>
      )}
    </div>
  );
}

// ── Nav Item ────────────────────────────────────────────────────────────────────
function SideNavItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink to={item.to} end={item.to === '/dashboard'}>
      {({ isActive }) => (
        <div
          title={collapsed ? item.label : undefined}
          className={cn(
            'group relative flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-colors duration-150 cursor-pointer select-none',
            isActive
              ? 'bg-blue-50 text-blue-600'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50',
          )}
        >
          <Icon
            size={16}
            strokeWidth={isActive ? 2 : 1.75}
            className={cn('flex-shrink-0 transition-colors duration-150', isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600')}
          />
          {!collapsed && <span className="truncate">{item.label}</span>}
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-blue-600 rounded-r-full" />
          )}
          {collapsed && (
            <div className="absolute left-full ml-2.5 z-50 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none shadow-lg">
              {item.label}
            </div>
          )}
        </div>
      )}
    </NavLink>
  );
}

// ── Sidebar ─────────────────────────────────────────────────────────────────────
function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside
      className="relative flex flex-col h-full bg-white border-r border-gray-200 overflow-hidden transition-all duration-200"
      style={{ width: collapsed ? 64 : 240 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100 flex-shrink-0">
        <Logo collapsed={collapsed} />
        <button onClick={onToggle} className="btn-icon flex-shrink-0" title={collapsed ? 'Expand' : 'Collapse'} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <ChevronLeft size={15} strokeWidth={1.75} className={cn('transition-transform duration-200', collapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-6 scrollbar-thin">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="space-y-0.5">
            {!collapsed && (
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-[0.08em] px-2.5 mb-2">
                {group.label}
              </p>
            )}
            {group.items.map((item) => (
              <SideNavItem key={item.to} item={item} collapsed={collapsed} />
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-gray-100 px-3 py-3 space-y-1">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-emerald-50 border border-emerald-100">
            <Shield size={13} strokeWidth={2} className="text-emerald-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-emerald-700 leading-none">Privacy Active</p>
              <p className="text-[10px] text-gray-400 font-mono leading-none mt-0.5">ε=2.8 · Federated</p>
            </div>
          </div>
        )}
        <button className="nav-item w-full">
          <Settings size={16} strokeWidth={1.75} className="flex-shrink-0 text-gray-400" />
          {!collapsed && <span>Settings</span>}
        </button>
      </div>
    </aside>
  );
}

// ── Top Header ──────────────────────────────────────────────────────────────────
function TopHeader({ onMobileMenuOpen }: { onMobileMenuOpen: () => void }) {
  const location = useLocation();
  const { unacknowledgedCount, criticalCount } = useAlertStore();
  const [isOnline, setIsOnline] = useState(true);

  React.useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const pageTitle = ALL_NAV_ITEMS.find((n) => location.pathname.startsWith(n.to))?.label ?? 'ForgeSight';

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-gray-200 bg-white flex-shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onMobileMenuOpen} className="md:hidden btn-icon" aria-label="Open menu">
          <Menu size={16} strokeWidth={1.75} />
        </button>
        <h1 className="text-[15px] font-semibold text-gray-900">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Live indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 mr-1">
          <div className="live-dot" />
          <span className="text-[11px] font-medium text-emerald-700">Live</span>
        </div>

        {/* Connectivity */}
        <div className={cn(
          'hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium mr-1',
          isOnline
            ? 'bg-blue-50 border-blue-100 text-blue-600'
            : 'bg-red-50 border-red-100 text-red-600',
        )}>
          {isOnline ? <Wifi size={11} strokeWidth={2} /> : <WifiOff size={11} strokeWidth={2} />}
          {isOnline ? 'Online' : 'Offline'}
        </div>

        {/* Alerts */}
        <button className="btn-icon relative" aria-label="Alerts">
          <Bell size={16} strokeWidth={1.75} />
          {unacknowledgedCount > 0 && (
            <span className={cn(
              'absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full text-[9px] font-bold flex items-center justify-center text-white',
              criticalCount > 0 ? 'bg-red-500' : 'bg-amber-500',
            )}>
              {unacknowledgedCount > 9 ? '9+' : unacknowledgedCount}
            </span>
          )}
        </button>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* User avatar & Role Selector */}
        <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 border border-gray-200 rounded-md">
          <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-semibold text-blue-600">SU</span>
          </div>
          <div className="flex flex-col text-left">
            <span className="hidden sm:block text-[11px] font-medium text-gray-900 leading-none">Shubham</span>
            <select
              value={localStorage.getItem('forgesight_role') || 'Maintenance Engineer'}
              onChange={(e) => {
                localStorage.setItem('forgesight_role', e.target.value);
                window.dispatchEvent(new Event('role-changed'));
                // Force state reload
                window.location.reload();
              }}
              className="text-[10px] bg-transparent font-semibold text-blue-600 focus:outline-none border-none p-0 cursor-pointer mt-0.5"
            >
              <option value="Maintenance Engineer">Engineer</option>
              <option value="Plant Manager">Plant Manager</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}

// ── Main Layout ──────────────────────────────────────────────────────────────────
export function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col flex-shrink-0">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(v => !v)} />
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 md:hidden animate-fade-in" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-60 z-50 md:hidden shadow-lg animate-slide-up">
            <Sidebar collapsed={false} onToggle={() => setMobileMenuOpen(false)} />
            <button onClick={() => setMobileMenuOpen(false)} className="absolute top-3 right-3 btn-icon">
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopHeader onMobileMenuOpen={() => setMobileMenuOpen(true)} />
        <main key={location.pathname} className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
