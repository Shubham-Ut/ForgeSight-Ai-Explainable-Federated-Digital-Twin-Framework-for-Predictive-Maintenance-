import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Activity, 
  Cpu, 
  Zap, 
  AlertTriangle, 
  Clock, 
  Power, 
  Play, 
  Pause,
  AlertCircle,
  TrendingUp,
  Server,
  Compass,
  ArrowUpRight,
  ShieldAlert,
  Sliders,
  CheckCircle,
  Info
} from 'lucide-react';
import { MachineDigitalTwin, FactoryDetails } from '../types';

interface DashboardProps {
  factories: Record<string, FactoryDetails>;
  machines: Record<string, Record<string, MachineDigitalTwin>>;
  onSelectFactory: (id: string) => void;
  onSelectMachine: (factoryId: string, machineId: string) => void;
  onNavigate: (tab: string) => void;
  activeAlarmsCount: number;
}

export default function Dashboard({
  factories,
  machines,
  onSelectFactory,
  onSelectMachine,
  onNavigate,
  activeAlarmsCount
}: DashboardProps) {
  const [showForecast, setShowForecast] = useState<boolean>(true);
  const [mqttLogs, setMqttLogs] = useState<string[]>([
    "[11:42:01] [OPCUA] Read Node ns=2;s=CNC_Spindle_Torque → 41.8 Nm",
    "[11:42:01] [MQTT] Pub 'factory/munich/cnc-101/telemetry': {torque: 41.8, speed: 1845}",
    "[11:41:58] [OPCUA] Read Node ns=2;s=Coolant_Pressure → 4.2 bar",
    "[11:41:58] [MQTT] Pub 'factory/munich/cnc-101/telemetry': {coolant: 4.2, temp: 62.4}"
  ]);

  // Simulate dynamic real-time IoT MQTT & OPC UA data ingestion from Munich factory
  useEffect(() => {
    const interval = setInterval(() => {
      const nodes = [
        { name: "CNC_Spindle_Speed", base: 1800, range: 100, unit: "rpm", topic: "speed" },
        { name: "CNC_Spindle_Torque", base: 40, range: 5, unit: "Nm", topic: "torque" },
        { name: "Bearing_Vibration", base: 0.12, range: 0.05, unit: "mm/s", topic: "vibration" },
        { name: "Motor_Temperature", base: 60, range: 4, unit: "°C", topic: "temp" },
        { name: "Coolant_Flow", base: 38.5, range: 2.0, unit: "L/min", topic: "coolant" }
      ];
      const selected = nodes[Math.floor(Math.random() * nodes.length)];
      const rawVal = selected.base + Math.random() * selected.range;
      const formattedVal = selected.unit === "mm/s" ? rawVal.toFixed(3) : rawVal.toFixed(1);
      
      const timeStr = new Date().toTimeString().split(' ')[0];
      const opcLine = `[${timeStr}] [OPCUA] Read Node ns=2;s=${selected.name} → ${formattedVal} ${selected.unit}`;
      const mqttLine = `[${timeStr}] [MQTT] Pub 'factory/munich/cnc-101/telemetry': {${selected.topic}: ${formattedVal}}`;

      setMqttLogs(prev => [opcLine, mqttLine, ...prev.slice(0, 15)]);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Flatten machines for comprehensive calculations
  const allMachines = Object.entries(machines).flatMap(([fId, fMacs]) => 
    Object.values(fMacs).map(mac => ({
      ...mac,
      factoryId: fId,
      factoryName: factories[fId]?.name || fId
    }))
  );

  const totalMachineCount = allMachines.length;

  // Calculate machine status counts:
  // - Critical: healthScore < 60
  // - Running: healthScore >= 60 and speed > 100
  // - Idle: healthScore >= 60 and speed <= 100
  const criticalMachines = allMachines.filter(m => m.healthScore < 60);
  const runningMachines = allMachines.filter(m => m.healthScore >= 60 && m.sensors.speed > 100);
  const idleMachines = allMachines.filter(m => m.healthScore >= 60 && m.sensors.speed <= 100);

  // Calculate fleet stats
  const avgFleetHealth = totalMachineCount > 0
    ? Math.round(allMachines.reduce((sum, m) => sum + m.healthScore, 0) / totalMachineCount)
    : 100;

  const totalPowerConsumption = allMachines.reduce((sum, m) => {
    const power = m.sensors.powerConsumption || ((m.sensors.torque * m.sensors.speed * Math.PI) / 30000) || 5.2;
    return sum + power;
  }, 0);

  // Generate an energy consumption history array for trends (simulate 8 historic points)
  const [energyHistory, setEnergyHistory] = useState<number[]>([42.1, 44.5, 43.2, 46.8, 45.1, 48.3, 46.2, totalPowerConsumption]);

  // Keep history synced to dynamic changes with minor random variation
  useEffect(() => {
    setEnergyHistory(prev => {
      const base = [...prev.slice(1)];
      base.push(parseFloat(Math.max(15, totalPowerConsumption).toFixed(1)));
      return base;
    });
  }, [totalPowerConsumption]);

  // Handle active selected data hover for energy trend tooltip
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; x: number; y: number; val: number } | null>(null);

  // Filter alerts from all machines with warnings or critical states
  const predictiveAlerts = allMachines
    .filter(m => m.healthScore < 85)
    .map(m => {
      const isCritical = m.healthScore < 60;
      return {
        id: `alert-${m.metadata.id}`,
        machineId: m.metadata.id,
        factoryId: m.factoryId,
        machineName: m.metadata.name,
        factoryName: m.factoryName,
        healthScore: m.healthScore,
        type: m.metadata.type,
        probability: m.failureProbability,
        rul: m.predictedRUL,
        recommendedAction: m.recommendedAction || "Calibrate spindle feedback loops immediately.",
        severity: isCritical ? 'CRITICAL' : 'WARNING' as const,
        time: isCritical ? 'Real-time detection' : '20 mins ago',
      };
    })
    .sort((a, b) => a.healthScore - b.healthScore); // worst health first

  // Simulated factory energy shares
  const factoryEnergyData = Object.entries(factories).map(([id, fact]) => {
    const siteMachines = allMachines.filter(m => m.factoryId === id);
    const powerSum = siteMachines.reduce((sum, m) => sum + (m.sensors.powerConsumption || 5.2), 0);
    return {
      name: fact.name,
      location: fact.location,
      power: parseFloat(powerSum.toFixed(1)),
      percent: Math.max(5, Math.round((powerSum / Math.max(1, totalPowerConsumption)) * 100))
    };
  });

  return (
    <div className="space-y-6">
      {/* Dynamic Matte Dark Dashboard Banner */}
      <div className="p-6 rounded-xl bg-gradient-to-br from-[#121212] via-[#151515] to-[#111111] border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -z-10" />
        <div className="absolute -bottom-10 -left-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -z-10" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-400 font-mono tracking-widest uppercase">
                INTELLIGENT EDGE DEPLOYMENT ACTIVE
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight font-sans">
              Real-Time Factory Health & Operations
            </h1>
            <p className="text-slate-400 text-xs max-w-2xl leading-relaxed">
              Consolidated workspace status streams representing localized edge processing. Machine state parameters are evaluated against the continuous failure classifier, enabling high-precision RUL mapping.
            </p>
          </div>
          <div className="flex items-center space-x-3 bg-slate-800 px-4 py-3 rounded-lg border border-slate-800 font-mono text-xs">
            <Compass className="w-5 h-5 text-cyan-400 animate-spin-slow" />
            <div>
              <span className="text-slate-500 block text-[9px] uppercase tracking-widest font-bold">Consolidated Fleet</span>
              <span className="text-slate-200 font-bold font-mono">FORGE-CO-ORD.LOCAL</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Health KPIs section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Fleet Health */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 relative overflow-hidden group">
          <div className="absolute top-4 right-4 text-emerald-400 bg-emerald-950/20 p-1.5 rounded-lg border border-emerald-900/10">
            <Activity className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-widest">Fleet Mean Health</span>
          <div className="flex items-baseline space-x-2 mt-2.5">
            <span className="text-3xl font-extrabold font-mono text-white tracking-tight">{avgFleetHealth}%</span>
            <span className="text-xs text-emerald-400 font-mono font-bold flex items-center">
              +1.8%
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1 mt-4 overflow-hidden">
            <div 
              className="bg-emerald-500 h-1 rounded-full transition-all duration-1000" 
              style={{ width: `${avgFleetHealth}%` }} 
            />
          </div>
          <div className="flex justify-between items-center mt-2.5 text-[9px] font-mono text-slate-500">
            <span>Critical limit: &lt;60%</span>
            <span className="text-emerald-400">Stable operations</span>
          </div>
        </div>

        {/* KPI 2: Active Stations */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 relative overflow-hidden group">
          <div className="absolute top-4 right-4 text-cyan-400 bg-cyan-950/20 p-1.5 rounded-lg border border-cyan-900/10">
            <Server className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-widest">Monitored Nodes</span>
          <div className="flex items-baseline space-x-2 mt-2.5">
            <span className="text-3xl font-extrabold font-mono text-white tracking-tight">{totalMachineCount}</span>
            <span className="text-xs text-slate-400 font-mono uppercase tracking-widest">STATIONS</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1 mt-4 overflow-hidden">
            <div 
              className="bg-cyan-500 h-1 rounded-full" 
              style={{ width: '100%' }} 
            />
          </div>
          <div className="flex justify-between items-center mt-2.5 text-[9px] font-mono text-slate-500">
            <span>Active streams</span>
            <span className="text-cyan-400 font-bold">100% ONLINE</span>
          </div>
        </div>

        {/* KPI 3: Energy Consumed */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 relative overflow-hidden group">
          <div className="absolute top-4 right-4 text-amber-400 bg-amber-950/20 p-1.5 rounded-lg border border-amber-900/10">
            <Zap className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-widest">Total Energy Draw</span>
          <div className="flex items-baseline space-x-2 mt-2.5">
            <span className="text-3xl font-extrabold font-mono text-white tracking-tight">{totalPowerConsumption.toFixed(1)}</span>
            <span className="text-xs text-amber-400 font-mono uppercase tracking-widest font-bold">kW</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1 mt-4 overflow-hidden">
            <div 
              className="bg-amber-500 h-1 rounded-full transition-all duration-300" 
              style={{ width: `${Math.min(100, (totalPowerConsumption / 80) * 100)}%` }} 
            />
          </div>
          <div className="flex justify-between items-center mt-2.5 text-[9px] font-mono text-slate-500">
            <span>Nominal Fleet Baseline</span>
            <span className="text-amber-400">Adaptive Load</span>
          </div>
        </div>

        {/* KPI 4: Predictive Alerts count */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 relative overflow-hidden group">
          <div className="absolute top-4 right-4 text-rose-400 bg-rose-950/20 p-1.5 rounded-lg border border-rose-900/10">
            <AlertTriangle className="w-4 h-4 animate-pulse" />
          </div>
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-widest">Active Risk Warnings</span>
          <div className="flex items-baseline space-x-2 mt-2.5">
            <span className="text-3xl font-extrabold font-mono text-rose-400 tracking-tight">{predictiveAlerts.length}</span>
            <span className="text-[8px] font-bold text-rose-500 bg-rose-950/40 border border-rose-900/30 px-1.5 py-0.5 rounded uppercase font-mono ml-2">
              Action Priority
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1 mt-4 overflow-hidden">
            <div 
              className="bg-rose-500 h-1 rounded-full" 
              style={{ width: `${Math.min(100, (predictiveAlerts.length / Math.max(1, totalMachineCount)) * 100)}%` }} 
            />
          </div>
          <div className="flex justify-between items-center mt-2.5 text-[9px] font-mono text-slate-500">
            <span>Critical RUL &lt; 50 hrs</span>
            <span className="text-rose-400 font-bold">{criticalMachines.length} CRITICAL</span>
          </div>
        </div>
      </div>

      {/* Main Core Columns: Real-Time Machine Status & Energy Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (8 cols): Status Counts and Energy Trend graph */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Machine Status Counts (Running, Idle, Critical) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-2">
                <Sliders className="w-4 h-4 text-slate-400" />
                <span>Machine Status Distribution</span>
              </h3>
              <span className="text-[9px] font-mono text-slate-500 bg-slate-800 border border-slate-800 px-2 py-0.5 rounded">
                Live Sensor Evaluation
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Running Status Card */}
              <div className="bg-slate-800 border border-slate-800 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/20 transition-all">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-300 font-mono">RUNNING</span>
                  </div>
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-extrabold font-mono text-white">{runningMachines.length}</div>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono leading-tight">
                    Stations spinning above 100 RPM with optimal operational metrics.
                  </p>
                </div>
                <div className="w-full bg-[#111] h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all" 
                    style={{ width: `${(runningMachines.length / Math.max(1, totalMachineCount)) * 100}%` }} 
                  />
                </div>
              </div>

              {/* Idle Status Card */}
              <div className="bg-slate-800 border border-slate-800 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-slate-500/20 transition-all">
                <div className="absolute top-0 right-0 w-16 h-16 bg-slate-400/5 rounded-full blur-xl" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                    <span className="text-xs font-bold text-slate-300 font-mono">IDLE</span>
                  </div>
                  <Pause className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-extrabold font-mono text-white">{idleMachines.length}</div>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono leading-tight">
                    Healthy engines connected but in passive cycle states (RPM &le; 100).
                  </p>
                </div>
                <div className="w-full bg-[#111] h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="h-full bg-slate-500 rounded-full transition-all" 
                    style={{ width: `${(idleMachines.length / Math.max(1, totalMachineCount)) * 100}%` }} 
                  />
                </div>
              </div>

              {/* Critical Status Card */}
              <div className="bg-slate-800 border border-slate-800 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-rose-500/20 transition-all">
                <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-full blur-xl" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span className="text-xs font-bold text-slate-300 font-mono">CRITICAL</span>
                  </div>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-extrabold font-mono text-rose-400">{criticalMachines.length}</div>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono leading-tight">
                    Stations below 60% health limit. Immediate failure hazard.
                  </p>
                </div>
                <div className="w-full bg-[#111] h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 rounded-full transition-all" 
                    style={{ width: `${(criticalMachines.length / Math.max(1, totalMachineCount)) * 100}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Energy Consumption Trend Area Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 mb-6 gap-2">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span>24-Hour Fleet Energy Load (kW)</span>
                </h3>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Real-time dynamic power consumption cycles.</p>
              </div>
              <div className="flex items-center space-x-4 text-[10px] font-mono">
                {/* Cloud Predictive Forecast Toggle */}
                <button
                  onClick={() => setShowForecast(!showForecast)}
                  className={`px-2 py-1 rounded text-[9px] border font-bold font-mono transition-all ${
                    showForecast 
                      ? 'bg-cyan-950/40 text-cyan-400 border-cyan-800 animate-pulse' 
                      : 'bg-slate-800 text-slate-500 border-slate-800 hover:text-slate-300'
                  }`}
                  title="Toggle cloud monitoring neural forecasting trendlines"
                >
                  {showForecast ? 'FORECAST ON (CLOUD)' : 'FORECAST OFF'}
                </button>
                <span className="text-slate-600">|</span>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-sm" />
                  <span className="text-slate-400">Total Load</span>
                </div>
                <span className="text-slate-600">|</span>
                <span className="text-emerald-400 font-bold bg-emerald-950/20 border border-emerald-900/30 px-2 py-0.5 rounded">
                  Peak: {Math.max(...energyHistory).toFixed(1)} kW
                </span>
              </div>
            </div>

            {/* Custom Interactive SVG Area Chart */}
            <div className="relative h-60 w-full mb-4">
              <svg 
                viewBox="0 0 700 240" 
                className="w-full h-full overflow-visible select-none"
              >
                <defs>
                  {/* Energy Area Fill Gradient */}
                  <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.00" />
                  </linearGradient>
                  {/* Glowing line shadow */}
                  <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Horizontal reference grid lines */}
                {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, index) => {
                  const yVal = 200 - ratio * 160;
                  const loadLabel = Math.round(15 + ratio * 45);
                  return (
                    <g key={`grid-${index}`}>
                      <line 
                        x1="45" 
                        y1={yVal} 
                        x2="660" 
                        y2={yVal} 
                        stroke="rgba(255, 255, 255, 0.04)" 
                        strokeWidth="1" 
                        strokeDasharray={index === 0 ? "none" : "4,4"} 
                      />
                      <text 
                        x="32" 
                        y={yVal + 3} 
                        fill="rgba(156, 163, 175, 0.4)" 
                        className="text-[9px] font-mono text-right"
                        textAnchor="end"
                      >
                        {loadLabel} kW
                      </text>
                    </g>
                  );
                })}

                {/* X Axis label lines */}
                {(showForecast 
                  ? ['16h', '12h', '8h', '4h', '2h', 'Now', '+1h (FC)', '+2h (FC)', '+3h (FC)']
                  : ['20h ago', '16h ago', '12h ago', '8h ago', '4h ago', '2h ago', '1h ago', 'Now']
                ).map((lbl, index) => {
                  const xSpacing = showForecast ? 60 : 86.5;
                  const xVal = 50 + index * xSpacing;
                  const isF = showForecast && index >= 6;
                  return (
                    <g key={`x-${index}`}>
                      <line 
                        x1={xVal} 
                        y1="200" 
                        x2={xVal} 
                        y2="204" 
                        stroke={isF ? "rgba(6, 182, 212, 0.3)" : "rgba(255, 255, 255, 0.1)"} 
                        strokeWidth="1" 
                      />
                      <text 
                        x={xVal} 
                        y="220" 
                        fill={isF ? "#22D3EE" : "rgba(156, 163, 175, 0.5)"} 
                        className={`text-[8px] font-mono ${isF ? 'font-bold animate-pulse' : ''}`}
                        textAnchor="middle"
                      >
                        {lbl}
                      </text>
                    </g>
                  );
                })}

                {/* Construct SVG Path points dynamically */}
                {(() => {
                  const xSpacing = showForecast ? 60 : 86.5;
                  const points = energyHistory.map((val, idx) => {
                    const x = 50 + idx * xSpacing;
                    // Scale val from range [15, 60] -> [200, 40]
                    const clampedVal = Math.max(15, Math.min(val, 60));
                    const y = 200 - ((clampedVal - 15) / 45) * 160;
                    return { x, y, val, isForecast: false };
                  });

                  // Generate Forecast projections extending from the last historical point
                  const forecastPoints: any[] = [];
                  if (showForecast) {
                    const lastPt = points[points.length - 1];
                    const offsets = [1.8, -1.2, 2.5];
                    offsets.forEach((offset, idx) => {
                      const val = lastPt.val + offset;
                      const x = lastPt.x + (idx + 1) * xSpacing;
                      const clampedVal = Math.max(15, Math.min(val, 60));
                      const y = 200 - ((clampedVal - 15) / 45) * 160;
                      forecastPoints.push({ x, y, val, isForecast: true });
                    });
                  }

                  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  const historicalLast = points[points.length - 1];
                  
                  // Forecast path starting exactly from historical end point
                  const forecastPath = showForecast 
                    ? `M ${historicalLast.x} ${historicalLast.y} ` + forecastPoints.map(p => `L ${p.x} ${p.y}`).join(' ')
                    : '';

                  // Combined area path ends at 200
                  const areaPathEnd = showForecast ? forecastPoints[forecastPoints.length - 1].x : 655.5;
                  const areaPathPoints = showForecast ? [...points, ...forecastPoints] : points;
                  const areaPath = areaPathPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ` L ${areaPathEnd} 200 L 50 200 Z`;

                  return (
                    <>
                      {/* Area Fill */}
                      <path d={areaPath} fill="url(#energyGrad)" />

                      {/* Stroke Line */}
                      <path 
                        d={linePath} 
                        fill="none" 
                        stroke="url(#energyLineGrad)" 
                        strokeWidth="2.5" 
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter="url(#glow)"
                        className="stroke-cyan-400"
                      />

                      {/* Forecasted Trendline (Dashed & Cyan-green glowing) */}
                      {showForecast && (
                        <path
                          d={forecastPath}
                          fill="none"
                          stroke="#22D3EE"
                          strokeWidth="2.5"
                          strokeDasharray="4,4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          filter="url(#glow)"
                          className="animate-pulse"
                        />
                      )}

                      {/* Interactive hover points / nodes */}
                      {[...points, ...forecastPoints].map((p, idx) => (
                        <g key={`pt-${idx}`}>
                          <circle 
                            cx={p.x} 
                            cy={p.y} 
                            r={p.isForecast ? "4.5" : "4"} 
                            className={p.isForecast ? "fill-cyan-300 stroke-[#151515]" : "fill-cyan-400 stroke-[#151515]"}
                            strokeWidth="2" 
                          />
                          {/* Invisible hover trigger area */}
                          <circle 
                            cx={p.x} 
                            cy={p.y} 
                            r="14" 
                            fill="transparent" 
                            className="cursor-crosshair"
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoveredPoint({
                                index: idx,
                                x: p.x,
                                y: p.y,
                                val: p.val
                              });
                            }}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                        </g>
                      ))}

                      {/* Line connecting axis origin */}
                      <line x1="45" y1="200" x2={showForecast ? areaPathEnd + 10 : 660} y2="200" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />
                    </>
                  );
                })()}

                {/* SVG Live Tooltip */}
                {hoveredPoint && (
                  <g transform={`translate(${hoveredPoint.x}, ${hoveredPoint.y - 45})`}>
                    <rect 
                      x="-45" 
                      y="-12" 
                      width="90" 
                      height="26" 
                      rx="4" 
                      fill="rgba(13, 13, 13, 0.95)" 
                      stroke="rgba(6, 182, 212, 0.4)" 
                      strokeWidth="1" 
                    />
                    <text 
                      x="0" 
                      y="5" 
                      fill="#ffffff" 
                      className="text-[9px] font-mono font-bold"
                      textAnchor="middle"
                    >
                      {hoveredPoint.val.toFixed(1)} kW
                    </text>
                  </g>
                )}
              </svg>
            </div>
            
            <div className="bg-slate-800 rounded-lg p-3 border border-slate-800 flex items-center space-x-3 text-[10px] font-mono leading-relaxed text-slate-400">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              <p>
                <strong>Observation:</strong> Active tooling operations trigger transient load peaks of up to 48.3 kW during synchronized heavy milling cycles. Autonomous power balancing algorithms limit combined grid spikes.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Predictive Maintenance Alerts & Factory Shares */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Recent Predictive Maintenance Alerts */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between h-full min-h-[380px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Predictive Alerts Summary</span>
                </h3>
                <span className="text-[8px] font-mono text-rose-400 bg-rose-950/20 px-1.5 py-0.5 rounded font-bold border border-rose-900/20">
                  REAL-TIME
                </span>
              </div>

              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {predictiveAlerts.length > 0 ? (
                  predictiveAlerts.map((alert) => {
                    const isCrit = alert.severity === 'CRITICAL';
                    return (
                      <div 
                        key={alert.id}
                        onClick={() => {
                          onSelectFactory(alert.factoryId);
                          onSelectMachine(alert.factoryId, alert.machineId);
                          onNavigate('twin');
                        }}
                        className={`p-3 rounded-lg bg-slate-800 border transition-all cursor-pointer ${
                          isCrit 
                            ? 'border-rose-900/30 hover:border-rose-500/40' 
                            : 'border-slate-800 hover:border-amber-500/40'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-1.5">
                          <div className="flex items-center space-x-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${isCrit ? 'bg-rose-500 animate-ping' : 'bg-amber-500'}`} />
                            <span className="text-xs font-bold text-slate-200 truncate max-w-[140px]">{alert.machineName}</span>
                          </div>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ${
                            isCrit 
                              ? 'text-rose-400 bg-rose-950/30 border border-rose-900/20' 
                              : 'text-amber-400 bg-amber-950/30 border border-amber-900/20'
                          }`}>
                            {alert.severity}
                          </span>
                        </div>

                        <div className="mt-1 text-[9px] font-mono text-slate-500">
                          {alert.factoryName} • {alert.type}
                        </div>

                        <div className="mt-2 text-[10px] text-slate-300 bg-slate-950/40 p-2 rounded border border-slate-800 leading-normal">
                          {alert.recommendedAction}
                        </div>

                        <div className="mt-2.5 flex items-center justify-between text-[9px] font-mono border-t border-slate-800 pt-2">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span className="text-slate-500">{alert.time}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-500">Est. RUL:</span>{' '}
                            <span className={`font-bold ${isCrit ? 'text-rose-400' : 'text-amber-400'}`}>
                              {alert.rul} hrs
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10 space-y-2">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
                    <p className="text-xs text-slate-400 font-mono">No Active Anomalies Detected</p>
                    <p className="text-[9px] text-slate-600 font-mono max-w-[180px] mx-auto leading-normal">
                      All edge stations operating within secure statistical control limits.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => onNavigate('predictions')}
              className="w-full mt-4 bg-transparent hover:bg-white/5 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg py-2 text-[10px] font-mono font-bold transition-all uppercase tracking-wider flex items-center justify-center space-x-1.5"
            >
              <span>Examine Predictive Metrics</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Energy Draw Contribution By Site */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono border-b border-slate-800 pb-3 mb-4 flex items-center justify-between">
              <span>Energy Share by Location</span>
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
            </h3>

            <div className="space-y-3.5">
              {factoryEnergyData.map((item, idx) => (
                <div key={idx} className="space-y-1.5 text-[10px] font-mono">
                  <div className="flex justify-between items-baseline text-slate-300">
                    <span className="font-semibold truncate max-w-[160px]">{item.name}</span>
                    <span className="text-slate-500 text-[9px] truncate max-w-[80px]">{item.location}</span>
                    <span className="text-cyan-400 font-bold">{item.power} kW ({item.percent}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className={`h-full rounded-full bg-gradient-to-r ${
                        idx === 0 ? 'from-cyan-500 to-cyan-400' :
                        idx === 1 ? 'from-blue-600 to-blue-400' :
                        idx === 2 ? 'from-emerald-600 to-emerald-400' :
                        'from-slate-600 to-slate-400'
                      }`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* OPC UA & MQTT Live Ingestion Gateway */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-1.5">
                <Server className="w-4 h-4 text-cyan-400" />
                <span>IoT Ingestion Gateway</span>
              </h3>
              <span className="flex items-center space-x-1.5 bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded text-[8px] font-mono font-bold text-emerald-400">
                <span className="w-1 h-1 bg-emerald-400 rounded-full animate-ping" />
                <span>MQTT/OPC ACTIVE</span>
              </span>
            </div>

            <div className="space-y-3.5 text-[10px] font-mono leading-relaxed">
              <div className="flex justify-between items-center text-slate-400">
                <span>BROKER ADDRESS:</span>
                <span className="text-white font-bold select-all">mqtt://broker.factorymap.io:1883</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>TOPIC FILTER:</span>
                <span className="text-cyan-400 font-bold">factory/+/+/telemetry</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>OPC UA TCP ENDPOINT:</span>
                <span className="text-white select-all">opc.tcp://10.12.8.204:4840</span>
              </div>

              {/* Scrolling Real-Time Feed Terminal */}
              <div className="space-y-1">
                <span className="text-[9px] text-slate-400/60 block mb-1">LIVE GATEWAY STREAMER:</span>
                <div className="bg-black/80 rounded-lg p-3 border border-slate-800 h-36 overflow-y-auto space-y-1 text-emerald-400 font-mono text-[9px] leading-snug custom-scrollbar">
                  {mqttLogs.map((log, idx) => (
                    <p key={idx} className={idx === 0 ? "text-emerald-300 font-bold" : "opacity-75"}>
                      {log}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
