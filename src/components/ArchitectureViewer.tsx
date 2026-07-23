/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Cpu, 
  Database, 
  Layers, 
  MapPin, 
  RotateCw, 
  Shield, 
  Sliders, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Terminal, 
  FileText, 
  BookOpen, 
  Send, 
  GitCommit, 
  Settings, 
  Server, 
  Wrench,
  DollarSign,
  Clock,
  Code,
  Sparkles,
  HelpCircle,
  BarChart2,
  ChevronRight,
  ArrowRight,
  LayoutDashboard,
  Bot,
  User,
  Search,
  MessageSquare,
  Bell,
  Sun,
  Moon,
  Folder
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SensorData, 
  ComponentHealth, 
  MachineDigitalTwin, 
  FactoryDetails, 
  FederatedRound, 
  ShapExplainer 
} from '../types';

// Import modular subcomponents
import DashboardTab from './DashboardTab';
import DigitalTwinTab from './DigitalTwinTab';
import PredictionsTab from './PredictionsTab';
import ExplainableAITab from './ExplainableAITab';
import MaintenanceTab from './MaintenanceTab';
import FederatedLearningTab from './FederatedLearningTab';
import MultiAgentTab from './MultiAgentTab';
import DatasetUplinkTab from './DatasetUplinkTab';
import ComputerVisionTab from './ComputerVisionTab';
import AIOutputDashboard from './AIOutputDashboard';

import { calculatePhysicalHealth } from '../utils/healthFormula';
import { calculateExactShap } from '../utils/shapSolver';
import { runXGBoost, sensorsToFeatureArray } from '../utils/machineLearningModels';

// Define initial machines state static structure outside to prevent re-creation
const INITIAL_MACHINES: Record<string, Record<string, MachineDigitalTwin>> = {
  'factory-a': {
    'cnc-101': {
      metadata: { id: 'cnc-101', name: 'CNC Station #101 (Precision Mill)', type: 'CNC Milling', factoryId: 'factory-a', commissionedDate: '2023-04-12' },
      sensors: { 
        timestamp: '10:45:00', 
        temperature: 25.4, 
        pressure: 35.2, 
        vibration: 1.4, 
        speed: 1800, 
        torque: 38.5, 
        wear: 12.0, 
        airTemp: 298.5, 
        processTemp: 308.3, 
        rotationalSpeed: 1800, 
        toolWear: 12.0, 
        machineType: 'H', 
        failureType: 'No Failure', 
        target: 0, 
        powerConsumption: 5.8, 
        motorCurrent: 7.9 
      },
      healthScore: 96,
      predictedRUL: 184, // remaining production hours
      failureProbability: 1.2,
      components: [
        { id: 'machine-body', name: 'Machine Body Enclosure', healthScore: 98, status: 'healthy', shapContribution: -0.01, description: 'Chassis structures rigid. Isolation mounts absorb 98% of rotational vibration.' },
        { id: 'control-panel', name: 'CNC Control Panel', healthScore: 99, status: 'healthy', shapContribution: -0.02, description: 'Industrial Rexroth HMI interface online. Active G-code loop timing calibrated.' },
        { id: 'spindle', name: 'High-Speed Spindle', healthScore: 96, status: 'healthy', shapContribution: -0.05, description: 'Spindle axial alignment balanced, bearing temperature stable.' },
        { id: 'chuck', name: 'Mechanical Chuck', healthScore: 95, status: 'healthy', shapContribution: -0.03, description: 'Clamping force at 12.4 kN. Radial runout is below 1.2 microns.' },
        { id: 'cutting-tool', name: 'Precision Cutting Tool', healthScore: 97, status: 'healthy', shapContribution: -0.04, description: 'Carbide milling tip pristine. Micro-edge wear indexes nominal.' },
        { id: 'workpiece', name: 'Alloy Workpiece Unit', healthScore: 99, status: 'healthy', shapContribution: -0.01, description: 'Workpiece clamping pressure verified. G-code coordinates calibrated.' },
        { id: 'coolant-system', name: 'Coolant Flow Recirculator', healthScore: 95, status: 'healthy', shapContribution: -0.02, description: 'Coolant nozzle delivery pressure stable. Particle filters transparent.' },
        { id: 'servo-motors', name: 'Brushless Servo Motors', healthScore: 97, status: 'healthy', shapContribution: -0.03, description: 'Coil temperature stable. Zero backlash detected on slide gears.' },
        { id: 'hydraulic-unit', name: 'Hydraulic Press Pump', healthScore: 96, status: 'healthy', shapContribution: -0.02, description: 'Press line fluid pressure: 140 bar. Seal lubrication film present.' },
        { id: 'electrical-cabinet', name: 'Electrical Power Cabinet', healthScore: 98, status: 'healthy', shapContribution: -0.01, description: 'Three-phase supply current regulators operating at 100% capacity.' },
        { id: 'safety-doors', name: 'Pneumatic Safety Doors', healthScore: 100, status: 'healthy', shapContribution: 0.0, description: 'Double-glazed safety glass interlocked. Optical shields active.' },
        { id: 'axis-x', name: 'Axis X Guide Rails', healthScore: 97, status: 'healthy', shapContribution: -0.02, description: 'Slide carriage lubrication film active. Slide resistance within bounds.' },
        { id: 'axis-y', name: 'Axis Y Guide Rails', healthScore: 96, status: 'healthy', shapContribution: -0.02, description: 'Axis positioning accuracy: +/- 1.5 microns. No guide play.' },
        { id: 'axis-z', name: 'Axis Z Guide Rails', healthScore: 95, status: 'healthy', shapContribution: -0.03, description: 'Ball screw pre-tension calibrated. Vertical drag friction normal.' }
      ],
      recommendedAction: 'Standard shift inspection recommended. Mechanical tolerances within nominal baseline.',
      estimatedDowntime: 1.5,
      estimatedRepairCost: 450
    }
  },
  'factory-b': {
    'cnc-202': {
      metadata: { id: 'cnc-202', name: 'CNC Station #202 (Heavy Duty)', type: 'CNC Milling', factoryId: 'factory-b', commissionedDate: '2022-09-18' },
      sensors: { 
        timestamp: '10:45:00', 
        temperature: 39.4, 
        pressure: 45.6, 
        vibration: 3.8, 
        speed: 2450, 
        torque: 54.0, 
        wear: 110.0, 
        airTemp: 312.5, 
        processTemp: 318.7, 
        rotationalSpeed: 2450, 
        toolWear: 110.0, 
        machineType: 'M', 
        failureType: 'Heat Dissipation Failure', 
        target: 1, 
        powerConsumption: 13.8, 
        motorCurrent: 18.5 
      },
      healthScore: 72,
      predictedRUL: 48,
      failureProbability: 28.4,
      components: [
        { id: 'machine-body', name: 'Machine Body Enclosure', healthScore: 92, status: 'healthy', shapContribution: -0.01, description: 'Chassis structures stable. Normal structural resonance detected.' },
        { id: 'control-panel', name: 'CNC Control Panel', healthScore: 98, status: 'healthy', shapContribution: -0.02, description: 'Panel responsive. Memory utilization at 68% of capacity.' },
        { id: 'spindle', name: 'High-Speed Spindle', healthScore: 78, status: 'warning', shapContribution: 0.12, description: 'Spindle bearing thermal creep detected. Temperature risen +12%.' },
        { id: 'chuck', name: 'Mechanical Chuck', healthScore: 90, status: 'healthy', shapContribution: -0.01, description: 'Clamping force holding at 11.8 kN. Minimal runout drift.' },
        { id: 'cutting-tool', name: 'Precision Cutting Tool', healthScore: 84, status: 'warning', shapContribution: 0.18, description: 'Flute edge wear index climbing. Tool life remaining: 128 min.' },
        { id: 'workpiece', name: 'Alloy Workpiece Unit', healthScore: 96, status: 'healthy', shapContribution: -0.01, description: 'Lock integrity verified. High speed feed resistance is nominal.' },
        { id: 'coolant-system', name: 'Coolant Flow Recirculator', healthScore: 54, status: 'critical', shapContribution: 0.58, description: 'Thermal failure precursor: Coolant pump flow restricted. Heat dissipation capacity is degraded.' },
        { id: 'servo-motors', name: 'Brushless Servo Motors', healthScore: 89, status: 'healthy', shapContribution: -0.02, description: 'Servo temperature elevated but within acceptable standard bounds.' },
        { id: 'hydraulic-unit', name: 'Hydraulic Press Pump', healthScore: 91, status: 'healthy', shapContribution: -0.02, description: 'Pressure active. Fluid level is optimal, viscosity stable.' },
        { id: 'electrical-cabinet', name: 'Electrical Power Cabinet', healthScore: 95, status: 'healthy', shapContribution: -0.01, description: 'Cabinet cooling fans operational, drawing nominal power.' },
        { id: 'safety-doors', name: 'Pneumatic Safety Doors', healthScore: 100, status: 'healthy', shapContribution: 0.0, description: 'Safety interlocking active.' },
        { id: 'axis-x', name: 'Axis X Guide Rails', healthScore: 90, status: 'healthy', shapContribution: -0.01, description: 'Slide rails lubed. Friction is normal.' },
        { id: 'axis-y', name: 'Axis Y Guide Rails', healthScore: 88, status: 'healthy', shapContribution: -0.02, description: 'Parallelism aligned with granite bed.' },
        { id: 'axis-z', name: 'Axis Z Guide Rails', healthScore: 85, status: 'healthy', shapContribution: -0.03, description: 'Ball screw backlash minimal.' }
      ],
      recommendedAction: 'Warning: Coolant flow restriction is limiting process heat dissipation. Clean out central fluid filter grids at the next shift gap.',
      estimatedDowntime: 4.0,
      estimatedRepairCost: 2800
    }
  },
  'factory-c': {
    'cnc-303': {
      metadata: { id: 'cnc-303', name: 'CNC Station #303 (Multi-Spindle)', type: 'CNC Milling', factoryId: 'factory-c', commissionedDate: '2021-02-11' },
      sensors: { 
        timestamp: '10:45:00', 
        temperature: 28.5, 
        pressure: 38.9, 
        vibration: 6.2, 
        speed: 1350, 
        torque: 64.5, 
        wear: 215.0, 
        airTemp: 301.6, 
        processTemp: 312.0, 
        rotationalSpeed: 1350, 
        toolWear: 215.0, 
        machineType: 'L', 
        failureType: 'Tool Wear Failure', 
        target: 1, 
        powerConsumption: 9.1, 
        motorCurrent: 37.8 
      },
      healthScore: 38,
      predictedRUL: 12,
      failureProbability: 86.2,
      components: [
        { id: 'machine-body', name: 'Machine Body Enclosure', healthScore: 88, status: 'healthy', shapContribution: -0.01, description: 'Slight mechanical resonance in structural castings.' },
        { id: 'control-panel', name: 'CNC Control Panel', healthScore: 95, status: 'healthy', shapContribution: -0.01, description: 'HMI panel active. Keypad responsive.' },
        { id: 'spindle', name: 'High-Speed Spindle', healthScore: 62, status: 'warning', shapContribution: 0.28, description: 'Severe vibration: Spindle chattering index peaks at 6.2 mm/s.' },
        { id: 'chuck', name: 'Mechanical Chuck', healthScore: 84, status: 'healthy', shapContribution: -0.02, description: 'Chuck grip force stable, slight radial imbalance detected.' },
        { id: 'cutting-tool', name: 'Precision Cutting Tool', healthScore: 18, status: 'failed', shapContribution: 0.69, description: 'Critical wear: Cutting tool wear exceeds limit (215 min / 200 min threshold). Cutter tip is heavily degraded.' },
        { id: 'workpiece', name: 'Alloy Workpiece Unit', healthScore: 90, status: 'healthy', shapContribution: -0.01, description: 'Block clamped. Tool chattering causing minor surface finish degradation.' },
        { id: 'coolant-system', name: 'Coolant Flow Recirculator', healthScore: 82, status: 'healthy', shapContribution: -0.03, description: 'Coolant flow holding at 38 L/min.' },
        { id: 'servo-motors', name: 'Brushless Servo Motors', healthScore: 78, status: 'warning', shapContribution: 0.14, description: 'Servo current draw peaking to combat feed chattering.' },
        { id: 'hydraulic-unit', name: 'Hydraulic Press Pump', healthScore: 85, status: 'healthy', shapContribution: -0.02, description: 'Pressure stable at 135 bar. Viscosity normal.' },
        { id: 'electrical-cabinet', name: 'Electrical Power Cabinet', healthScore: 92, status: 'healthy', shapContribution: -0.01, description: 'Supply breakers and regulators functional.' },
        { id: 'safety-doors', name: 'Pneumatic Safety Doors', healthScore: 100, status: 'healthy', shapContribution: 0.0, description: 'Doors closed and locked.' },
        { id: 'axis-x', name: 'Axis X Guide Rails', healthScore: 75, status: 'warning', shapContribution: 0.12, description: 'Vibration feedback affecting X-axis servo. Backlash detected.' },
        { id: 'axis-y', name: 'Axis Y Guide Rails', healthScore: 84, status: 'healthy', shapContribution: -0.02, description: 'Guide rails clean, positioning within standard range.' },
        { id: 'axis-z', name: 'Axis Z Guide Rails', healthScore: 82, status: 'healthy', shapContribution: -0.02, description: 'Guide rails aligned. Slide carriage friction nominal.' }
      ],
      recommendedAction: 'Emergency Action: Schedule cutting tool replacement. Do not run high-speed finishing cuts. Decommission station for manual spindle axis alignment check.',
      estimatedDowntime: 8.0,
      estimatedRepairCost: 1450
    }
  },
  'factory-d': {
    'cnc-404': {
      metadata: { id: 'cnc-404', name: 'CNC Station #404 (Five-Axis)', type: 'CNC Milling', factoryId: 'factory-d', commissionedDate: '2021-11-20' },
      sensors: { 
        timestamp: '10:45:00', 
        temperature: 31.2, 
        pressure: 42.4, 
        vibration: 8.5, 
        speed: 2750, 
        torque: 75.2, 
        wear: 180.0, 
        airTemp: 304.3, 
        processTemp: 315.5, 
        rotationalSpeed: 2750, 
        toolWear: 180.0, 
        machineType: 'H', 
        failureType: 'Power Failure', 
        target: 1, 
        powerConsumption: 21.6, 
        motorCurrent: 48.5 
      },
      healthScore: 14,
      predictedRUL: 2,
      failureProbability: 95.8,
      components: [
        { id: 'machine-body', name: 'Machine Body Enclosure', healthScore: 72, status: 'warning', shapContribution: 0.12, description: 'Structural micro-cracking propagation detected due to high torsional strain.' },
        { id: 'control-panel', name: 'CNC Control Panel', healthScore: 92, status: 'healthy', shapContribution: -0.02, description: 'Control terminal active, running diagnostic sub-routines.' },
        { id: 'spindle', name: 'High-Speed Spindle', healthScore: 28, status: 'failed', shapContribution: 0.65, description: 'Spindle motor armature lock risk: Rotational resistance has spiked due to thermal locking.' },
        { id: 'chuck', name: 'Mechanical Chuck', healthScore: 64, status: 'warning', shapContribution: 0.22, description: 'Chuck clamp pressure drops below safety threshold (8.2 kN).' },
        { id: 'cutting-tool', name: 'Precision Cutting Tool', healthScore: 45, status: 'warning', shapContribution: 0.28, description: 'Tip chipping detected. Extreme frictional heat at cutter head.' },
        { id: 'workpiece', name: 'Alloy Workpiece Unit', healthScore: 88, status: 'healthy', shapContribution: -0.02, description: 'Clamps holding workpiece in position.' },
        { id: 'coolant-system', name: 'Coolant Flow Recirculator', healthScore: 78, status: 'healthy', shapContribution: -0.03, description: 'Flow rate holds at 42 L/min.' },
        { id: 'servo-motors', name: 'Brushless Servo Motors', healthScore: 24, status: 'failed', shapContribution: 0.69, description: 'Critical power failure: Servo driver module over-current draw. Internal windings shorted out.' },
        { id: 'hydraulic-unit', name: 'Hydraulic Press Pump', healthScore: 52, status: 'critical', shapContribution: 0.45, description: 'Hydraulic unit fluid temperature: 95°C. Gasket erosion has vented seal pressure.' },
        { id: 'electrical-cabinet', name: 'Electrical Power Cabinet', healthScore: 42, status: 'critical', shapContribution: 0.49, description: 'Phases severely imbalanced. Phase 3 capacitor bank blown.' },
        { id: 'safety-doors', name: 'Pneumatic Safety Doors', healthScore: 100, status: 'healthy', shapContribution: 0.0, description: 'Door seals locked.' },
        { id: 'axis-x', name: 'Axis X Guide Rails', healthScore: 71, status: 'warning', shapContribution: 0.18, description: 'Axis positioning error: horizontal slip. Guide rail debris active.' },
        { id: 'axis-y', name: 'Axis Y Guide Rails', healthScore: 74, status: 'warning', shapContribution: 0.15, description: 'Vertical carriage slip. Counterweight drift detected.' },
        { id: 'axis-z', name: 'Axis Z Guide Rails', healthScore: 68, status: 'warning', shapContribution: 0.21, description: 'Ball screw backlash limits exceeded. High slide resistance.' }
      ],
      recommendedAction: 'Urgent Lockout/Tagout: Electrical phase imbalance and servo motor windings short have triggered immediate safety interlocks.',
      estimatedDowntime: 24.0,
      estimatedRepairCost: 18500
    }
  }
};

export default function ArchitectureViewer() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'blueprint' | 'twin' | 'predictions' | 'explainable' | 'maintenance' | 'federated' | 'multiagent' | 'dataset' | 'vision' | 'aioutput'>('dashboard');
  const [activeSection, setActiveSection] = useState<'dashboard' | 'projects' | 'aichat' | 'analytics' | 'files' | 'settings' | 'account'>('dashboard');
  const [activeProjectTab, setActiveProjectTab] = useState<'twin' | 'blueprint'>('twin');
  const [activeAIChatTab, setActiveAIChatTab] = useState<'maintenance' | 'multiagent'>('maintenance');
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<'predictions' | 'explainable' | 'federated' | 'vision' | 'aioutput'>('predictions');
  const [activeFilesTab, setActiveFilesTab] = useState<'dataset'>('dataset');
  const [userRole, setUserRole] = useState<'Admin' | 'Plant Manager' | 'Maintenance Engineer' | 'Operator'>('Plant Manager');

  // Router adapter to handle legacy tab navigations from subcomponents gracefully
  const handleNavigate = (tab: any) => {
    setActiveTab(tab);
    if (tab === 'dashboard') {
      setActiveSection('dashboard');
    } else if (tab === 'twin' || tab === 'blueprint') {
      setActiveSection('projects');
      setActiveProjectTab(tab);
    } else if (tab === 'maintenance' || tab === 'multiagent') {
      setActiveSection('aichat');
      setActiveAIChatTab(tab);
    } else if (tab === 'predictions' || tab === 'explainable' || tab === 'federated' || tab === 'vision' || tab === 'aioutput') {
      setActiveSection('analytics');
      setActiveAnalyticsTab(tab);
    } else if (tab === 'dataset') {
      setActiveSection('files');
      setActiveFilesTab('dataset');
    }
  };
  
  // State-based dynamic machines list
  const [machines, setMachines] = useState<Record<string, Record<string, MachineDigitalTwin>>>(INITIAL_MACHINES);
  
  // Simulated State for interactive Twin Wireframe
  const [selectedFactory, setSelectedFactory] = useState<string>('factory-a');
  const [selectedMachine, setSelectedMachine] = useState<string>('cnc-101');
  const [selectedComponent, setSelectedComponent] = useState<string>('spindle');
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  
  // FL simulation state
  const [flRound, setFlRound] = useState<number>(12);
  const [flHistory, setFlHistory] = useState<FederatedRound[]>([
    { roundId: 1, timestamp: '10:00:00', globalAccuracy: 0.72, globalLoss: 0.68, bandwidthUsed: '1.2 MB', clientLosses: { 'Factory A (CNC-800)': 0.70, 'Factory B (HP-1200)': 0.74, 'Factory C (RW-300)': 0.71, 'Factory D (HT-400)': 0.73 }, clientAccuracies: { 'Factory A (CNC-800)': 0.73, 'Factory B (HP-1200)': 0.71, 'Factory C (RW-300)': 0.72, 'Factory D (HT-400)': 0.72 }, privacyBudgetEpsilon: 0.50 },
    { roundId: 4, timestamp: '10:15:00', globalAccuracy: 0.79, globalLoss: 0.49, bandwidthUsed: '4.8 MB', clientLosses: { 'Factory A (CNC-800)': 0.47, 'Factory B (HP-1200)': 0.52, 'Factory C (RW-300)': 0.48, 'Factory D (HT-400)': 0.49 }, clientAccuracies: { 'Factory A (CNC-800)': 0.80, 'Factory B (HP-1200)': 0.78, 'Factory C (RW-300)': 0.79, 'Factory D (HT-400)': 0.79 }, privacyBudgetEpsilon: 1.20 },
    { roundId: 8, timestamp: '10:30:00', globalAccuracy: 0.86, globalLoss: 0.32, bandwidthUsed: '9.6 MB', clientLosses: { 'Factory A (CNC-800)': 0.30, 'Factory B (HP-1200)': 0.35, 'Factory C (RW-300)': 0.31, 'Factory D (HT-400)': 0.32 }, clientAccuracies: { 'Factory A (CNC-800)': 0.87, 'Factory B (HP-1200)': 0.85, 'Factory C (RW-300)': 0.86, 'Factory D (HT-400)': 0.86 }, privacyBudgetEpsilon: 2.00 },
    { roundId: 12, timestamp: '10:45:00', globalAccuracy: 0.934, globalLoss: 0.18, bandwidthUsed: '14.4 MB', clientLosses: { 'Factory A (CNC-800)': 0.16, 'Factory B (HP-1200)': 0.20, 'Factory C (RW-300)': 0.17, 'Factory D (HT-400)': 0.19 }, clientAccuracies: { 'Factory A (CNC-800)': 0.94, 'Factory B (HP-1200)': 0.91, 'Factory C (RW-300)': 0.93, 'Factory D (HT-400)': 0.93 }, privacyBudgetEpsilon: 2.80 }
  ]);
  
  // AI assistant state
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'gemini'; text: string; rrul?: boolean }>>([
    { sender: 'gemini', text: "Hello! I am the ForgeSight AI Technical RAG Agent, integrated with machinery ISO-standards, equipment manuals, and shop floor bulletins. I have parsed the real-time sensor streams from Factory A (CNC-800), Factory B (HP-1200), Factory C (RW-300), and Factory D (HT-400). Ask me anything about spindle chattering, hydraulic valve slips, temperature surges, or replacement downtime scheduling!" },
  ]);

  // Factories list
  const factories: Record<string, FactoryDetails> = {
    'factory-a': { id: 'factory-a', name: 'Factory A (Munich, Germany)', location: 'Munich', machineCount: 120, avgHealthScore: 92, networkStatus: 'online', localLoss: 0.16, localAccuracy: 0.94, lastCommRound: 12 },
    'factory-b': { id: 'factory-b', name: 'Factory B (Detroit, USA)', location: 'Detroit', machineCount: 145, avgHealthScore: 84, networkStatus: 'online', localLoss: 0.20, localAccuracy: 0.91, lastCommRound: 12 },
    'factory-c': { id: 'factory-c', name: 'Factory C (Tokyo, Japan)', location: 'Tokyo', machineCount: 110, avgHealthScore: 89, networkStatus: 'online', localLoss: 0.17, localAccuracy: 0.93, lastCommRound: 12 },
    'factory-d': { id: 'factory-d', name: 'Factory D (Shanghai, China)', location: 'Shanghai', machineCount: 200, avgHealthScore: 78, networkStatus: 'online', localLoss: 0.19, localAccuracy: 0.93, lastCommRound: 12 },
  };

  // Safe fetch function for nested objects
  const getActiveTwin = (): MachineDigitalTwin => {
    const factory = machines[selectedFactory];
    if (factory && factory[selectedMachine]) {
      return factory[selectedMachine];
    }
    // Return Factory A Unit cnc-101 as fallback
    return machines['factory-a']['cnc-101'] || Object.values(Object.values(machines)[0])[0];
  };

  const activeTwin = getActiveTwin();
  const activeComponent = activeTwin.components.find(c => c.id === selectedComponent) || activeTwin.components[0];

  // Simulated live sensor ticking
  const [liveSensors, setLiveSensors] = useState<SensorData>(activeTwin.sensors);
  useEffect(() => {
    setLiveSensors(activeTwin.sensors);
  }, [selectedMachine, selectedFactory]);

  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(() => {
      setLiveSensors(prev => {
        const isUnhealthy = activeTwin.healthScore < 70;
        const trendFactor = isUnhealthy ? 0.2 : 0;
        
        const noiseAirK = (Math.random() - 0.5) * 0.4;
        const noiseProcessK = (Math.random() - 0.5) * 0.3;
        const noiseRpm = (Math.random() - 0.5) * 15;
        const noiseTorque = (Math.random() - 0.5) * 1.5;
        const wearIncrement = 0.05; // tool wear increases over time in minutes

        const nextAirTemp = prev.airTemp ? parseFloat(Math.max(290, prev.airTemp + noiseAirK + trendFactor * 0.1).toFixed(2)) : 298.5;
        const nextProcessTemp = prev.processTemp ? parseFloat(Math.max(300, prev.processTemp + noiseProcessK + trendFactor * 0.15).toFixed(2)) : 308.3;
        const nextRpm = prev.rotationalSpeed ? Math.round(Math.max(1000, prev.rotationalSpeed + noiseRpm - trendFactor * 5)) : 1800;
        const nextTorque = prev.torque ? parseFloat(Math.max(10, prev.torque + noiseTorque + trendFactor * 0.2).toFixed(1)) : 38.5;
        const nextWear = prev.toolWear ? parseFloat(Math.min(250, prev.toolWear + wearIncrement).toFixed(1)) : 12.0;

        const nextPower = parseFloat(((nextTorque * nextRpm * Math.PI) / 30000).toFixed(2));
        const nextCurrent = parseFloat(((nextTorque * 0.4) + (nextRpm * 0.002)).toFixed(1));
        const nextVib = parseFloat(Math.max(0.5, (prev.vibration || 1.4) + (Math.random() - 0.5) * 0.15 + (trendFactor * 0.1)).toFixed(2));

        const updatedSensors = {
          ...prev,
          temperature: parseFloat((nextAirTemp - 273.15).toFixed(1)), // convert Kelvin to Celsius for UI
          pressure: parseFloat((nextProcessTemp - 273.15).toFixed(1)), // convert Kelvin to Celsius for UI
          vibration: nextVib,
          speed: nextRpm,
          torque: nextTorque,
          wear: nextWear,
          
          // AI4I 2020 specifics
          airTemp: nextAirTemp,
          processTemp: nextProcessTemp,
          rotationalSpeed: nextRpm,
          toolWear: nextWear,
          powerConsumption: nextPower,
          motorCurrent: nextCurrent,
          
          // Legacy properties kept for compatibility
          bpr: prev.bpr,
          htBleed: prev.htBleed,
          w31: prev.w31,
          w32: prev.w32,
        };

        const metrics = calculatePhysicalHealth(updatedSensors);

        setMachines(mPrev => {
          const mCopy = { ...mPrev };
          const fId = selectedFactory;
          const mId = selectedMachine;
          if (mCopy[fId] && mCopy[fId][mId]) {
            const currentMac = mCopy[fId][mId];
            mCopy[fId] = {
              ...mCopy[fId],
              [mId]: {
                ...currentMac,
                sensors: updatedSensors,
                healthScore: metrics.healthScore,
                predictedRUL: metrics.predictedRUL,
                failureProbability: metrics.failureProbability,
                anomalyScore: metrics.anomalyScore,
                isAnomaly: metrics.isAnomaly,
                confidenceScore: metrics.confidenceScore,
                components: currentMac.components.map((c, idx) => {
                  const healthOffset = (100 - metrics.healthScore) * (idx === 0 ? 0.9 : idx === 1 ? 0.65 : 0.45);
                  const compHealth = Math.max(5, Math.min(100, Math.round(100 - healthOffset)));
                  const status = compHealth > 85 ? 'healthy' : compHealth > 60 ? 'warning' : compHealth > 25 ? 'critical' : 'failed';
                  return {
                    ...c,
                    healthScore: compHealth,
                    status: status as any
                  };
                })
              }
            };
          }
          return mCopy;
        });

        return updatedSensors;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [isSimulating, selectedMachine, selectedFactory]);

  // Handle conversational Co-Pilot messaging
  const handleSendMessage = async (userMsg: string) => {
    if (!userMsg.trim()) return;

    // Add user message immediately
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);

    // Add temporary loading indicator message
    setChatMessages(prev => [
      ...prev,
      { sender: 'gemini', text: "Analyzing machine telemetry streams and referencing local RAG documentation..." }
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          activeTwin,
          activeComponent,
          liveSensors,
          selectedFactory
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const data = await response.json();

      // Replace the typing placeholder with the returned response
      setChatMessages(prev => {
        const copy = [...prev];
        const lastMsg = copy[copy.length - 1];
        if (lastMsg && lastMsg.sender === 'gemini') {
          copy[copy.length - 1] = { sender: 'gemini', text: data.text };
        } else {
          copy.push({ sender: 'gemini', text: data.text });
        }
        return copy;
      });
    } catch (err) {
      console.error("Co-Pilot API Error:", err);
      setChatMessages(prev => {
        const copy = [...prev];
        const errorText = "Unable to connect with the Technical Co-Pilot API service. Please verify the server state.";
        const lastMsg = copy[copy.length - 1];
        if (lastMsg && lastMsg.sender === 'gemini') {
          copy[copy.length - 1] = { sender: 'gemini', text: errorText };
        } else {
          copy.push({ sender: 'gemini', text: errorText });
        }
        return copy;
      });
    }
  };

  // SHAP local features (AI4I 2020 Dataset-aligned)
  // Dynamic, physically grounded attributions responding directly to deviances.
  const getShapFeatures = (): ShapExplainer[] => {
    const x = sensorsToFeatureArray(liveSensors);
    
    // Base/nominal sensor values
    const xBase = [1500, 40.0, 10, 25.0, 1.2];
    
    // Execute real-time mathematical KernelSHAP attribution on our XGBoost Regressor
    const shapResults = calculateExactShap(runXGBoost, x, xBase);
    
    return shapResults;
  };

  const handleUpdateSensors = (sensors: SensorData) => {
    const metrics = calculatePhysicalHealth(sensors);
    setLiveSensors(sensors);
    setMachines(prev => {
      const updated = { ...prev };
      const fId = selectedFactory;
      const mId = selectedMachine;
      
      if (updated[fId] && updated[fId][mId]) {
        const currentMachine = updated[fId][mId];
        updated[fId] = {
          ...updated[fId],
          [mId]: {
            ...currentMachine,
            sensors: {
              ...currentMachine.sensors,
              ...sensors,
            },
            healthScore: metrics.healthScore,
            predictedRUL: metrics.predictedRUL,
            failureProbability: metrics.failureProbability,
            anomalyScore: metrics.anomalyScore,
            isAnomaly: metrics.isAnomaly,
            confidenceScore: metrics.confidenceScore,
            components: currentMachine.components.map((c, idx) => {
              const healthOffset = (100 - metrics.healthScore) * (idx === 0 ? 0.9 : idx === 1 ? 0.65 : 0.45);
              const compHealth = Math.max(5, Math.min(100, Math.round(100 - healthOffset)));
              const status = compHealth > 85 ? 'healthy' : compHealth > 60 ? 'warning' : compHealth > 25 ? 'critical' : 'failed';
              return {
                ...c,
                healthScore: compHealth,
                status: status as any
              };
            })
          }
        };
      }
      return updated;
    });
  };

  const handleTriggerSync = () => {
    setFlRound(prev => Math.min(24, prev + 1));
  };

  const handleInjectCustomRow = (injected: {
    sensors: SensorData;
    healthScore: number;
    predictedRUL: number;
    failureProbability: number;
    machineName: string;
    machineType: 'Turbofan Engine (C-MAPSS)' | 'CNC Milling' | 'Gas Turbine' | 'Hydraulic Pump' | 'Air Compressor';
  }) => {
    setMachines(prev => {
      const updated = { ...prev };
      const fId = selectedFactory;
      const mId = selectedMachine;
      
      if (updated[fId] && updated[fId][mId]) {
        const currentMachine = updated[fId][mId];
        updated[fId] = {
          ...updated[fId],
          [mId]: {
            ...currentMachine,
            metadata: {
              ...currentMachine.metadata,
              name: injected.machineName,
              type: injected.machineType,
            },
            sensors: {
              ...currentMachine.sensors,
              ...injected.sensors,
            },
            healthScore: injected.healthScore,
            predictedRUL: injected.predictedRUL,
            failureProbability: injected.failureProbability,
            components: currentMachine.components.map((c, idx) => {
              const healthOffset = (100 - injected.healthScore) * (idx === 0 ? 0.9 : idx === 1 ? 0.65 : 0.45);
              const compHealth = Math.max(5, Math.min(100, Math.round(100 - healthOffset)));
              const status = compHealth > 85 ? 'healthy' : compHealth > 60 ? 'warning' : compHealth > 25 ? 'critical' : 'failed';
              return {
                ...c,
                healthScore: compHealth,
                status: status as any
              };
            })
          }
        };
      }
      return updated;
    });

    setLiveSensors(injected.sensors);
    setIsSimulating(false); // Disable simulation so noise does not overwrite the injected dataset state
  };

  const activeAlarmsCount = Object.values(machines).flatMap(f => Object.values(f)).filter(m => m.healthScore < 60).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-400 font-sans flex flex-col antialiased">
      {/* Top Navbar - Transparent & Premium */}
      <header className="bg-transparent border-b border-slate-800 px-8 py-4 flex items-center justify-between relative z-20">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-white text-black rounded-lg flex items-center justify-center shadow-md">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-widest text-white font-mono flex items-center space-x-2 uppercase">
              <span>FACTORY MAP</span>
            </h1>
            <p className="text-[9px] text-slate-400 font-mono tracking-widest uppercase">Federated Digital Twin Suite</p>
          </div>
        </div>

        {/* Global Search, Notifications, Profile, and Theme Lock */}
        <div className="flex items-center space-x-4">
          {/* Minimal Search Bar */}
          <div className="relative hidden md:block max-w-md w-60">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-slate-400/60" />
            </span>
            <input 
              type="text" 
              placeholder="Search telemetry, nodes, logs..." 
              className="w-full bg-slate-900 text-white placeholder-slate-400/40 text-xs rounded-lg pl-9 pr-3 py-1.5 border border-slate-800 focus:outline-none focus:border-slate-600 transition-all font-mono"
            />
          </div>

          {/* Locked Matte Dark Theme Switcher */}
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[9px] font-mono text-slate-400 cursor-default select-none">
            <Moon className="w-3 h-3 text-white" />
            <span className="font-bold tracking-wider text-[9px]">MATTE DARK LOCKED</span>
          </div>

          {/* Notification Button */}
          <button 
            onClick={() => handleNavigate('dashboard')}
            className="relative p-1.5 text-slate-400 hover:text-white transition-colors bg-slate-900 border border-slate-800 rounded-lg"
            title={`${activeAlarmsCount} Active Alerts`}
          >
            <Bell className="w-3.5 h-3.5" />
            {activeAlarmsCount > 0 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#EF4444] rounded-full animate-pulse" />
            )}
          </button>

          {/* Role-Based Access Control Dropdown */}
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
            <span className="text-[8px] font-mono text-slate-400 uppercase">ROLE:</span>
            <select
              value={userRole}
              onChange={(e) => {
                const role = e.target.value as any;
                setUserRole(role);
              }}
              className="bg-transparent text-[10px] text-white font-mono font-bold focus:outline-none border-none pr-1.5 cursor-pointer uppercase"
            >
              <option value="Admin" className="bg-slate-900 text-white uppercase">Admin</option>
              <option value="Plant Manager" className="bg-slate-900 text-white uppercase">Plant Manager</option>
              <option value="Maintenance Engineer" className="bg-slate-900 text-white uppercase">Maint Engineer</option>
              <option value="Operator" className="bg-slate-900 text-white uppercase">Operator</option>
            </select>
          </div>

          {/* Profile Card */}
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg">
            <div className="w-5 h-5 rounded-full bg-cyan-500 text-black font-extrabold text-[9px] flex items-center justify-center">
              SU
            </div>
            <span className="text-[10px] text-white font-mono hidden lg:inline-block">shubhamutekar09q</span>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <div className="flex-1 max-w-[1700px] w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* Fixed Left Sidebar Panel */}
        <aside className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between h-fit space-y-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-[10px] font-bold text-white uppercase tracking-widest font-mono">ENTERPRISE CONSOLE</h2>
              <p className="text-[10px] text-slate-400/70 mt-1">Select workspace sector to coordinate client edge nodes.</p>
            </div>

            {/* Sidebar Navigation Items */}
            <nav className="flex flex-col space-y-1.5">
              <button
                onClick={() => {
                  setActiveSection('dashboard');
                  setActiveTab('dashboard');
                }}
                className={`w-full flex items-center space-x-3 p-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeSection === 'dashboard'
                    ? 'bg-slate-800 text-white font-semibold border-l-2 border-blue-500 rounded-l-none'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => {
                  setActiveSection('projects');
                  setActiveTab(activeProjectTab);
                }}
                className={`w-full flex items-center space-x-3 p-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeSection === 'projects'
                    ? 'bg-slate-800 text-white font-semibold border-l-2 border-blue-500 rounded-l-none'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Projects</span>
              </button>

              <button
                onClick={() => {
                  setActiveSection('aichat');
                  setActiveTab(activeAIChatTab);
                }}
                className={`w-full flex items-center space-x-3 p-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeSection === 'aichat'
                    ? 'bg-slate-800 text-white font-semibold border-l-2 border-blue-500 rounded-l-none'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
                }`}
              >
                <Bot className="w-4 h-4" />
                <span>AI Chat</span>
              </button>

              <button
                onClick={() => {
                  setActiveSection('analytics');
                  setActiveTab(activeAnalyticsTab);
                }}
                className={`w-full flex items-center space-x-3 p-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeSection === 'analytics'
                    ? 'bg-slate-800 text-white font-semibold border-l-2 border-blue-500 rounded-l-none'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Analytics</span>
              </button>

              <button
                onClick={() => {
                  setActiveSection('files');
                  setActiveTab(activeFilesTab);
                }}
                className={`w-full flex items-center space-x-3 p-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeSection === 'files'
                    ? 'bg-slate-800 text-white font-semibold border-l-2 border-blue-500 rounded-l-none'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Files</span>
              </button>

              <button
                onClick={() => {
                  setActiveSection('settings');
                }}
                className={`w-full flex items-center space-x-3 p-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeSection === 'settings'
                    ? 'bg-slate-800 text-white font-semibold border-l-2 border-blue-500 rounded-l-none'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>

              <button
                onClick={() => {
                  setActiveSection('account');
                }}
                className={`w-full flex items-center space-x-3 p-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeSection === 'account'
                    ? 'bg-slate-800 text-white font-semibold border-l-2 border-blue-500 rounded-l-none'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Account</span>
              </button>
            </nav>
          </div>

          {/* Quick Realtime Active State Summary */}
          <div className="bg-slate-800 border border-slate-800 rounded-xl p-4 text-xs font-mono space-y-2.5">
            <div className="flex items-center space-x-1.5 text-white font-bold text-[10px] tracking-wider uppercase">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Edge Telemetry System</span>
            </div>
            <p className="text-slate-400/60 text-[10px] leading-relaxed">
              Provides constant localized predictive parameters to safety coordinators.
            </p>
            <div className="flex items-center justify-between border-t border-slate-800 pt-2.5 text-[10px]">
              <span className="text-slate-400/60">Streaming:</span>
              <button 
                onClick={() => setIsSimulating(!isSimulating)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all border ${
                  isSimulating 
                    ? 'bg-white text-black border-white' 
                    : 'bg-transparent text-slate-400 border-slate-700 hover:border-white/30'
                }`}
              >
                {isSimulating ? 'ACTIVE' : 'PAUSED'}
              </button>
            </div>
          </div>
        </aside>

        {/* Primary Workspace Panel */}
        <main className="lg:col-span-9 flex flex-col space-y-6">
          <AnimatePresence mode="wait">
            
            {/* SECTION 1: DASHBOARD */}
            {activeSection === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <DashboardTab 
                  factories={factories}
                  machines={machines}
                  onSelectFactory={setSelectedFactory}
                  onSelectMachine={(f, m) => {
                    setSelectedFactory(f);
                    setSelectedMachine(m);
                  }}
                  onNavigate={handleNavigate}
                  activeAlarmsCount={activeAlarmsCount}
                />
              </motion.div>
            )}

            {/* SECTION 2: PROJECTS (Twin & Blueprint) */}
            {activeSection === 'projects' && (
              <motion.div
                key="projects"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-6"
              >
                {/* Horizontal Tab Selector */}
                <div className="flex bg-slate-900 p-1 border border-slate-800 rounded-xl max-w-md">
                  <button
                    onClick={() => {
                      setActiveProjectTab('twin');
                      setActiveTab('twin');
                    }}
                    className={`flex-1 text-center py-2 rounded-lg text-xs font-medium transition-all ${
                      activeProjectTab === 'twin'
                        ? 'bg-slate-800 text-white border border-slate-800 font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Digital Twin Wireframe
                  </button>
                  <button
                    onClick={() => {
                      setActiveProjectTab('blueprint');
                      setActiveTab('blueprint');
                    }}
                    className={`flex-1 text-center py-2 rounded-lg text-xs font-medium transition-all ${
                      activeProjectTab === 'blueprint'
                        ? 'bg-slate-800 text-white border border-slate-800 font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    System Architecture
                  </button>
                </div>

                {activeProjectTab === 'twin' ? (
                  <DigitalTwinTab 
                    factories={factories}
                    machines={machines}
                    selectedFactory={selectedFactory}
                    selectedMachine={selectedMachine}
                    selectedComponent={selectedComponent}
                    isSimulating={isSimulating}
                    liveSensors={liveSensors}
                    onSelectFactory={setSelectedFactory}
                    onSelectMachine={setSelectedMachine}
                    onSelectComponent={setSelectedComponent}
                    onToggleSimulation={() => setIsSimulating(!isSimulating)}
                    onUpdateSensors={handleUpdateSensors}
                  />
                ) : (
                  <div className="space-y-6">
                    <div className="premium-card border border-slate-800 rounded-xl p-6 shadow-sm">
                      <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-3">
                        <div>
                          <h3 className="text-lg font-bold text-white font-sans">System Architecture Blueprint</h3>
                          <p className="text-xs text-slate-400">Decentralized edge nodes synchronizing parameters collaboratively via secure FedAvg aggregation.</p>
                        </div>
                        <span className="bg-slate-900 border border-slate-800 text-white font-mono text-xs px-2.5 py-1 rounded-lg">Fig 1. Sync Scheme</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative p-4 bg-slate-900 border border-slate-800 rounded-xl">
                        {/* Factory A Node */}
                        <div className="bg-slate-800 p-4 border border-slate-800 rounded-xl flex flex-col space-y-2 relative shadow-xs">
                          <div className="flex items-center space-x-1.5 text-white font-bold font-mono text-xs border-b pb-1.5 border-slate-800">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Factory A (Munich)</span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 space-y-1">
                            <p>• 120 CNC Stations</p>
                            <p>• Local TCN Gradients</p>
                            <p className="text-emerald-400 font-bold">Local Acc: 94.2%</p>
                          </div>
                        </div>

                        {/* Factory B Node */}
                        <div className="bg-slate-800 p-4 border border-slate-800 rounded-xl flex flex-col space-y-2 relative shadow-xs">
                          <div className="flex items-center space-x-1.5 text-white font-bold font-mono text-xs border-b pb-1.5 border-slate-800">
                            <MapPin className="w-3.5 h-3.5 text-amber-400" />
                            <span>Factory B (Detroit)</span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 space-y-1">
                            <p>• 145 Hydraulic Presses</p>
                            <p>• Local TCN Gradients</p>
                            <p className="text-amber-400 font-bold">Local Acc: 91.0%</p>
                          </div>
                        </div>

                        {/* Central HQ Server Node */}
                        <div className="bg-slate-700 p-4 border border-slate-700 rounded-xl flex flex-col space-y-2 text-white relative shadow-md md:scale-105 z-10">
                          <div className="flex items-center space-x-1.5 text-white font-bold font-mono text-xs border-b pb-1.5 border-slate-700">
                            <Server className="w-3.5 h-3.5 text-white animate-spin" style={{ animationDuration: '8s' }} />
                            <span>HQ Federated Co-Pilot</span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 space-y-1">
                            <p className="text-white font-bold">FedAvg Optimization</p>
                            <p>• Differential Privacy</p>
                            <p className="text-emerald-400 font-bold">Sync: Round 12 (Converged)</p>
                          </div>
                        </div>

                        {/* Factory C Node */}
                        <div className="bg-slate-800 p-4 border border-slate-800 rounded-xl flex flex-col space-y-2 relative shadow-xs">
                          <div className="flex items-center space-x-1.5 text-white font-bold font-mono text-xs border-b pb-1.5 border-slate-800">
                            <MapPin className="w-3.5 h-3.5 text-white" />
                            <span>Factory C (Tokyo)</span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 space-y-1">
                            <p>• 110 Robotic Arms</p>
                            <p>• Local TCN Gradients</p>
                            <p className="text-white font-bold">Local Acc: 93.1%</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Technical Layers breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="premium-card border border-slate-800 rounded-xl p-5 shadow-sm">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider font-sans border-b border-slate-800 pb-3 mb-3 flex items-center space-x-2">
                          <Terminal className="w-4 h-4 text-white" />
                          <span>Data Ingestion & Training Pipeline</span>
                        </h4>
                        <div className="space-y-3 text-xs font-mono leading-relaxed text-slate-400">
                          <p>
                            <strong className="text-white">1. Edge Sensor Ingest Layer:</strong><br />
                            Streams high-frequency machinery readings (Bearing Temperature, Radial Vibration, Hydraulic Pressure, Fluid Flow Rate) from active manufacturing work cells at 100Hz intervals.
                          </p>
                          <p>
                            <strong className="text-white">2. Localized RUL Training Kernel:</strong><br />
                            Neural TCN models estimate remaining useful hours securely within isolated edge databases, avoiding commercial IP exposures.
                          </p>
                        </div>
                      </div>

                      <div className="premium-card border border-slate-800 rounded-xl p-5 shadow-sm">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider font-sans border-b border-slate-800 pb-3 mb-3 flex items-center space-x-2">
                          <Shield className="w-4 h-4 text-white" />
                          <span>Double-Loop Explainability & Twins</span>
                        </h4>
                        <div className="space-y-3 text-xs font-mono leading-relaxed text-slate-400">
                          <p>
                            <strong className="text-white">1. Local SHAP Attribution:</strong><br />
                            Calculates localized mathematical game-theory values. Explains exactly why a spindle tool is estimated to degrade within 20 operational hours based on mechanical anomalies.
                          </p>
                          <p>
                            <strong className="text-white">2. Semantic RAG Co-Pilot:</strong><br />
                            Bridges numeric model coefficients with unstructured machinery ISO guidelines and manuals using Gemini's RAG reasoning to build printable maintenance checklists.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* SECTION 3: AI CHAT (RAG Maintenance & Multi-Agent) */}
            {activeSection === 'aichat' && (
              <motion.div
                key="aichat"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-6"
              >
                {/* Horizontal Tab Selector */}
                <div className="flex bg-slate-900 p-1 border border-slate-800 rounded-xl max-w-md">
                  <button
                    onClick={() => {
                      setActiveAIChatTab('maintenance');
                      setActiveTab('maintenance');
                    }}
                    className={`flex-1 text-center py-2 rounded-lg text-xs font-medium transition-all ${
                      activeAIChatTab === 'maintenance'
                        ? 'bg-slate-800 text-white border border-slate-800 font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    AI Technical Co-Pilot
                  </button>
                  <button
                    onClick={() => {
                      setActiveAIChatTab('multiagent');
                      setActiveTab('multiagent');
                    }}
                    className={`flex-1 text-center py-2 rounded-lg text-xs font-medium transition-all ${
                      activeAIChatTab === 'multiagent'
                        ? 'bg-slate-800 text-white border border-slate-800 font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Multi-Agent AI
                  </button>
                </div>

                {activeAIChatTab === 'maintenance' ? (
                  <MaintenanceTab 
                    factories={factories}
                    machines={machines}
                    chatMessages={chatMessages}
                    onSendMessage={handleSendMessage}
                  />
                ) : (
                  <MultiAgentTab />
                )}
              </motion.div>
            )}

            {/* SECTION 4: ANALYTICS (Pipelines, SHAP, Federated, Vision) */}
            {activeSection === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-6"
              >
                {/* Horizontal Tab Selector */}
                <div className="flex bg-slate-900 p-1 border border-slate-800 rounded-xl max-w-3xl flex-wrap">
                  <button
                    onClick={() => {
                      setActiveAnalyticsTab('predictions');
                      setActiveTab('predictions');
                    }}
                    className={`flex-1 text-center py-2 rounded-lg text-xs font-medium transition-all ${
                      activeAnalyticsTab === 'predictions'
                        ? 'bg-slate-800 text-white border border-slate-800 font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ML Pipelines & RUL
                  </button>
                  <button
                    onClick={() => {
                      setActiveAnalyticsTab('explainable');
                      setActiveTab('explainable');
                    }}
                    className={`flex-1 text-center py-2 rounded-lg text-xs font-medium transition-all ${
                      activeAnalyticsTab === 'explainable'
                        ? 'bg-slate-800 text-white border border-slate-800 font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Explainable AI (SHAP)
                  </button>
                  <button
                    onClick={() => {
                      setActiveAnalyticsTab('federated');
                      setActiveTab('federated');
                    }}
                    className={`flex-1 text-center py-2 rounded-lg text-xs font-medium transition-all ${
                      activeAnalyticsTab === 'federated'
                        ? 'bg-slate-800 text-white border border-slate-800 font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Federated Core
                  </button>
                  <button
                    onClick={() => {
                      setActiveAnalyticsTab('vision');
                      setActiveTab('vision');
                    }}
                    className={`flex-1 text-center py-2 rounded-lg text-xs font-medium transition-all ${
                      activeAnalyticsTab === 'vision'
                        ? 'bg-slate-800 text-white border border-slate-800 font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Computer Vision
                  </button>
                  <button
                    onClick={() => {
                      setActiveAnalyticsTab('aioutput');
                      setActiveTab('aioutput');
                    }}
                    className={`flex-1 text-center py-2 rounded-lg text-xs font-medium transition-all ${
                      activeAnalyticsTab === 'aioutput'
                        ? 'bg-slate-800 text-white border border-slate-800 font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    AI Outputs
                  </button>
                </div>

                {activeAnalyticsTab === 'predictions' && (
                  <PredictionsTab />
                )}

                {activeAnalyticsTab === 'explainable' && (
                  <ExplainableAITab 
                    activeTwin={activeTwin}
                    getShapFeatures={getShapFeatures}
                  />
                )}

                {activeAnalyticsTab === 'federated' && (
                  <FederatedLearningTab 
                    flRound={flRound}
                    flHistory={flHistory}
                    onTriggerSync={handleTriggerSync}
                  />
                )}

                {activeAnalyticsTab === 'vision' && (
                  <ComputerVisionTab />
                )}

                {activeAnalyticsTab === 'aioutput' && (
                  <AIOutputDashboard
                    activeTwin={activeTwin}
                    liveSensors={liveSensors}
                    getShapFeatures={getShapFeatures}
                    selectedFactory={selectedFactory}
                  />
                )}
              </motion.div>
            )}

            {/* SECTION 5: FILES (Dataset Uplink & Paper) */}
            {activeSection === 'files' && (
              <motion.div
                key="files"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-6"
              >
                <DatasetUplinkTab 
                  activeTwin={activeTwin}
                  onInjectRow={handleInjectCustomRow}
                />
              </motion.div>
            )}

            {/* SECTION 6: SETTINGS */}
            {activeSection === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-6"
              >
                <div className="premium-card p-6 border border-slate-800 rounded-2xl bg-slate-800">
                  <div className="border-b border-slate-800 pb-4 mb-6">
                    <h3 className="text-base font-bold text-white">System Settings</h3>
                    <p className="text-xs text-slate-400">Configure the real-time edge telemetry and deep learning parameters.</p>
                  </div>

                  <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                    {/* RBAC Status Warning Alert Banner */}
                    {userRole === 'Operator' && (
                      <div className="p-4 bg-yellow-950/20 border border-yellow-900/30 rounded-xl text-xs text-yellow-200 font-mono flex items-center space-x-2.5 animate-pulse">
                        <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
                        <span>OPERATOR LEVEL READ-ONLY: System parameter overrides are locked. Set role to ADMIN or ENGINEER above to edit.</span>
                      </div>
                    )}

                    {/* Live Telemetry Toggler */}
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div className="space-y-1 pr-4">
                        <span className="text-xs font-semibold text-white block">Continuous Live Telemetry Stream</span>
                        <p className="text-[11px] text-slate-400/70 leading-relaxed">
                          Enables mathematical simulation noise to continually update local sensory nodes.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={userRole === 'Operator'}
                        onClick={() => setIsSimulating(!isSimulating)}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all border ${
                          userRole === 'Operator'
                            ? 'bg-transparent text-slate-600 border-slate-800 cursor-not-allowed'
                            : isSimulating 
                            ? 'bg-white text-black border-white' 
                            : 'bg-transparent text-slate-400 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        {isSimulating ? 'ACTIVE STREAM' : 'STREAM SUSPENDED'}
                      </button>
                    </div>

                    {/* Minimal Numerical Form Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-white block">Simulation Tick Interval (ms)</label>
                        <input 
                          type="number" 
                          min={500} 
                          max={10000} 
                          defaultValue={2000}
                          disabled={userRole === 'Operator'}
                          className="w-full bg-slate-900 text-white placeholder-slate-400/40 text-xs rounded-lg px-3 py-2.5 border border-slate-800 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-slate-600 font-mono disabled:opacity-40 disabled:cursor-not-allowed"
                          placeholder="e.g. 2000"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-white block">Differential Privacy Budget (Epsilon)</label>
                        <input 
                          type="number" 
                          step={0.1} 
                          min={0.1} 
                          max={10.0} 
                          defaultValue={2.8}
                          disabled={userRole === 'Operator'}
                          className="w-full bg-slate-900 text-white placeholder-slate-400/40 text-xs rounded-lg px-3 py-2.5 border border-slate-800 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-slate-600 font-mono disabled:opacity-40 disabled:cursor-not-allowed"
                          placeholder="e.g. 2.8"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-white block">HQ Federated Convergence Target (%)</label>
                        <input 
                          type="number" 
                          defaultValue={95}
                          disabled={userRole === 'Operator'}
                          className="w-full bg-slate-900 text-white placeholder-slate-400/40 text-xs rounded-lg px-3 py-2.5 border border-slate-800 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-slate-600 font-mono disabled:opacity-40 disabled:cursor-not-allowed"
                          placeholder="e.g. 95"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-white block">Target Loss Function Target</label>
                        <select 
                          disabled={userRole === 'Operator'}
                          className="w-full bg-slate-900 text-white text-xs rounded-lg px-3 py-2.5 border border-slate-800 focus:outline-none focus:border-slate-600 font-mono disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <option value="mse">Mean Squared Error (MSE)</option>
                          <option value="mae">Mean Absolute Error (MAE)</option>
                          <option value="huber">Huber Loss Penalty</option>
                        </select>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="border-t border-slate-800 pt-6 flex justify-end space-x-3">
                      {/* Secondary button */}
                      <button
                        type="button"
                        disabled={userRole === 'Operator'}
                        onClick={() => setIsSimulating(true)}
                        className="px-4 py-2 bg-transparent text-slate-400 border border-slate-800 rounded-lg text-xs font-medium hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Restore Defaults
                      </button>
                      {/* Primary button */}
                      <button
                        type="button"
                        disabled={userRole === 'Operator'}
                        onClick={() => alert("Settings saved successfully!")}
                        className="px-4 py-2 bg-white text-black rounded-lg text-xs font-semibold hover:bg-neutral-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Apply System Changes
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {/* SECTION 7: ACCOUNT */}
            {activeSection === 'account' && (
              <motion.div
                key="account"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-6"
              >
                {/* Profile Card */}
                <div className="premium-card p-6 border border-slate-800 rounded-2xl bg-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 rounded-full bg-white text-black font-extrabold text-lg flex items-center justify-center">
                      SU
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Shubham Utekar</h3>
                      <p className="text-xs text-slate-400">Enterprise Fleet Co-ordinator</p>
                      <span className="text-[10px] font-mono bg-slate-900 text-emerald-400 px-2 py-0.5 rounded border border-slate-800 mt-1.5 inline-block">
                        LEVEL 5 ENTERPRISE CLEARANCE
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-right text-xs font-mono space-y-1">
                    <p className="text-slate-400/60">Client Node: <span className="text-white font-bold">Munich-Detroit Core</span></p>
                    <p className="text-slate-400/60">User Email: <span className="text-white">shubhamutekar09q@gmail.com</span></p>
                    <p className="text-slate-400/60">Status: <span className="text-emerald-400 font-bold">● ONLINE</span></p>
                  </div>
                </div>

                {/* License Information Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="premium-card p-6 border border-slate-800 rounded-2xl bg-slate-800 space-y-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-slate-800 pb-2">Active License & Node Key</h4>
                    
                    <div className="space-y-3 font-mono text-xs">
                      <div>
                        <span className="text-slate-400/50 block">SECURE ENDPOINT ID</span>
                        <span className="text-white text-xs select-all">4c3a9667-5c84-47fb-b15f-e86e36279731</span>
                      </div>
                      <div>
                        <span className="text-slate-400/50 block">API KEY SECRET ACCESS</span>
                        <span className="text-white text-xs">••••••••••••••••••••••••••••••••</span>
                      </div>
                      <div>
                        <span className="text-slate-400/50 block">LICENSE SYSTEM KEY</span>
                        <span className="text-white">FS-ENTERPRISE-7458-3918-7314</span>
                      </div>
                    </div>
                  </div>

                  <div className="premium-card p-6 border border-slate-800 rounded-2xl bg-slate-800 space-y-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-slate-800 pb-2">System Quotas & Limits</h4>
                    
                    <div className="space-y-3 font-mono text-xs text-slate-400">
                      <div className="flex justify-between">
                        <span>RAG Technical Ingest limits:</span>
                        <span className="text-white font-bold">UNLIMITED / MONTH</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Federated Weight Aggregations:</span>
                        <span className="text-white font-bold">2,500 / DAY</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Simulated Edge Nodes limit:</span>
                        <span className="text-white font-bold">50 Concurrent Clients</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Differential Privacy Queries:</span>
                        <span className="text-emerald-400 font-bold">ACTIVE (Unlimited)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>

      </div>
    </div>
  );
}
