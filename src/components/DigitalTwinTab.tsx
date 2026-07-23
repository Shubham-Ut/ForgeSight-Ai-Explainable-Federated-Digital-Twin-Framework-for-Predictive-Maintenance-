import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  Settings, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Sliders, 
  Wrench, 
  FileText,
  Thermometer,
  Zap,
  RotateCw,
  Gauge,
  Clock,
  DollarSign,
  Leaf,
  Sparkles,
  RefreshCw,
  TrendingUp,
  BarChart2
} from 'lucide-react';
import { MachineDigitalTwin, FactoryDetails, ComponentHealth, SensorData } from '../types';
import DigitalTwin3D from './DigitalTwin3D';

interface DigitalTwinTabProps {
  factories: Record<string, FactoryDetails>;
  machines: Record<string, Record<string, MachineDigitalTwin>>;
  selectedFactory: string;
  selectedMachine: string;
  selectedComponent: string;
  isSimulating: boolean;
  liveSensors: SensorData;
  onSelectFactory: (id: string) => void;
  onSelectMachine: (id: string) => void;
  onSelectComponent: (id: string) => void;
  onToggleSimulation: () => void;
  onUpdateSensors?: (sensors: SensorData) => void;
}

interface ScenarioDetails {
  id: string;
  name: string;
  cost: number;
  downtime: number;
  rulGain: number;
  carbonReduced: number;
  cascadeAvoided: number;
  rlAction: string;
  explanation: string;
}

const SCENARIOS: ScenarioDetails[] = [
  {
    id: 'bearings',
    name: 'Precision Outer Bearing Regreasing & Reseat',
    cost: 1450,
    downtime: 2.5,
    rulGain: 280,
    carbonReduced: 12.5,
    cascadeAvoided: 8500,
    rlAction: 'RECOMMENDED. Regreasing scheduled on the third shift reduces frictional slippage by 18% with negligible production impact.',
    explanation: 'Applies premium polyurea synthetic lubricant to axis housing and reseats retaining ring to minimize sub-assembly harmonics.'
  },
  {
    id: 'coolant',
    name: 'Closed-Loop Coolant Fluid Flush & Filter Replacement',
    cost: 850,
    downtime: 1.0,
    rulGain: 120,
    carbonReduced: 4.8,
    cascadeAvoided: 3200,
    rlAction: 'DEFERRABLE. Current coolant pH levels and particle count are within safe industrial tolerances.',
    explanation: 'Flushes debris and suspended micro-shavings from central manifold, correcting fluid thermal capacity.'
  },
  {
    id: 'spindle',
    name: 'Active Spindle Armature Re-Balancing & Overhaul',
    cost: 12400,
    downtime: 12.0,
    rulGain: 1450,
    carbonReduced: 95.0,
    cascadeAvoided: 45000,
    rlAction: 'VITAL PRE-EMPTIVE OPERATION. Local stacker models indicate a 94% probability of spindle bearing scoring if run beyond 45 hours.',
    explanation: 'Re-machines mating surfaces, aligns spindle vector using laser telemetry, and completely replaces primary lock rings.'
  },
  {
    id: 'vent',
    name: 'Defer All Maintenance & Operate to Failure',
    cost: 0,
    downtime: 48.0,
    rulGain: -50,
    carbonReduced: -52.0,
    cascadeAvoided: 0,
    rlAction: 'STRICTLY VETOED. Model predicts a catastrophic secondary stator breakdown requiring total workstation replacement if run to failure.',
    explanation: 'Allows vibration micro-cracks to propagate freely across structural frame castings, leading to secondary tooling failures.'
  }
];

export default function DigitalTwinTab({
  factories,
  machines,
  selectedFactory,
  selectedMachine,
  selectedComponent,
  isSimulating,
  liveSensors,
  onSelectFactory,
  onSelectMachine,
  onSelectComponent,
  onToggleSimulation,
  onUpdateSensors
}: DigitalTwinTabProps) {

  const factoryList = Object.values(factories);
  const factoryMachines = machines[selectedFactory] || {};
  const machineList = Object.values(factoryMachines);
  
  const activeTwin = factoryMachines[selectedMachine] || machineList[0];
  const activeComponent = activeTwin?.components.find(c => c.id === selectedComponent) || activeTwin?.components[0];

  // Map the 3 dynamic components for the SVG interaction
  const comp0 = activeTwin?.components[0] || { id: 'spindle-motor', name: 'Spindle Motor Drive', status: 'healthy', healthScore: 95 };
  const comp1 = activeTwin?.components[1] || { id: 'axis-bearing', name: 'Main Axis Bearings', status: 'healthy', healthScore: 96 };
  const comp2 = activeTwin?.components[2] || { id: 'coolant-nozzle', name: 'Coolant Flow Recirculator', status: 'healthy', healthScore: 92 };

  // Local tab switcher for main panel: 'twin' or 'whatif'
  const [twinPanelMode, setTwinPanelMode] = useState<'twin' | 'whatif'>('twin');
  const [whatifSubTab, setWhatifSubTab] = useState<'scenarios' | 'manual'>('scenarios');

  // Simulation parameters states
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('bearings');
  const [isSimulatingScenario, setIsSimulatingScenario] = useState<boolean>(false);
  const [simulationProgress, setSimulationProgress] = useState<number>(0);
  const [runsCount, setRunsCount] = useState<number>(0);
  const [showSimResults, setShowSimResults] = useState<boolean>(false);

  // Active scenario details
  const activeScenario = SCENARIOS.find(s => s.id === selectedScenarioId) || SCENARIOS[0];

  // Trigger scenario simulation
  const handleRunSimulation = () => {
    setIsSimulatingScenario(true);
    setSimulationProgress(0);
    setRunsCount(0);
    setShowSimResults(false);
  };

  useEffect(() => {
    if (!isSimulatingScenario) return;

    const interval = setInterval(() => {
      setSimulationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsSimulatingScenario(false);
          setShowSimResults(true);
          return 100;
        }
        const step = Math.floor(Math.random() * 15) + 5;
        const nextProgress = Math.min(100, prev + step);
        setRunsCount(Math.round((nextProgress / 100) * 128));
        return nextProgress;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [isSimulatingScenario]);

  return (
    <div className="space-y-6">
      {/* Selector Strip */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center p-4 rounded-xl premium-card">
        <div className="flex flex-wrap items-center gap-4">
          {/* Factory Site */}
          <div>
            <label className="text-[9px] font-mono font-bold text-slate-500 uppercase block mb-1">FACTORY SITE</label>
            <select 
              value={selectedFactory} 
              onChange={(e) => onSelectFactory(e.target.value)}
              className="text-xs border border-slate-800 bg-slate-950 font-mono text-slate-200 rounded px-3 py-2 focus:border-slate-500 focus:outline-none"
            >
              {factoryList.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Machine Workstation */}
          <div>
            <label className="text-[9px] font-mono font-bold text-slate-500 uppercase block mb-1">MACHINERY WORKSTATION</label>
            <select 
              value={selectedMachine} 
              onChange={(e) => onSelectMachine(e.target.value)}
              className="text-xs border border-slate-800 bg-slate-950 font-mono text-slate-200 rounded px-3 py-2 focus:border-slate-500 focus:outline-none"
            >
              {machineList.map(m => (
                <option key={m.metadata.id} value={m.metadata.id}>
                  {m.metadata.name} (HP: {m.healthScore}%)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Simulation Controls */}
        <div className="flex items-center space-x-3">
          <span className="text-[10px] font-mono text-slate-400">
            {isSimulating ? (
              <span className="flex items-center text-emerald-400">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2" />
                Live Telemetry Synchronized
              </span>
            ) : (
              <span className="flex items-center text-slate-500">
                <span className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-2" />
                Telemetry feed suspended
              </span>
            )}
          </span>
          <button
            onClick={onToggleSimulation}
            className={`px-3 py-1.5 rounded font-mono text-[11px] font-bold border transition-all flex items-center space-x-1.5 ${
              isSimulating 
                ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300' 
                : 'bg-slate-800 border-slate-700 hover:bg-slate-750 text-white'
            }`}
          >
            {isSimulating ? (
              <>
                <Pause className="w-3 h-3" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                <span>Stream</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Container Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Machine Workstation Schematic (The Digital Twin Panel) */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
          
          {/* Subtab navigation */}
          <div className="flex border-b border-slate-800 pb-px space-x-2">
            <button
              onClick={() => setTwinPanelMode('twin')}
              className={`px-4 py-2 text-xs font-mono font-bold border-b-2 uppercase tracking-wider transition-all ${
                twinPanelMode === 'twin' 
                  ? 'border-white text-white' 
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              Diagnostic Schematic Twin
            </button>
            <button
              onClick={() => setTwinPanelMode('whatif')}
              className={`px-4 py-2 text-xs font-mono font-bold border-b-2 uppercase tracking-wider transition-all ${
                twinPanelMode === 'whatif' 
                  ? 'border-white text-white' 
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              What-if Maintenance Sandbox
            </button>
          </div>

          {twinPanelMode === 'twin' ? (
            <div className="premium-card rounded-xl p-5 relative overflow-hidden flex flex-col justify-between min-h-[480px]">
              {/* Top telemetry state bar */}
              <div className="flex justify-between items-center border-b border-slate-800 pb-3 z-10">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-mono text-slate-400 font-bold uppercase block tracking-wider">DIAGNOSTICS & SYSTEM ASSEMBLY STATUS</span>
                  <h3 className="text-md font-bold text-white font-sans">{activeTwin?.metadata.name}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-mono text-slate-500 block uppercase">Assembly Health</span>
                  <span className={`text-md font-bold font-mono ${
                    activeTwin?.healthScore > 80 ? 'text-emerald-400' : 
                    activeTwin?.healthScore > 50 ? 'text-amber-500' : 'text-rose-400 font-extrabold'
                  }`}>
                    {activeTwin?.healthScore}%
                  </span>
                </div>
              </div>

              {/* Interactive Mechanical Twin 3D Viewport */}
              <div className="relative w-full h-[320px] bg-black/40 border border-slate-800 rounded-xl my-4 overflow-hidden flex items-center justify-center">
                <DigitalTwin3D 
                  temperature={liveSensors.temperature}
                  vibration={liveSensors.vibration}
                  speed={liveSensors.speed}
                  wear={liveSensors.wear}
                  healthScore={activeTwin?.healthScore || 100}
                  selectedComponent={selectedComponent}
                  onSelectComponent={onSelectComponent}
                />
                
                {/* 3D Metadata Panel overlay */}
                <div className="absolute top-4 left-4 bg-slate-950/90 border border-slate-800 p-3 rounded-lg w-44 font-mono text-[9px] text-slate-300 shadow-xl pointer-events-none select-none z-10">
                  <span className="text-white font-bold block uppercase border-b border-slate-800 pb-1 mb-1">Telemetry Node</span>
                  <span>Target: {activeComponent?.name}</span><br />
                  <span>Index: <b className={activeComponent && activeComponent.healthScore > 80 ? 'text-emerald-400' : 'text-amber-400'}>{activeComponent?.healthScore}%</b></span><br />
                  <span>Risk Status: <b className="uppercase font-semibold text-rose-400">{activeComponent?.status}</b></span>
                </div>
              </div>

              {/* State Replay & Defect Simulator */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-2 mb-4 font-mono text-[10px]">
                <div className="flex justify-between items-center border-b border-slate-900 pb-1.5">
                  <span className="text-cyan-400 font-bold uppercase text-[9px] flex items-center space-x-1">
                    <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
                    <span>Historical Replay & Failure Injection Console</span>
                  </span>
                  <span className="text-[8px] text-slate-500 uppercase font-semibold">Live Intercept Channel</span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <button
                    onClick={() => {
                      onUpdateSensors?.({
                        timestamp: new Date().toISOString(),
                        temperature: 88,
                        vibration: 8.4,
                        speed: 15400,
                        torque: 68.5,
                        wear: 198,
                        pressure: 145,
                        bpr: 8.65,
                      });
                    }}
                    className="p-1.5 rounded bg-rose-950/40 border border-rose-900/60 text-rose-300 text-center hover:bg-rose-900/50 transition-all text-[8.5px] font-bold"
                  >
                    Inject Spindle Fail
                  </button>
                  <button
                    onClick={() => {
                      onUpdateSensors?.({
                        timestamp: new Date().toISOString(),
                        temperature: 104,
                        vibration: 2.1,
                        speed: 12000,
                        torque: 82.0,
                        wear: 45,
                        pressure: 155,
                        bpr: 8.78,
                      });
                    }}
                    className="p-1.5 rounded bg-rose-950/40 border border-rose-900/60 text-rose-300 text-center hover:bg-rose-900/50 transition-all text-[8.5px] font-bold"
                  >
                    Inject Thermal Runaway
                  </button>
                  <button
                    onClick={() => {
                      onUpdateSensors?.({
                        timestamp: new Date().toISOString(),
                        temperature: 24.5,
                        vibration: 1.1,
                        speed: 1500,
                        torque: 40.0,
                        wear: 12,
                        pressure: 110,
                        bpr: 8.35,
                      });
                    }}
                    className="p-1.5 rounded bg-emerald-950/40 border border-emerald-900/60 text-emerald-300 text-center hover:bg-emerald-900/50 transition-all text-[8.5px] font-bold"
                  >
                    Replay Nominal Cycle
                  </button>
                  <button
                    onClick={() => {
                      onUpdateSensors?.({
                        timestamp: new Date().toISOString(),
                        temperature: 54.0,
                        vibration: 4.8,
                        speed: 8500,
                        torque: 58.0,
                        wear: 145,
                        pressure: 124,
                        bpr: 8.45,
                      });
                    }}
                    className="p-1.5 rounded bg-amber-950/40 border border-amber-900/60 text-amber-300 text-center hover:bg-amber-950/50 transition-all text-[8.5px] font-bold"
                  >
                    Replay Chattering Event
                  </button>
                </div>
              </div>

              {/* Quick Component Selection Buttons */}
              <div className="grid grid-cols-3 gap-3 z-10 border-t border-slate-800 pt-4">
                {activeTwin?.components.map((comp) => {
                  const isActive = selectedComponent === comp.id;
                  return (
                    <button
                      key={comp.id}
                      onClick={() => onSelectComponent(comp.id)}
                      className={`p-2.5 rounded border text-left transition-all truncate ${
                        isActive 
                          ? 'bg-slate-800/60 border-slate-700 text-white shadow-sm' 
                          : 'bg-slate-900/40 border-transparent hover:border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-mono text-slate-400 font-bold uppercase truncate max-w-[120px]">{comp.name}</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          comp.status === 'healthy' ? 'bg-emerald-500' :
                          comp.status === 'warning' ? 'bg-amber-500' : 'bg-rose-500'
                        }`} />
                      </div>
                      <div className="flex items-baseline space-x-1.5">
                        <span className="text-sm font-bold font-mono">{comp.healthScore}%</span>
                        <span className="text-[9px] font-mono text-slate-500 uppercase">HP</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* WHAT-IF SIMULATION INTERFACE */
            <div className="premium-card rounded-xl p-5 relative overflow-hidden flex flex-col justify-between min-h-[480px]">
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                      <Sliders className="w-3.5 h-3.5 text-slate-400" />
                      <span>Multi-Objective Decision Sandbox</span>
                    </h4>
                    <p className="text-slate-400 text-[10px] font-mono">
                      Simulate corrective schedules or test custom continuous sensor drifts.
                    </p>
                  </div>
                  
                  {/* Tab Selector */}
                  <div className="flex bg-slate-950 p-1 border border-slate-800 rounded-lg shrink-0">
                    <button
                      onClick={() => setWhatifSubTab('scenarios')}
                      className={`px-3 py-1 text-[9px] font-mono font-bold rounded-md transition-all ${
                        whatifSubTab === 'scenarios'
                          ? 'bg-slate-800 text-white border border-slate-800'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      Monte Carlo Planner
                    </button>
                    <button
                      onClick={() => {
                        setWhatifSubTab('manual');
                        if (isSimulating) {
                          onToggleSimulation();
                        }
                      }}
                      className={`px-3 py-1 text-[9px] font-mono font-bold rounded-md transition-all ${
                        whatifSubTab === 'manual'
                          ? 'bg-slate-800 text-white border border-slate-800'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      Continuous Overrides
                    </button>
                  </div>
                </div>

                {whatifSubTab === 'scenarios' ? (
                  /* Scenario Selector */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-mono font-bold text-slate-500 uppercase block">Maintenance Action Scenario</label>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {SCENARIOS.map((scenario) => (
                          <button
                            key={scenario.id}
                            onClick={() => {
                              setSelectedScenarioId(scenario.id);
                              setShowSimResults(false);
                            }}
                            className={`w-full p-2.5 rounded border text-left font-mono text-[10px] transition-all block ${
                              selectedScenarioId === scenario.id
                                ? 'bg-slate-800/40 border-slate-700 text-white'
                                : 'bg-slate-900/30 border-transparent hover:border-slate-800 text-slate-400'
                            }`}
                          >
                            <span className="font-bold block text-slate-200">{scenario.name}</span>
                            <span className="text-[8px] text-slate-500 mt-1 block">Est. Cost: ${scenario.cost.toLocaleString()} | Downtime: {scenario.downtime}h</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Selected Scenario Briefing */}
                    <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 font-mono text-xs flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Impact Analysis Memo:</span>
                        <p className="text-slate-400 leading-relaxed text-[10px]">
                          {activeScenario.explanation}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-800 mt-3">
                        <button
                          onClick={handleRunSimulation}
                          disabled={isSimulatingScenario}
                          className={`w-full py-2 rounded font-bold text-[10px] uppercase tracking-wider flex items-center justify-center space-x-2 border transition-all ${
                            isSimulatingScenario
                              ? 'bg-slate-900 border-slate-850 text-slate-600 cursor-not-allowed'
                              : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-100'
                          }`}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSimulatingScenario ? 'animate-spin' : ''}`} />
                          <span>{isSimulatingScenario ? `Simulating Trials (${runsCount}/128)...` : 'Solve Policy Matrix'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Manual Overrides Sliders Section */
                  <div className="space-y-4 font-mono">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Sliders Block */}
                      <div className="space-y-3 bg-slate-950 border border-slate-800 p-3 rounded-lg">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-800 pb-1">Continuous Sensor Modulators</span>
                        
                        {/* Temp Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px]">
                            <span className="text-slate-500">Spindle Temp (°C)</span>
                            <span className="text-white font-bold">{liveSensors.temperature}°C</span>
                          </div>
                          <input 
                            type="range" 
                            min="20" 
                            max="110" 
                            value={liveSensors.temperature}
                            onChange={(e) => {
                              const nextVal = parseFloat(e.target.value);
                              onUpdateSensors?.({
                                ...liveSensors,
                                temperature: nextVal,
                                airTemp: parseFloat((nextVal + 273.15).toFixed(2)),
                                processTemp: parseFloat((nextVal + 283.15).toFixed(2)),
                              });
                            }}
                            className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-slate-400"
                          />
                        </div>

                        {/* Speed Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px]">
                            <span className="text-slate-500">Spindle Speed (RPM)</span>
                            <span className="text-white font-bold">{liveSensors.speed} RPM</span>
                          </div>
                          <input 
                            type="range" 
                            min="1000" 
                            max="18000" 
                            step="100"
                            value={liveSensors.speed}
                            onChange={(e) => {
                              const nextVal = parseInt(e.target.value);
                              onUpdateSensors?.({
                                ...liveSensors,
                                speed: nextVal,
                                rotationalSpeed: nextVal,
                              });
                            }}
                            className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-slate-400"
                          />
                        </div>

                        {/* Vibration Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px]">
                            <span className="text-slate-500">Radial Vibration (mm/s)</span>
                            <span className="text-white font-bold">{liveSensors.vibration} mm/s</span>
                          </div>
                          <input 
                            type="range" 
                            min="0.1" 
                            max="12.0" 
                            step="0.1"
                            value={liveSensors.vibration}
                            onChange={(e) => {
                              const nextVal = parseFloat(e.target.value);
                              onUpdateSensors?.({
                                ...liveSensors,
                                vibration: nextVal,
                              });
                            }}
                            className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-slate-400"
                          />
                        </div>

                        {/* Wear Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px]">
                            <span className="text-slate-500">Cutter Wear (min)</span>
                            <span className="text-white font-bold">{liveSensors.wear} min</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="240" 
                            value={liveSensors.wear}
                            onChange={(e) => {
                              const nextVal = parseInt(e.target.value);
                              onUpdateSensors?.({
                                ...liveSensors,
                                wear: nextVal,
                                toolWear: nextVal,
                              });
                            }}
                            className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-slate-400"
                          />
                        </div>

                        {/* Torque Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px]">
                            <span className="text-slate-500">Spindle Torque (Nm)</span>
                            <span className="text-white font-bold">{liveSensors.torque} Nm</span>
                          </div>
                          <input 
                            type="range" 
                            min="5" 
                            max="90" 
                            step="0.5"
                            value={liveSensors.torque}
                            onChange={(e) => {
                              const nextVal = parseFloat(e.target.value);
                              onUpdateSensors?.({
                                ...liveSensors,
                                torque: nextVal,
                              });
                            }}
                            className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-slate-400"
                          />
                        </div>
                      </div>

                      {/* Live What-if Response Analytics Display */}
                      <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-3 flex flex-col justify-between font-mono text-[9px]">
                        <div className="space-y-2">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-800 pb-1">Physics-Informed Response</span>
                          
                          <div className="flex justify-between py-1 border-b border-slate-800">
                            <span className="text-slate-500">Calculated Health Index</span>
                            <span className={`font-bold ${activeTwin.healthScore > 80 ? 'text-emerald-400' : activeTwin.healthScore > 55 ? 'text-amber-400' : 'text-rose-400'}`}>
                              {activeTwin.healthScore}%
                            </span>
                          </div>

                          <div className="flex justify-between py-1 border-b border-slate-800">
                            <span className="text-slate-500">Failure Prob. (95% CI)</span>
                            <span className="text-white font-bold">
                              {activeTwin.failureProbability.toFixed(1)}% (±{(activeTwin.confidenceScore || 4.2).toFixed(1)}%)
                            </span>
                          </div>

                          <div className="flex justify-between py-1 border-b border-slate-800">
                            <span className="text-slate-500">Anomaly Index (RF)</span>
                            <span className={`font-bold ${activeTwin.isAnomaly ? 'text-rose-400 font-extrabold' : 'text-slate-300'}`}>
                              {(activeTwin.anomalyScore || 0.0).toFixed(3)} {activeTwin.isAnomaly ? '(ANOMALY)' : '(NOMINAL)'}
                            </span>
                          </div>

                          <div className="flex justify-between py-1 border-b border-slate-800">
                            <span className="text-slate-500">Est. Repair Cost</span>
                            <span className="text-white font-bold">${activeTwin.estimatedRepairCost.toLocaleString()} USD</span>
                          </div>

                          <div className="flex justify-between py-1">
                            <span className="text-slate-500">Est. Overhaul Downtime</span>
                            <span className="text-white font-bold">{activeTwin.estimatedDowntime.toFixed(1)} Hours</span>
                          </div>
                        </div>

                        <div className="bg-slate-900/80 border border-slate-800 p-2 rounded text-[8px] text-slate-400 leading-relaxed mt-2">
                          <span className="font-bold text-slate-300 uppercase block mb-0.5">Continuous Overrides Safety Alert:</span>
                          {activeTwin.healthScore < 60 ? (
                            <span className="text-rose-400 font-semibold">CRITICAL DEGRADATION: Telemetry deviations exceed ISO 13373-3 vibration margins. Severe risk of tool chatter and bearings seizure.</span>
                          ) : (
                            <span>All parameters are safely mapped against calibrated machine tolerances. Machine structural harmonics stable.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Progress bar */}
                {isSimulatingScenario && (
                  <div className="space-y-1 bg-slate-950/80 border border-slate-800 p-3 rounded font-mono">
                    <div className="flex justify-between text-[9px]">
                      <span className="text-slate-400 font-bold">SOLVING MONTE CARLO DECISION TREES...</span>
                      <span className="text-slate-300 font-bold">{simulationProgress}%</span>
                    </div>
                    <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                      <div className="bg-slate-400 h-full rounded-full" style={{ width: `${simulationProgress}%` }} />
                    </div>
                  </div>
                )}

                {/* SIMULATION SUMMARY DASHBOARD */}
                {showSimResults && whatifSubTab === 'scenarios' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950/40 border border-slate-800 p-4 rounded-xl font-mono text-[9px]"
                  >
                    <div className="bg-slate-900/60 p-2.5 border border-slate-800 rounded">
                      <span className="text-slate-500 block uppercase font-bold">RUL INCREASE</span>
                      <span className={`text-xs font-bold block ${activeScenario.rulGain > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {activeScenario.rulGain > 0 ? '+' : ''}{activeScenario.rulGain} Hours
                      </span>
                    </div>

                    <div className="bg-slate-900/60 p-2.5 border border-slate-800 rounded">
                      <span className="text-slate-500 block uppercase font-bold">REPAIR BUDGET</span>
                      <span className="text-xs font-bold text-white block">
                        ${activeScenario.cost.toLocaleString()} USD
                      </span>
                    </div>

                    <div className="bg-slate-900/60 p-2.5 border border-slate-800 rounded">
                      <span className="text-slate-500 block uppercase font-bold">LOSS PREVENTED</span>
                      <span className="text-xs font-bold text-emerald-400 block">
                        +${activeScenario.cascadeAvoided.toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-slate-900/60 p-2.5 border border-slate-800 rounded">
                      <span className="text-slate-500 block uppercase font-bold">CO2 REDUCED</span>
                      <span className={`text-xs font-bold block ${activeScenario.carbonReduced > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {activeScenario.carbonReduced} kg
                      </span>
                    </div>

                    {/* REINFORCEMENT LEARNING CONTROLLER READOUT */}
                    <div className="col-span-2 md:col-span-4 bg-slate-900/80 border border-slate-800 rounded p-3 mt-1 relative">
                      <div className="flex items-center space-x-1.5 text-slate-300 font-bold uppercase mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                        <span>PREDICTIVE DISPATCH RECOMMENDATION</span>
                      </div>
                      <p className="text-slate-400 leading-relaxed text-[10px]">
                        <b>Recommended Action:</b> {activeScenario.rlAction}
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Selected Component Status Details Card */}
        <div className="space-y-6">
          
          {/* Diagnostic Component Drawer */}
          <div className="premium-card rounded-xl p-5 space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <Settings className="w-4 h-4 text-slate-400" />
              <div>
                <span className="text-[9px] font-mono text-slate-500 block uppercase font-bold">Assembly Metric Sheet</span>
                <h3 className="text-sm font-bold text-white font-sans">{activeComponent?.name}</h3>
              </div>
            </div>

            <div className="space-y-3 font-mono text-[10px] text-slate-300">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-500">Local Health Index</span>
                <span className={`font-semibold ${
                  activeComponent?.healthScore > 80 ? 'text-emerald-400' :
                  activeComponent?.healthScore > 50 ? 'text-amber-400' : 'text-rose-400 font-bold'
                }`}>{activeComponent?.healthScore}%</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-500">Failure Flags</span>
                <span className={`font-semibold uppercase text-[9px] px-1.5 py-0.2 border rounded ${
                  activeComponent?.status === 'healthy' ? 'text-emerald-400 border-emerald-900/50 bg-emerald-950/20' :
                  activeComponent?.status === 'warning' ? 'text-amber-400 border-amber-900/50 bg-amber-950/20' : 'text-rose-400 border-rose-900/50 bg-rose-950/20'
                }`}>{activeComponent?.status}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-500">SHAP Attribution</span>
                <span className={`font-semibold ${activeComponent?.shapContribution > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {activeComponent?.shapContribution > 0 ? '+' : ''}{activeComponent?.shapContribution.toFixed(2)}
                </span>
              </div>
              <div className="space-y-1 pt-1">
                <span className="text-slate-500 block">Telemetry Memo:</span>
                <p className="text-[10px] text-slate-400 leading-relaxed bg-slate-950/50 border border-slate-800 p-2 rounded">
                  {activeComponent?.description}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Real-time Gauge Metrics */}
          <div className="grid grid-cols-2 gap-4">
            
            <div className="premium-card rounded-xl p-4 flex flex-col justify-between">
              <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 uppercase font-semibold">
                <span>Spindle Temp</span>
                <Thermometer className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="flex items-baseline space-x-1 mt-2 mb-1">
                <span className={`text-lg font-bold font-mono ${liveSensors.temperature > 80 ? 'text-rose-400' : 'text-slate-100'}`}>
                  {liveSensors.temperature}
                </span>
                <span className="text-[9px] font-mono text-slate-500">°C</span>
              </div>
              <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${
                    liveSensors.temperature > 80 ? 'bg-rose-500' : 'bg-slate-500'
                  }`} 
                  style={{ width: `${Math.min(100, ((liveSensors.temperature) / 110) * 100)}%` }} 
                />
              </div>
            </div>

            <div className="premium-card rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[9px] font-mono text-slate-500 uppercase font-semibold block">Hydraulic</span>
              <div className="flex items-baseline space-x-1 mt-2 mb-1">
                <span className="text-lg font-bold font-mono text-slate-100">
                  {liveSensors.pressure}
                </span>
                <span className="text-[9px] font-mono text-slate-500">bar</span>
              </div>
              <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                <div 
                  className="bg-slate-500 h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${Math.min(100, ((liveSensors.pressure) / 160) * 100)}%` }} 
                />
              </div>
            </div>

            <div className="premium-card rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[9px] font-mono text-slate-500 uppercase font-semibold block">Vibration</span>
              <div className="flex items-baseline space-x-1 mt-2 mb-1">
                <span className={`text-lg font-bold font-mono ${liveSensors.vibration > 6.0 ? 'text-rose-400' : 'text-slate-100'}`}>
                  {liveSensors.vibration}
                </span>
                <span className="text-[9px] font-mono text-slate-500">mm/s</span>
              </div>
              <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${
                    liveSensors.vibration > 6.0 ? 'bg-rose-500' : 'bg-slate-500'
                  }`} 
                  style={{ width: `${Math.min(100, ((liveSensors.vibration) / 10) * 100)}%` }} 
                />
              </div>
            </div>

            <div className="premium-card rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[9px] font-mono text-slate-500 uppercase font-semibold block">Viscosity</span>
              <div className="flex items-baseline space-x-1 mt-2 mb-1">
                <span className="text-lg font-bold font-mono text-slate-100">
                  {liveSensors.bpr || 8.35}
                </span>
                <span className="text-[9px] font-mono text-slate-500">index</span>
              </div>
              <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                <div 
                  className="bg-slate-500 h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${Math.min(100, (((liveSensors.bpr || 8.35) - 8.0) / 0.8) * 100)}%` }} 
                />
              </div>
            </div>

          </div>

          {/* RUL predictive output box */}
          <div className="premium-card rounded-xl p-5 bg-gradient-to-r from-slate-900 to-slate-950 relative overflow-hidden">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider block">PREDICTIVE REMAINING USEFUL LIFE</span>
              <span className="w-1.5 h-1.5 bg-sky-400 rounded-full" />
            </div>
            <div className="flex items-baseline space-x-2 mt-2 mb-1">
              <span className="text-3xl font-extrabold font-mono text-white">{activeTwin?.predictedRUL}</span>
              <span className="text-[9px] font-mono text-slate-500 uppercase">Hours (RUL)</span>
            </div>
            <p className="text-[9px] font-mono text-slate-400">
              Mating overhaul cycle: <b className="text-slate-300 font-semibold">{new Date(Date.now() + activeTwin?.predictedRUL * 3600 * 1000).toLocaleString()}</b>
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
