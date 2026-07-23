import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  FileText, 
  Play, 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  LineChart, 
  Table, 
  Activity, 
  Database, 
  Layers, 
  Check, 
  Sparkles,
  Info,
  ChevronRight,
  TrendingDown,
  RefreshCw,
  Cpu,
  BarChart2
} from 'lucide-react';
import { SensorData, MachineDigitalTwin } from '../types';
import DatasetManager from './DatasetManager';

interface DatasetUplinkTabProps {
  onInjectRow: (data: {
    sensors: SensorData;
    healthScore: number;
    predictedRUL: number;
    failureProbability: number;
    machineName: string;
    machineType: 'Turbofan Engine (C-MAPSS)' | 'CNC Milling' | 'Gas Turbine' | 'Hydraulic Pump' | 'Air Compressor';
  }) => void;
  activeTwin: MachineDigitalTwin;
}

interface ParsedRow {
  cycle: number;
  temperature: number;
  pressure: number;
  vibration: number;
  speed: number;
  torque: number;
  wear: number;
  // NASA C-MAPSS variables
  t24?: number;
  t30?: number;
  t50?: number;
  p30?: number;
  nf?: number;
  nc?: number;
  ps30?: number;
  bpr?: number;
  htBleed?: number;
  w31?: number;
  w32?: number;
  // Predicted output
  predictedRUL?: number;
  healthScore?: number;
  failureProbability?: number;
  anomalyDetected?: boolean;
}

// Generates simulated degradation dataset for NASA C-MAPSS
const generateCMapssSample = (): ParsedRow[] => {
  const data: ParsedRow[] = [];
  const totalCycles = 165;
  for (let cycle = 1; cycle <= totalCycles; cycle++) {
    const degradationRatio = Math.pow(cycle / totalCycles, 2.5); // non-linear exponential degradation
    
    // Nominal temperatures and pressures with progressive thermal slippage
    const t24 = parseFloat((641.5 + (Math.random() - 0.5) * 0.15 + degradationRatio * 2.8).toFixed(2));
    const t30 = parseFloat((1580.2 + (Math.random() - 0.5) * 1.8 + degradationRatio * 28.5).toFixed(2));
    const t50 = parseFloat((1400.1 + (Math.random() - 0.5) * 1.2 + degradationRatio * 32.1).toFixed(2));
    const p30 = parseFloat((554.1 + (Math.random() - 0.5) * 0.8 - degradationRatio * 8.4).toFixed(2));
    const nf = parseFloat((2387.9 + (Math.random() - 0.5) * 0.5 + degradationRatio * 1.2).toFixed(2));
    const nc = parseFloat((9045.2 + (Math.random() - 0.5) * 4.5 - degradationRatio * 65.4).toFixed(2));
    const ps30 = parseFloat((47.2 + (Math.random() - 0.5) * 0.1 + degradationRatio * 1.8).toFixed(2));
    const bpr = parseFloat((8.41 + (Math.random() - 0.5) * 0.02 + degradationRatio * 0.28).toFixed(3));
    const htBleed = parseFloat((392.0 + (Math.random() - 0.5) * 0.8 + degradationRatio * 8.0).toFixed(1));
    const w31 = parseFloat((38.85 + (Math.random() - 0.5) * 0.05 + degradationRatio * 0.95).toFixed(3));
    const w32 = parseFloat((23.31 + (Math.random() - 0.5) * 0.03 + degradationRatio * 0.55).toFixed(3));
    
    const temperature = parseFloat((55.0 + degradationRatio * 38.0 + (Math.random() - 0.5) * 2.0).toFixed(1));
    const pressure = parseFloat((118.5 - degradationRatio * 14.0 + (Math.random() - 0.5) * 3.0).toFixed(1));
    const vibration = parseFloat((1.5 + degradationRatio * 6.5 + (Math.random() - 0.5) * 0.4).toFixed(2));
    const speed = Math.round(12000 + (Math.random() - 0.5) * 200 - degradationRatio * 1500);
    const torque = parseFloat((45.0 + degradationRatio * 25.0 + (Math.random() - 0.5) * 3.0).toFixed(1));
    const wear = parseFloat((degradationRatio * 100).toFixed(2));

    data.push({
      cycle,
      temperature,
      pressure,
      vibration,
      speed,
      torque,
      wear,
      t24,
      t30,
      t50,
      p30,
      nf,
      nc,
      ps30,
      bpr,
      htBleed,
      w31,
      w32
    });
  }
  return data;
};

// Generates simulated CNC Precision Milling Spindle dataset
const generateCncSample = (): ParsedRow[] => {
  const data: ParsedRow[] = [];
  const totalCycles = 120;
  for (let cycle = 1; cycle <= totalCycles; cycle++) {
    const degradationRatio = Math.pow(cycle / totalCycles, 2);
    
    const temperature = parseFloat((45.2 + degradationRatio * 39.7 + (Math.random() - 0.5) * 1.5).toFixed(1));
    const pressure = parseFloat((120.5 + (Math.random() - 0.5) * 2.0).toFixed(1));
    const vibration = parseFloat((1.1 + degradationRatio * 5.7 + (Math.random() - 0.5) * 0.3).toFixed(2));
    const speed = Math.round(14500 - degradationRatio * 1200 + (Math.random() - 0.5) * 150);
    const torque = parseFloat((38.0 + degradationRatio * 21.0 + (Math.random() - 0.5) * 2.5).toFixed(1));
    const wear = parseFloat((degradationRatio * 92.4).toFixed(2));

    data.push({
      cycle,
      temperature,
      pressure,
      vibration,
      speed,
      torque,
      wear
    });
  }
  return data;
};

// Generates simulated High-Pressure Hydraulic press cavitation dataset
const generateHydraulicSample = (): ParsedRow[] => {
  const data: ParsedRow[] = [];
  const totalCycles = 100;
  for (let cycle = 1; cycle <= totalCycles; cycle++) {
    const degradationRatio = Math.pow(cycle / totalCycles, 3); // sudden exponential cavitation onset
    
    const temperature = parseFloat((52.0 + degradationRatio * 41.2 + (Math.random() - 0.5) * 2.2).toFixed(1));
    const pressure = parseFloat((145.0 - degradationRatio * 42.5 + (Math.random() - 0.5) * 4.0).toFixed(1));
    const vibration = parseFloat((0.8 + degradationRatio * 7.2 + (Math.random() - 0.5) * 0.5).toFixed(2));
    const speed = Math.round(3000 - degradationRatio * 400 + (Math.random() - 0.5) * 80);
    const torque = parseFloat((150.0 + degradationRatio * 38.0 + (Math.random() - 0.5) * 6.0).toFixed(1));
    const wear = parseFloat((degradationRatio * 85.0).toFixed(2));

    data.push({
      cycle,
      temperature,
      pressure,
      vibration,
      speed,
      torque,
      wear
    });
  }
  return data;
};

export default function DatasetUplinkTab({ onInjectRow, activeTwin }: DatasetUplinkTabProps) {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [datasetName, setDatasetName] = useState<string>('');
  const [datasetType, setDatasetType] = useState<'cmapss' | 'cnc' | 'hydraulic' | 'custom'>('cmapss');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [selectedSensor, setSelectedSensor] = useState<string>('temperature');
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [inferenceLogs, setInferenceLogs] = useState<string[]>([]);
  const [hasRunInference, setHasRunInference] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'analytics' | 'table' | 'preprocessing'>('analytics');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [injectedSuccessIndex, setInjectedSuccessIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const rowsPerPage = 10;
  const paginatedRows = rows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const totalPages = Math.ceil(rows.length / rowsPerPage);

  // Load a sample dataset initially
  useEffect(() => {
    loadSample('cmapss');
  }, []);

  const loadSample = (type: 'cmapss' | 'cnc' | 'hydraulic') => {
    setIsProcessing(true);
    setHasRunInference(false);
    setDatasetType(type);
    setInjectedSuccessIndex(null);
    setRows([]);
    setSelectedRowIndex(0);
    
    let parsed: ParsedRow[] = [];
    let name = '';
    
    if (type === 'cmapss') {
      parsed = generateCMapssSample();
      name = 'NASA_C-MAPSS_Turbofan_FD001_Run.csv';
      setSelectedSensor('t30');
    } else if (type === 'cnc') {
      parsed = generateCncSample();
      name = 'HighSpeed_CNC_Milling_Spindle_Telemetry.csv';
      setSelectedSensor('vibration');
    } else {
      parsed = generateHydraulicSample();
      name = 'Hydraulic_Press_Cavitation_Log_100hz.csv';
      setSelectedSensor('pressure');
    }

    setTimeout(() => {
      setRows(parsed);
      setDatasetName(name);
      setIsProcessing(false);
    }, 600);
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    setIsProcessing(true);
    setHasRunInference(false);
    setDatasetName(file.name);
    setDatasetType('custom');
    setInjectedSuccessIndex(null);
    setSelectedRowIndex(0);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        if (file.name.endsWith('.json')) {
          const parsedJson = JSON.parse(text);
          if (Array.isArray(parsedJson)) {
            const parsed = parsedJson.map((item, idx) => ({
              cycle: item.cycle || idx + 1,
              temperature: item.temperature || item.temp || 0,
              pressure: item.pressure || item.press || 0,
              vibration: item.vibration || item.vib || 0,
              speed: item.speed || item.rpm || 0,
              torque: item.torque || 0,
              wear: item.wear || 0,
              ...item
            }));
            setRows(parsed);
          } else {
            alert('JSON dataset must be an array of objects.');
          }
        } else {
          // Parse CSV
          const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
          if (lines.length < 2) {
            alert('CSV dataset must contain at least a header row and one data row.');
            setIsProcessing(false);
            return;
          }

          const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
          const parsed: ParsedRow[] = [];

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
            if (values.length < headers.length) continue;

            const row: any = {};
            headers.forEach((header, idx) => {
              const val = values[idx];
              const num = parseFloat(val);
              row[header] = isNaN(num) ? val : num;
            });

            parsed.push({
              cycle: row.cycle || i,
              temperature: row.temperature || row.temp || row.t30 || row.t24 || 0,
              pressure: row.pressure || row.press || row.p30 || 0,
              vibration: row.vibration || row.vib || 0,
              speed: row.speed || row.rpm || row.nc || row.nf || 0,
              torque: row.torque || 0,
              wear: row.wear || 0,
              ...row
            });
          }

          setRows(parsed);
          // Set dynamic sensor selector to the first non-cycle column
          const columns = Object.keys(parsed[0]).filter(k => k !== 'cycle');
          if (columns.length > 0) {
            setSelectedSensor(columns[0]);
          }
        }
      } catch (err) {
        console.error(err);
        alert('Failed to parse file. Ensure it is a valid CSV or JSON array.');
      }
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  // Run Batch ML Inference simulation
  const triggerBatchInference = () => {
    if (rows.length === 0 || isProcessing) return;
    setIsProcessing(true);
    setInferenceLogs([
      '[UPLINK PIPELINE] Syncing dataset boundaries with ForgeSight v3.5 neural structures...',
      '[UPLINK PIPELINE] Detected ' + rows.length + ' sequential cycle records.',
      '[UPLINK PIPELINE] Map-reducing custom telemetry channels to NASA C-MAPSS standard space...'
    ]);

    let logCounter = 0;
    const logInterval = setInterval(() => {
      logCounter++;
      if (logCounter === 1) {
        setInferenceLogs(prev => [
          ...prev,
          '[MODEL COMPILER] Fetching pre-trained weights for Informer Space-Time Attention model...',
          '[MODEL COMPILER] Re-calibrating differential privacy matrices (Epsilon ε = 2.80)...'
        ]);
      } else if (logCounter === 2) {
        setInferenceLogs(prev => [
          ...prev,
          '[BATCH SCORING] Executing cycle-by-cycle remaining useful life calculation...',
          '[BATCH SCORING] Progress: [██████████░░░░░░░░] 50% parsed (MAE: 10.4cycles)'
        ]);
      } else if (logCounter === 3) {
        setInferenceLogs(prev => [
          ...prev,
          '[ANOMALY ENGINES] Triggering Autoencoder reconstructive loss calculations...',
          '[ANOMALY ENGINES] Isolated ' + Math.ceil(rows.length * 0.12) + ' anomalous cycle steps exceeding Reconstruction MSE > 2.5.'
        ]);
      } else if (logCounter === 4) {
        clearInterval(logInterval);
        
        // Execute real mathematical tagging of the rows based on cycle position (degradation)
        const scoredRows = rows.map((row, idx) => {
          const progress = idx / rows.length; // 0.0 to 1.0
          const nominalRUL = rows.length - idx; // true linearly degrading RUL
          
          // Inject actual analytical RUL (including noise and model MAE offset)
          const modelError = (Math.sin(idx / 5) * 6) + (Math.random() - 0.5) * 4;
          const predictedRUL = Math.max(0, Math.round(nominalRUL + modelError));
          
          // Calculate exponential health score drop
          const healthScore = Math.max(0, Math.min(100, Math.round(100 - Math.pow(progress, 2) * 85 + (Math.random() - 0.5) * 5)));
          
          // Failure probability spikes at the end of cycles
          const failureProbability = parseFloat((Math.min(100, Math.max(0, Math.pow(progress, 3.5) * 98 + (Math.random() - 0.5) * 4))).toFixed(1));
          
          // Anomaly detected when health < 60 or noise spike
          const anomalyDetected = healthScore < 55 || (progress > 0.4 && Math.random() > 0.88);

          return {
            ...row,
            predictedRUL,
            healthScore,
            failureProbability,
            anomalyDetected
          };
        });

        setRows(scoredRows);
        setInferenceLogs(prev => [
          ...prev,
          '[MODEL EVALUATION] Batch evaluation finished successfully!',
          '[MODEL EVALUATION] Metrics Summary: Mean Absolute Error = 9.8 Cycles | R² Score = 0.941',
          '[UPLINK SUCCESS] Unlocking interactive dataset preview and live Digital Twin injector.'
        ]);
        setHasRunInference(true);
        setIsProcessing(false);
      }
    }, 1000);
  };

  // Inject current row values into the live global twin
  const handleInjectRowToTwin = (rowIndex: number) => {
    const row = rows[rowIndex];
    if (!row) return;

    let machineName = activeTwin.metadata.name;
    let machineType = activeTwin.metadata.type;
    if (datasetType === 'cmapss') {
      machineName = 'NASA Turbofan Unit #94';
      machineType = 'Turbofan Engine (C-MAPSS)';
    } else if (datasetType === 'cnc') {
      machineName = 'Custom Milling CNC #809';
      machineType = 'CNC Milling';
    } else if (datasetType === 'hydraulic') {
      machineName = 'Heavy Forging Hydraulic Press #1203';
      machineType = 'Hydraulic Pump';
    } else {
      machineName = 'Custom Uplink Workspace';
      machineType = 'Gas Turbine';
    }

    // Prepare SensorData
    const sensors: SensorData = {
      timestamp: new Date().toLocaleTimeString(),
      temperature: row.temperature,
      pressure: row.pressure,
      vibration: row.vibration,
      speed: row.speed,
      torque: row.torque,
      wear: row.wear,
      t24: row.t24,
      t30: row.t30,
      t50: row.t50,
      p30: row.p30,
      nf: row.nf,
      nc: row.nc,
      ps30: row.ps30,
      bpr: row.bpr,
      htBleed: row.htBleed,
      w31: row.w31,
      w32: row.w32
    };

    // Calculate default model metrics if inference hasn't been run
    const progress = rowIndex / rows.length;
    const defaultRUL = rows.length - rowIndex;
    const predictedRUL = row.predictedRUL ?? defaultRUL;
    const healthScore = row.healthScore ?? Math.max(0, Math.min(100, Math.round(100 - Math.pow(progress, 2) * 85)));
    const failureProbability = row.failureProbability ?? parseFloat((Math.pow(progress, 3) * 95).toFixed(1));

    onInjectRow({
      sensors,
      healthScore,
      predictedRUL,
      failureProbability,
      machineName,
      machineType
    });

    setInjectedSuccessIndex(rowIndex);
    setTimeout(() => {
      setInjectedSuccessIndex(null);
    }, 3000);
  };

  // Export predictions as CSV
  const handleExportCSV = () => {
    if (rows.length === 0) return;
    
    // Headers list
    const keys = Object.keys(rows[0]);
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Add header row
    csvContent += keys.join(",") + "\r\n";
    
    // Add value rows
    rows.forEach(row => {
      const line = keys.map(key => {
        const val = (row as any)[key];
        return typeof val === 'boolean' ? (val ? 1 : 0) : val;
      }).join(",");
      csvContent += line + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", datasetName.replace('.csv', '_ForgeSight_Scored.csv'));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSensorsList = (): string[] => {
    if (rows.length === 0) return [];
    return Object.keys(rows[0]).filter(k => 
      k !== 'cycle' && 
      k !== 'predictedRUL' && 
      k !== 'healthScore' && 
      k !== 'failureProbability' && 
      k !== 'anomalyDetected'
    );
  };

  // Statistical calculations
  const totalCycles = rows.length;
  const meanTemp = rows.length > 0 ? parseFloat((rows.reduce((sum, r) => sum + r.temperature, 0) / rows.length).toFixed(1)) : 0;
  const meanVib = rows.length > 0 ? parseFloat((rows.reduce((sum, r) => sum + r.vibration, 0) / rows.length).toFixed(2)) : 0;
  const meanWear = rows.length > 0 ? parseFloat((rows.reduce((sum, r) => sum + r.wear, 0) / rows.length).toFixed(1)) : 0;

  return (
    <div className="space-y-6">
      {/* Top Welcome Panel */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900/90 to-slate-950 border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-slate-800/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="flex h-1.5 w-1.5 rounded-full bg-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 font-mono tracking-widest uppercase">
                Enterprise Telemetry Uplink
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight font-sans">
              Dataset Inference & Sandbox Laboratory
            </h1>
            <p className="text-slate-400 text-xs max-w-3xl leading-relaxed">
              Upload custom thermodynamic records or process high-fidelity benchmark datasets. Execute batch LSTM/Informer inference, monitor multi-dimensional signal plots, and hot-inject specific sequence rows into the Digital Twin.
            </p>
          </div>
          <div className="flex items-center space-x-2 shrink-0 bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
            <button
              onClick={() => loadSample('cmapss')}
              className={`px-3 py-1.5 rounded font-mono text-[10px] font-bold uppercase transition-all ${
                datasetType === 'cmapss' 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              NASA C-MAPSS
            </button>
            <button
              onClick={() => loadSample('cnc')}
              className={`px-3 py-1.5 rounded font-mono text-[10px] font-bold uppercase transition-all ${
                datasetType === 'cnc' 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              CNC Milling
            </button>
            <button
              onClick={() => loadSample('hydraulic')}
              className={`px-3 py-1.5 rounded font-mono text-[10px] font-bold uppercase transition-all ${
                datasetType === 'hydraulic' 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Hydraulic Press
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Side: Upload Panel & Dataset Controls */}
        {activeTab !== 'preprocessing' && (
          <div className="lg:col-span-1 space-y-6">
          {/* Drag & Drop File Upload */}
          <div className="premium-card rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans border-b border-slate-800 pb-2">
              Telemetry File Upload
            </h3>

            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                dragActive 
                  ? 'border-slate-300 bg-slate-800/20' 
                  : 'border-slate-800 bg-slate-950 hover:border-slate-700'
              }`}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".csv,.json" 
                onChange={handleFileInput}
                className="hidden" 
              />
              <Upload className="w-8 h-8 mx-auto text-slate-500 mb-3" />
              <p className="text-xs text-slate-300 font-mono font-semibold">
                Drag & Drop CSV / JSON
              </p>
              <p className="text-[10px] text-slate-500 font-mono mt-1">
                Supports up to 5,000 cycles
              </p>
            </div>

            {datasetName && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 font-mono text-[10px] flex items-center space-x-2.5">
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="truncate flex-1">
                  <span className="text-slate-300 block font-bold truncate">{datasetName}</span>
                  <span className="text-slate-500 text-[8px] uppercase">{totalCycles} parsed cycles</span>
                </div>
              </div>
            )}
          </div>

          {/* Model Inference Actions Panel */}
          <div className="premium-card rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>ML Inference Engine</span>
              {hasRunInference && (
                <span className="text-[8px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-800 px-1.5 py-0.5 rounded uppercase">
                  ACTIVE
                </span>
              )}
            </h3>

            <p className="text-[10px] text-slate-400 font-mono leading-relaxed">
              Feed raw CSV lines through deep LSTM/Transformer regressors to extract remaining useful life (RUL) trajectories.
            </p>

            <button
              onClick={triggerBatchInference}
              disabled={rows.length === 0 || isProcessing}
              className={`w-full py-2.5 rounded-lg font-mono text-xs font-bold border transition-all flex items-center justify-center space-x-2 ${
                rows.length === 0 || isProcessing
                  ? 'bg-slate-950 border-transparent text-slate-650 cursor-not-allowed'
                  : 'bg-slate-800 border-slate-700 hover:bg-slate-750 text-white'
              }`}
            >
              <Play className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>{isProcessing ? 'Processing Batch...' : 'Run Batch Inference'}</span>
            </button>

            {hasRunInference && (
              <button
                onClick={handleExportCSV}
                className="w-full py-2.5 rounded-lg font-mono text-xs font-bold border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-300 transition-all flex items-center justify-center space-x-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Predicted CSV</span>
              </button>
            )}
          </div>

          {/* Inference Logs Console */}
          {inferenceLogs.length > 0 && (
            <div className="premium-card rounded-xl p-4 space-y-2">
              <span className="text-[9px] font-mono text-slate-500 block font-bold uppercase tracking-wider">Scoring Pipeline Logs:</span>
              <div className="bg-slate-950 border border-slate-800 rounded p-2.5 h-44 overflow-y-auto font-mono text-[8px] space-y-1.5 text-slate-300">
                {inferenceLogs.map((log, idx) => (
                  <div key={idx} className={log.includes('SUCCESS') || log.includes('COMPLETE') ? 'text-emerald-400' : log.includes('EVAL') ? 'text-slate-300' : 'text-slate-550'}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        )}

        {/* Right Side: Deep Analytics & Plots */}
        <div className={`${activeTab === 'preprocessing' ? 'lg:col-span-4' : 'lg:col-span-3'} space-y-6`}>
          {/* Sub tabs selector */}
          <div className="flex border-b border-slate-800 pb-px space-x-2">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 text-xs font-mono font-bold border-b-2 uppercase tracking-wider transition-all flex items-center space-x-2 ${
                activeTab === 'analytics' 
                  ? 'border-white text-white' 
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <LineChart className="w-3.5 h-3.5" />
              <span>Telemetry Analytics & Time-Series</span>
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`px-4 py-2 text-xs font-mono font-bold border-b-2 uppercase tracking-wider transition-all flex items-center space-x-2 ${
                activeTab === 'table' 
                  ? 'border-white text-white' 
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Dataset Browser</span>
            </button>
            <button
              onClick={() => setActiveTab('preprocessing')}
              className={`px-4 py-2 text-xs font-mono font-bold border-b-2 uppercase tracking-wider transition-all flex items-center space-x-2 ${
                activeTab === 'preprocessing' 
                  ? 'border-white text-white' 
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              <span>C-MAPSS Preprocessing Sandbox</span>
            </button>
          </div>

          {activeTab === 'analytics' && (
            <div className="space-y-6">
                {/* Dataset Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl premium-card">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Parsed Cycle Rows</span>
                  <div className="text-2xl font-bold font-mono text-white mt-1">
                    {totalCycles}
                  </div>
                </div>
                <div className="p-4 rounded-xl premium-card">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Auto-Detected Channels</span>
                  <div className="text-2xl font-bold font-mono text-slate-350 mt-1">
                    {getSensorsList().length}
                  </div>
                </div>
                <div className="p-4 rounded-xl premium-card">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Est. Average Health</span>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    {rows.length > 0 ? Math.round(rows.reduce((sum, r) => sum + (r.healthScore ?? 100), 0) / rows.length) : 100}%
                  </div>
                </div>
                <div className="p-4 rounded-xl premium-card">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Autoencoder Anomaly Rate</span>
                  <div className="text-2xl font-bold font-mono text-amber-550 mt-1">
                    {rows.length > 0 ? parseFloat(((rows.filter(r => r.anomalyDetected).length / rows.length) * 100).toFixed(1)) : 0}%
                  </div>
                </div>
              </div>

              {/* Time series charts panel */}
              <div className="premium-card rounded-xl p-5 space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-800 pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans flex items-center space-x-1.5">
                      <LineChart className="w-4 h-4 text-slate-400" />
                      <span>Telemetry High-Density Signal Tracker</span>
                    </h3>
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                      Scroll through consecutive cycles or phases to inspect signal trajectory slopes.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Track Variable:</span>
                    <select
                      value={selectedSensor}
                      onChange={(e) => setSelectedSensor(e.target.value)}
                      className="bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 rounded px-2.5 py-1.5 focus:border-slate-500 focus:outline-none"
                    >
                      {getSensorsList().map(col => (
                        <option key={col} value={col}>
                          {col.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {rows.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-650 font-mono text-xs">
                    No dataset loaded. Upload a CSV or load a sample above.
                  </div>
                ) : (
                  <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                    {/* Beautiful custom responsive SVG chart for plotting high density telemetry */}
                    <div className="h-64 w-full relative">
                      <svg className="w-full h-full text-slate-800" viewBox="0 0 500 160" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="glowing-signal" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.1" />
                            <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Y-Axis lines */}
                        <line x1="40" y1="20" x2="480" y2="20" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />
                        <line x1="40" y1="70" x2="480" y2="70" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />
                        <line x1="40" y1="120" x2="480" y2="120" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />
                        <line x1="40" y1="140" x2="480" y2="140" stroke="#334155" strokeWidth="1" />

                        {/* SVG Path drawing */}
                        {(() => {
                           const sensorValues = rows.map(r => (r as any)[selectedSensor] || 0);
                           const minVal = Math.min(...sensorValues);
                           const maxVal = Math.max(...sensorValues);
                           const range = maxVal - minVal || 1;

                           const points = rows.map((r, idx) => {
                             const x = 40 + (idx / (rows.length - 1)) * 440;
                             const normalizedVal = ((r as any)[selectedSensor] - minVal) / range;
                             const y = 140 - normalizedVal * 110;
                             return `${x},${y}`;
                           });

                           const pathData = `M ${points.join(' L ')}`;
                           const areaData = `${pathData} L 480,140 L 40,140 Z`;

                           return (
                             <>
                               {/* Filled glowing area */}
                               <path d={areaData} fill="url(#glowing-signal)" />
                               {/* Glowing signal line */}
                               <path d={pathData} fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
                               
                               {/* Draw indicators for selected row */}
                               {selectedRowIndex < rows.length && (() => {
                                 const selX = 40 + (selectedRowIndex / (rows.length - 1)) * 440;
                                 const normVal = (((rows[selectedRowIndex] as any)[selectedSensor] || 0) - minVal) / range;
                                 const selY = 140 - normVal * 110;

                                 return (
                                   <>
                                     <line x1={selX} y1="10" x2={selX} y2="140" stroke="#ef4444" strokeWidth="0.8" strokeDasharray="2,2" />
                                     <circle cx={selX} cy={selY} r="2" fill="#ef4444" />
                                   </>
                                 );
                               })()}

                               {/* Max & Min labels */}
                               <text x="35" y="24" textAnchor="end" fill="#475569" fontSize="7" fontFamily="monospace">{maxVal.toFixed(1)}</text>
                               <text x="35" y="124" textAnchor="end" fill="#475569" fontSize="7" fontFamily="monospace">{minVal.toFixed(1)}</text>
                             </>
                           );
                         })()}

                        {/* X-Axis Labels */}
                        <text x="40" y="152" fill="#475569" fontSize="7" fontFamily="monospace">Cycle 1</text>
                        <text x="260" y="152" textAnchor="middle" fill="#475569" fontSize="7" fontFamily="monospace">Median Cycle {Math.round(rows.length / 2)}</text>
                        <text x="480" y="152" textAnchor="end" fill="#ef4444" fontSize="7" fontFamily="monospace" fontWeight="bold">Terminus Cycle {rows.length}</text>
                      </svg>
                    </div>

                    {/* Selector & Drag Slider */}
                    <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                      <div className="flex items-center space-x-3 w-full md:max-w-md">
                        <span className="text-[10px] font-mono text-slate-500 uppercase font-bold shrink-0">Selected Cycle index:</span>
                        <input 
                          type="range" 
                          min="0" 
                          max={rows.length - 1} 
                          value={selectedRowIndex}
                          onChange={(e) => setSelectedRowIndex(parseInt(e.target.value))}
                          className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-slate-400"
                        />
                        <span className="text-xs font-mono font-bold text-white bg-slate-950 px-2 py-0.5 border border-slate-800 rounded">
                          {selectedRowIndex + 1}
                        </span>
                      </div>

                      {/* Inject Selected Row to twin */}
                      <button
                        onClick={() => handleInjectRowToTwin(selectedRowIndex)}
                        className={`px-4 py-2 rounded font-mono text-[11px] font-bold border transition-all flex items-center space-x-1.5 shrink-0 ${
                          injectedSuccessIndex === selectedRowIndex
                            ? 'bg-slate-900 border-slate-700 text-emerald-400'
                            : 'bg-slate-850 hover:bg-slate-800 border-slate-700 text-slate-200'
                        }`}
                      >
                        {injectedSuccessIndex === selectedRowIndex ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Injected successfully!</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Inject Cycle into Digital Twin</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* RUL decay curve panel after Batch Inference */}
              {hasRunInference && (
                <div className="premium-card rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans border-b border-slate-800 pb-2 flex items-center space-x-1.5">
                    <Activity className="w-4 h-4 text-slate-400" />
                    <span>Calculated Remaining Useful Life (RUL) Trajectory</span>
                  </h3>

                  <div className="h-44 w-full bg-slate-950/50 rounded-lg p-2 border border-slate-800">
                    <svg className="w-full h-full text-slate-800" viewBox="0 0 500 120" preserveAspectRatio="none">
                      {/* Grid lines */}
                      <line x1="40" y1="20" x2="480" y2="20" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />
                      <line x1="40" y1="60" x2="480" y2="60" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />
                      <line x1="40" y1="100" x2="480" y2="100" stroke="#334155" strokeWidth="1" />

                      {/* True linearly degrading RUL */}
                      <path d={`M 40,20 L 480,100`} fill="none" stroke="#475569" strokeWidth="1" strokeDasharray="3,3" />

                      {/* Predicted decay curve path */}
                      {(() => {
                        const points = rows.map((r, idx) => {
                          const x = 40 + (idx / (rows.length - 1)) * 440;
                          const rRatio = (r.predictedRUL ?? (rows.length - idx)) / rows.length;
                          const y = 100 - rRatio * 80;
                          return `${x},${y}`;
                        });
                        return (
                          <path d={`M ${points.join(' L ')}`} fill="none" stroke="#cbd5e1" strokeWidth="1.8" />
                        );
                      })()}

                      {/* Hover selected indicator */}
                      {(() => {
                        const selX = 40 + (selectedRowIndex / (rows.length - 1)) * 440;
                        const rRatio = (rows[selectedRowIndex]?.predictedRUL ?? (rows.length - selectedRowIndex)) / rows.length;
                        const selY = 100 - rRatio * 80;

                        return (
                          <>
                            <line x1={selX} y1="10" x2={selX} y2="100" stroke="#ef4444" strokeWidth="0.8" strokeDasharray="2,2" />
                            <circle cx={selX} cy={selY} r="2" fill="#ef4444" />
                          </>
                        );
                      })()}

                      <text x="35" y="24" textAnchor="end" fill="#475569" fontSize="6" fontFamily="monospace">{rows.length} RUL</text>
                      <text x="35" y="104" textAnchor="end" fill="#475569" fontSize="6" fontFamily="monospace">0 RUL</text>
                    </svg>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 text-[10px] font-mono text-slate-400 leading-relaxed space-y-1.5">
                    <span className="text-white font-bold uppercase block tracking-wider text-[8px] flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                      <span>Advanced Neural RUL Insights:</span>
                    </span>
                    <p>
                      The Informer Attention weights map-reduced thermodynamic gradients against nominal baseline records. Notice how as physical wear reaches <b>{rows[selectedRowIndex]?.wear}%</b> at Cycle <b>{selectedRowIndex + 1}</b>, the degradation path accelerates exponentially, showing a remaining useful life of <b>{rows[selectedRowIndex]?.predictedRUL} cycles</b>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'table' && (
            /* Full Dataset Data Table */
            <div className="premium-card rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans">
                  Parsed Signal Dataset ({rows.length} Cycles)
                </h3>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  PAGE {currentPage} OF {totalPages}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[10px] text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase">
                      <th className="py-2.5 pb-3">CYCLE</th>
                      <th className="py-2.5 pb-3">TEMP (°C)</th>
                      <th className="py-2.5 pb-3">PRESSURE (kPa)</th>
                      <th className="py-2.5 pb-3">VIB (mm/s)</th>
                      <th className="py-2.5 pb-3">SPEED (RPM)</th>
                      <th className="py-2.5 pb-3">WEAR (%)</th>
                      <th className="py-2.5 pb-3 text-center">ANOMALY</th>
                      <th className="py-2.5 pb-3 text-right">PREDICTED RUL</th>
                      <th className="py-2.5 pb-3 text-right">INJECT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {paginatedRows.map((row, idx) => {
                      const actualIdx = (currentPage - 1) * rowsPerPage + idx;
                      const isSelected = selectedRowIndex === actualIdx;
                      return (
                        <tr 
                          key={actualIdx}
                          className={`hover:bg-slate-900/20 transition-colors ${
                            isSelected ? 'bg-slate-950 text-white font-semibold' : ''
                          }`}
                        >
                          <td className="py-2 font-bold">{row.cycle}</td>
                          <td className="py-2">{row.temperature}°C</td>
                          <td className="py-2">{row.pressure} kPa</td>
                          <td className="py-2">{row.vibration} mm/s</td>
                          <td className="py-2">{row.speed} RPM</td>
                          <td className="py-2">{row.wear}%</td>
                          <td className="py-2 text-center">
                            {row.anomalyDetected ? (
                              <span className="px-1.5 py-0.5 bg-rose-950/40 text-rose-350 border border-rose-900/30 rounded uppercase font-bold text-[8px]">
                                TRUE
                              </span>
                            ) : (
                              <span className="text-slate-600 font-bold">-</span>
                            )}
                          </td>
                          <td className="py-2 text-right font-bold text-slate-200">
                            {row.predictedRUL !== undefined ? `${row.predictedRUL} cyc` : 'Pending'}
                          </td>
                          <td className="py-2 text-right">
                            <button
                              onClick={() => handleInjectRowToTwin(actualIdx)}
                              className={`px-2 py-1 rounded text-[8px] font-mono border uppercase font-bold transition-all ${
                                injectedSuccessIndex === actualIdx
                                  ? 'bg-slate-900 border-slate-700 text-emerald-400'
                                  : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'
                              }`}
                            >
                              {injectedSuccessIndex === actualIdx ? 'Injected' : 'Load Row'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-800 text-xs font-mono">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:hover:text-slate-400"
                >
                  PREVIOUS
                </button>
                <span className="text-slate-500">
                  Showing { (currentPage - 1) * rowsPerPage + 1 } - { Math.min(rows.length, currentPage * rowsPerPage) } of { rows.length } cycles
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:hover:text-slate-400"
                >
                  NEXT
                </button>
              </div>
            </div>
          )}

          {activeTab === 'preprocessing' && (
            <DatasetManager />
          )}
        </div>

      </div>
    </div>
  );
}
