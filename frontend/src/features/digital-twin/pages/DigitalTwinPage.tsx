import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  BarChart2,
  Box
} from 'lucide-react';
import { useMachineStore } from '@shared/stores/useMachineStore';
import { useSensorStore } from '@shared/stores/useSensorStore';
import { twinApi, machineApi } from '@shared/services/api';
import { useQuery } from '@tanstack/react-query';
import DigitalTwin3D from '../components/DigitalTwin3D';

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

export default function DigitalTwinPage() {
  const { 
    factories, 
    machines, 
    selectedFactoryId, 
    selectedMachineId, 
    selectedComponentId, 
    setSelectedFactory, 
    setSelectedMachine, 
    setSelectedComponent,
    setMachines,
    setFactories
  } = useMachineStore();

  const { appendReading, latestReadings } = useSensorStore();

  // Load machines
  const { data: machinesList } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const res = await machineApi.listAll();
      setMachines(res);
      const factoryIds = Array.from(new Set(res.map(m => m.metadata.factoryId)));
      const generatedFactories = factoryIds.map(fid => ({
        id: fid,
        name: fid === 'factory-a' || fid === 'F-001' ? 'Munich Precision Mill Site' : fid === 'factory-b' || fid === 'F-002' ? 'Stuttgart Forging Plant' : fid === 'factory-c' ? 'Hamburg Casting Center' : 'Leipzig Assembly Site',
        location: fid === 'factory-a' || fid === 'F-001' ? 'Munich, DE' : fid === 'factory-b' || fid === 'F-002' ? 'Stuttgart, DE' : fid === 'factory-c' ? 'Hamburg, DE' : 'Leipzig, DE',
        timezone: 'CET',
        machineCount: res.filter(m => m.metadata.factoryId === fid).length,
        operatingShift: 'Three-Shift (24/7)',
        coordinates: { lat: 48.1351, lon: 11.582 }
      }));
      setFactories(generatedFactories);
      if (generatedFactories.length > 0 && !selectedFactoryId) {
        setSelectedFactory(generatedFactories[0].id);
      }
      return res;
    }
  });

  const factoryMachines = Object.values(machines).filter(m => m.metadata.factoryId === selectedFactoryId);
  const activeTwin = machines[selectedMachineId || ''] || factoryMachines[0];

  useEffect(() => {
    if (activeTwin && !selectedMachineId) {
      setSelectedMachine(activeTwin.metadata.id);
    }
  }, [activeTwin, selectedMachineId]);

  const activeComponent = activeTwin?.components.find(c => c.id === selectedComponentId) || activeTwin?.components[0];

  // Local tabs: 'twin' or 'whatif'
  const [twinPanelMode, setTwinPanelMode] = useState<'twin' | 'whatif'>('twin');
  const [whatifSubTab, setWhatifSubTab] = useState<'scenarios' | 'manual'>('scenarios');

  // Simulation parameters states
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('bearings');
  const [isSimulatingScenario, setIsSimulatingScenario] = useState<boolean>(false);
  const [simulationProgress, setSimulationProgress] = useState<number>(0);
  const [runsCount, setRunsCount] = useState<number>(0);
  const [showSimResults, setShowSimResults] = useState<boolean>(false);

  // Manual Overrides State
  const [manualTempOverride, setManualTempOverride] = useState<number>(25.4);
  const [manualVibOverride, setManualVibOverride] = useState<number>(1.4);
  const [manualSpeedOverride, setManualSpeedOverride] = useState<number>(1800);
  const [manualWearOverride, setManualWearOverride] = useState<number>(12.0);

  const activeScenario = SCENARIOS.find(s => s.id === selectedScenarioId) || SCENARIOS[0];

  // Load sensors values from activeTwin or fallback. Map real C-MAPSS variables to visual proxies.
  const rawSensors = latestReadings[activeTwin?.metadata.id] || activeTwin?.sensors || {};
  const currentSensors = {
    temperature: rawSensors.temperature ?? (rawSensors.s4 ? (rawSensors.s4 - 1300) / 2 : 25.4),
    vibration: rawSensors.vibration ?? (rawSensors.s14 ? Math.max(0, (rawSensors.s14 - 8100) / 10) : 1.4),
    speed: rawSensors.speed ?? (rawSensors.s2 ? rawSensors.s2 * 3 : 1800),
    wear: rawSensors.wear ?? rawSensors.toolWear ?? (rawSensors.s3 ? Math.max(0, rawSensors.s3 - 1500) : 12.0)
  };

  // Sync manual settings with machine values
  useEffect(() => {
    if (activeTwin) {
      setManualTempOverride(activeTwin.sensors.temperature);
      setManualVibOverride(activeTwin.sensors.vibration);
      setManualSpeedOverride(activeTwin.sensors.speed);
      setManualWearOverride(activeTwin.sensors.wear || activeTwin.sensors.toolWear || 12.0);
    }
  }, [activeTwin?.metadata.id]);

  // Simulate real-time telemetry changes in interval
  useEffect(() => {
    if (!isSimulating || !activeTwin) return;

    const interval = setInterval(() => {
      const isFaulty = activeTwin.healthScore < 50;
      const noiseT = (Math.random() - 0.5) * (isFaulty ? 3.0 : 0.8);
      const noiseV = (Math.random() - 0.5) * (isFaulty ? 0.9 : 0.15);
      const noiseS = (Math.random() - 0.5) * 50;

      const nextSensors = {
        ...currentSensors,
        temperature: parseFloat(Math.max(10, currentSensors.temperature + noiseT).toFixed(1)),
        vibration: parseFloat(Math.max(0.1, currentSensors.vibration + noiseV).toFixed(2)),
        speed: Math.round(Math.max(100, currentSensors.speed + noiseS)),
        wear: parseFloat(Math.min(300, (currentSensors.wear || 12) + 0.05).toFixed(2))
      };

      appendReading(activeTwin.metadata.id, nextSensors, new Date().toISOString());
    }, 2000);

    return () => clearInterval(interval);
  }, [isSimulating, activeTwin?.metadata.id, currentSensors]);

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
    <div className="page-container">
      {/* Selector Strip */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center p-4 rounded-lg bg-white border border-gray-200 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Factory Site */}
          <div>
            <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-1">FACTORY SITE</label>
            <select 
              value={selectedFactoryId || ''} 
              onChange={(e) => setSelectedFactory(e.target.value)}
              className="text-xs border border-gray-200 bg-white font-medium text-gray-800 rounded-md px-3 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              {factories.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Machine Workstation */}
          <div>
            <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-1">MACHINERY WORKSTATION</label>
            <select 
              value={selectedMachineId || ''} 
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="text-xs border border-gray-200 bg-white font-medium text-gray-800 rounded-md px-3 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              {factoryMachines.map(m => (
                <option key={m.metadata.id} value={m.metadata.id}>
                  {m.metadata.name} (HP: {Math.round(m.healthScore)}%)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Simulation Controls */}
        <div className="flex items-center space-x-4">
          <span className="text-[11px] font-medium text-gray-500">
            {isSimulating ? (
              <span className="flex items-center text-emerald-600">
                <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse" />
                Live Telemetry Synchronized
              </span>
            ) : (
              <span className="flex items-center text-gray-400">
                <span className="w-2 h-2 bg-gray-300 rounded-full mr-2" />
                Telemetry feed suspended
              </span>
            )}
          </span>
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`btn-sm font-medium border rounded-md transition-all flex items-center space-x-1.5 cursor-pointer ${
              isSimulating 
                ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50' 
                : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSimulating ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Feed</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Stream Feed</span>
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
          <div className="flex border-b border-gray-200 pb-px space-x-4">
            <button
              onClick={() => setTwinPanelMode('twin')}
              className={`pb-2 text-[13px] font-medium border-b-2 transition-all cursor-pointer ${
                twinPanelMode === 'twin' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Diagnostic Schematic Twin
            </button>
            <button
              onClick={() => setTwinPanelMode('whatif')}
              className={`pb-2 text-[13px] font-medium border-b-2 transition-all cursor-pointer ${
                twinPanelMode === 'whatif' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              What-if Maintenance Sandbox
            </button>
          </div>

          {twinPanelMode === 'twin' ? (
            <div className="card p-5 relative overflow-hidden flex flex-col justify-between min-h-[480px]">
              {/* Top telemetry state bar */}
              <div className="flex justify-between items-center border-b border-gray-100 pb-3 z-10">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">DIAGNOSTICS & SYSTEM ASSEMBLY STATUS</span>
                  <h3 className="text-[16px] font-semibold text-gray-900">{activeTwin?.metadata.name}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">Assembly Health</span>
                  <span className={`text-[15px] font-semibold ${
                    activeTwin?.healthScore > 80 ? 'text-emerald-600' : 
                    activeTwin?.healthScore > 50 ? 'text-amber-600' : 'text-red-500 font-bold'
                  }`}>
                    {Math.round(activeTwin?.healthScore || 100)}%
                  </span>
                </div>
              </div>

              {/* Interactive Mechanical Twin 3D Viewport */}
              <div className="relative w-full h-[360px] bg-gray-50 border border-gray-200 rounded-lg my-4 overflow-hidden flex items-center justify-center">
                {activeTwin ? (
                  <DigitalTwin3D 
                    temperature={currentSensors.temperature}
                    vibration={currentSensors.vibration}
                    speed={currentSensors.speed}
                    wear={currentSensors.wear || currentSensors.toolWear || 0}
                    healthScore={activeComponent ? activeComponent.healthScore : activeTwin.healthScore}
                    selectedComponent={selectedComponentId || 'spindle-motor'}
                    onSelectComponent={(id) => setSelectedComponent(id)}
                    componentIds={activeTwin.components.map(c => c.id)}
                  />
                ) : (
                  <div className="text-gray-400 text-xs font-mono">No active workstation selected</div>
                )}
              </div>
            </div>
          ) : (
            /* What-if maintenance simulation mode */
            <div className="card p-5 min-h-[480px] flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                  <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Simulate Overhaul Scenario Impact</h3>
                  <div className="flex bg-gray-100 p-0.5 rounded-md border border-gray-200 text-[11px] font-medium">
                    <button 
                      onClick={() => setWhatifSubTab('scenarios')}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${whatifSubTab === 'scenarios' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Presets
                    </button>
                    <button 
                      onClick={() => setWhatifSubTab('manual')}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${whatifSubTab === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Manual Overrides
                    </button>
                  </div>
                </div>

                {whatifSubTab === 'scenarios' ? (
                  /* Scenario Selector mode */
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {SCENARIOS.map(sc => (
                        <div
                          key={sc.id}
                          onClick={() => {
                            setSelectedScenarioId(sc.id);
                            setShowSimResults(false);
                          }}
                          className={`p-3.5 rounded-lg border text-left cursor-pointer transition-all ${
                            selectedScenarioId === sc.id 
                              ? 'bg-blue-50/50 border-blue-200' 
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">SCENARIO</span>
                          <span className="text-[13px] font-medium text-gray-900 block mt-1 truncate">{sc.name}</span>
                        </div>
                      ))}
                    </div>

                    {/* Active Scenario explanation */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-3 text-[13px] leading-relaxed text-gray-600">
                      <p><b className="text-gray-700 font-medium uppercase tracking-wider text-[10px] block mb-1">Details:</b>{activeScenario.explanation}</p>
                      <p className="text-blue-700"><b className="text-gray-700 font-medium uppercase tracking-wider text-[10px] block mb-1">Prescriptive Advisory (RL):</b>{activeScenario.rlAction}</p>
                    </div>
                  </div>
                ) : (
                  /* Manual parameter inputs sandbox */
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Spindle speed slider */}
                      <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center text-[12px] font-medium text-gray-600 mb-1.5">
                          <span>CNC Spindle Speed</span>
                          <span className="text-gray-900 font-semibold">{manualSpeedOverride} rpm</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="4000" 
                          step="50"
                          value={manualSpeedOverride} 
                          onChange={(e) => {
                            setManualSpeedOverride(Number(e.target.value));
                            setShowSimResults(false);
                          }}
                          className="w-full accent-blue-600 h-1 rounded bg-gray-200 appearance-none cursor-pointer"
                        />
                      </div>

                      {/* Motor Temperature slider */}
                      <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center text-[12px] font-medium text-gray-600 mb-1.5">
                          <span>Spindle Casing Temp</span>
                          <span className="text-gray-900 font-semibold">{manualTempOverride}°C</span>
                        </div>
                        <input 
                          type="range" 
                          min="15" 
                          max="120" 
                          step="0.5"
                          value={manualTempOverride} 
                          onChange={(e) => {
                            setManualTempOverride(Number(e.target.value));
                            setShowSimResults(false);
                          }}
                          className="w-full accent-blue-600 h-1 rounded bg-gray-200 appearance-none cursor-pointer"
                        />
                      </div>

                      {/* Vibration amplitude slider */}
                      <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center text-[12px] font-medium text-gray-600 mb-1.5">
                          <span>Vibration Amplitude</span>
                          <span className="text-gray-900 font-semibold">{manualVibOverride} mm/s</span>
                        </div>
                        <input 
                          type="range" 
                          min="0.1" 
                          max="12.0" 
                          step="0.1"
                          value={manualVibOverride} 
                          onChange={(e) => {
                            setManualVibOverride(Number(e.target.value));
                            setShowSimResults(false);
                          }}
                          className="w-full accent-blue-600 h-1 rounded bg-gray-200 appearance-none cursor-pointer"
                        />
                      </div>

                      {/* Tool Wear slider */}
                      <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center text-[12px] font-medium text-gray-600 mb-1.5">
                          <span>Flute Tool Wear Index</span>
                          <span className="text-gray-900 font-semibold">{manualWearOverride} min</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="300" 
                          step="1"
                          value={manualWearOverride} 
                          onChange={(e) => {
                            setManualWearOverride(Number(e.target.value));
                            setShowSimResults(false);
                          }}
                          className="w-full accent-blue-600 h-1 rounded bg-gray-200 appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Running the simulation button */}
              <div className="mt-6 pt-4 border-t border-gray-100 space-y-4">
                <button
                  onClick={handleRunSimulation}
                  disabled={isSimulatingScenario}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white text-[13px] font-medium py-3 rounded-lg transition-all cursor-pointer"
                >
                  {isSimulatingScenario ? `Running Monte-Carlo Simulations (${simulationProgress}%)` : 'Execute Predictive Impact Model'}
                </button>

                {/* Simulation loading bar */}
                {isSimulatingScenario && (
                  <div className="w-full bg-gray-100 border border-gray-200 rounded-full h-2 overflow-hidden">
                    <motion.div 
                      className="bg-blue-600 h-full rounded-full"
                      style={{ width: `${simulationProgress}%` }}
                    />
                  </div>
                )}

                {/* Simulation Results display panel */}
                <AnimatePresence>
                  {showSimResults && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="bg-gray-50 p-4 rounded-lg border border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono"
                    >
                      <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                        <span className="text-[9px] text-gray-400 block uppercase">RUL Delta</span>
                        <span className="text-emerald-600 font-bold block mt-1">
                          +{whatifSubTab === 'scenarios' ? activeScenario.rulGain : Math.round(180 - manualWearOverride * 0.5)} hrs
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                        <span className="text-[9px] text-gray-400 block uppercase">Est. Cost</span>
                        <span className="text-gray-900 font-bold block mt-1">
                          ${whatifSubTab === 'scenarios' ? activeScenario.cost.toLocaleString() : '$2,450'} USD
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                        <span className="text-[9px] text-gray-400 block uppercase">Downtime</span>
                        <span className="text-amber-500 font-bold block mt-1">
                          {whatifSubTab === 'scenarios' ? activeScenario.downtime : '3.0'} hrs
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                        <span className="text-[9px] text-gray-400 block uppercase">Cascade Saving</span>
                        <span className="text-blue-600 font-bold block mt-1">
                          ${whatifSubTab === 'scenarios' ? activeScenario.cascadeAvoided.toLocaleString() : '$12,500'} USD
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Assembly breakdown, wear coefficients, and component health values */}
        <div className="card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span>Structural Breakdown</span>
              </h3>
              <span className="badge-neutral">
                14 Assembly Nodes
              </span>
            </div>

            {/* Component list */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
              {activeTwin?.components.map(comp => {
                const isSelected = comp.id === selectedComponentId;
                const statusColor = comp.healthScore > 80 ? 'text-emerald-600' : comp.healthScore > 55 ? 'text-amber-500' : 'text-red-500';
                const borderClass = isSelected ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-gray-200 hover:border-gray-300';
                
                return (
                  <div
                    key={comp.id}
                    onClick={() => setSelectedComponent(comp.id)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${borderClass}`}
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-gray-900 truncate max-w-[170px]">{comp.name}</span>
                      <span className={`font-mono font-semibold ${statusColor}`}>{Math.round(comp.healthScore)}%</span>
                    </div>
                    {isSelected && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="text-[12px] text-gray-500 font-sans mt-2 pt-2 border-t border-gray-100 leading-relaxed space-y-1.5"
                      >
                        <p>{comp.description}</p>
                        <div className="flex justify-between items-center text-[10px] font-mono text-gray-400">
                          <span>SHAP Attribution: <b className="text-red-500 font-semibold">+{comp.shapContribution.toFixed(2)}</b></span>
                          {comp.replacementDueIn && (
                            <span>Replacement: <b>{Math.round(comp.replacementDueIn)} hrs</b></span>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick diagnostic overview panel */}
          {activeComponent && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3 text-xs">
                <div className="flex items-center space-x-2 text-blue-600">
                  <Thermometer className="w-4 h-4" />
                  <span className="font-semibold uppercase tracking-wider text-[11px]">SELECTED PART DIAGNOSTICS</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-white p-2 rounded-lg border border-gray-100">
                    <span className="text-[9px] text-gray-400 block uppercase">Temperature</span>
                    <span className="text-gray-900 mt-1 block font-bold">{currentSensors.temperature}°C</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-gray-100">
                    <span className="text-[9px] text-gray-400 block uppercase">Vibration</span>
                    <span className="text-gray-900 mt-1 block font-bold">{currentSensors.vibration} mm/s</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
