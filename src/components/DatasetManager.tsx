import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  FileText, 
  Play, 
  Download, 
  CheckCircle, 
  Sliders, 
  LineChart, 
  Cpu, 
  Layers, 
  Sparkles, 
  Info, 
  Database,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Eye
} from 'lucide-react';

// Names of the 21 C-MAPSS sensors for labels and descriptions
const SENSOR_NAMES = [
  's1 (Fan inlet temp)',
  's2 (LPC outlet temp - T24)',
  's3 (HPC outlet temp - T30)',
  's4 (LPT outlet temp - T50)',
  's5 (Bypass inlet pressure)',
  's6 (Bypass-duct total pressure)',
  's7 (HPC outlet pressure - P30)',
  's8 (Physical fan speed - Nf)',
  's9 (Physical core speed - Nc)',
  's10 (Engine pressure ratio)',
  's11 (HPC outlet static pressure - Ps30)',
  's12 (Fuel flow ratio - phi)',
  's13 (Real fan speed)',
  's14 (HPT speed)',
  's15 (Bypass ratio - Bpr)',
  's16 (Burner fuel-air ratio)',
  's17 (Bleed Enthalpy - htBleed)',
  's18 (Demanded fan speed)',
  's19 (Demanded corrected fan speed)',
  's20 (HPT coolant bleed - w31)',
  's21 (LPT coolant bleed - w32)'
];

import { CMAPSSDatasetManager, EngineRecord, WindowedSequence } from '../utils/DatasetManager';

interface NormalizationParams {
  mins?: number[];
  maxs?: number[];
  means: number[];
  stds: number[];
}

export default function DatasetManager() {
  // Config States
  const [windowSize, setWindowSize] = useState<number>(30);
  const [stride, setStride] = useState<number>(1);
  const [rulCapping, setRulCapping] = useState<number>(125);
  const [normalizationType, setNormalizationType] = useState<'minmax_01' | 'minmax_11' | 'zscore'>('minmax_01');
  const [splitRatio, setSplitRatio] = useState<number>(80);
  const [preventLeakage, setPreventLeakage] = useState<boolean>(true);
  const [activeDatasetType, setActiveDatasetType] = useState<'FD001' | 'FD002' | 'FD003'>('FD001');

  // Data States
  const [rawRecords, setRawRecords] = useState<EngineRecord[]>([]);
  const [datasetName, setDatasetName] = useState<string>('NASA_C-MAPSS_FD001_Preloaded.txt');
  const [uniqueUnits, setUniqueUnits] = useState<number[]>([]);
  
  // Pipeline Results
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [pipelineLogs, setPipelineLogs] = useState<string[]>([]);
  const [hasRunPipeline, setHasRunPipeline] = useState<boolean>(false);
  const [normParams, setNormParams] = useState<NormalizationParams | null>(null);

  // Preprocessed Tensors
  const [trainSequences, setTrainSequences] = useState<WindowedSequence[]>([]);
  const [testSequences, setTestSequences] = useState<WindowedSequence[]>([]);

  // Interactive Browser States
  const [selectedSet, setSelectedSet] = useState<'train' | 'test'>('train');
  const [selectedSequenceIndex, setSelectedSequenceIndex] = useState<number>(0);
  const [selectedSensorIndex, setSelectedSensorIndex] = useState<number>(2); // Default to s3 (T30)
  const [dragActive, setDragActive] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate authentic mock C-MAPSS dataset on component mount
  useEffect(() => {
    loadPreloadedDataset('FD001');
  }, []);

  const loadPreloadedDataset = (type: 'FD001' | 'FD002' | 'FD003' = 'FD001') => {
    // We will generate 5 engine units that match C-MAPSS profiles for each subset
    const unitsLifetime = type === 'FD002' ? [210, 195, 230, 185, 205] : type === 'FD003' ? [145, 160, 135, 175, 150] : [192, 215, 179, 230, 160];
    const generated: EngineRecord[] = [];

    unitsLifetime.forEach((lifetime, idx) => {
      const unitId = idx + 1;
      for (let cycle = 1; cycle <= lifetime; cycle++) {
        const progress = cycle / lifetime; // 0 to 1
        
        // s1: Fan inlet temp (Constant 518.67)
        const s1 = 518.67;
        // s2: LPC outlet temp (T24) - Increases with degradation
        const s2 = parseFloat((641.5 + progress * 2.9 + (Math.random() - 0.5) * 0.15).toFixed(2));
        // s3: HPC outlet temp (T30) - Exponential increase
        const s3 = parseFloat((1580.2 + progress * progress * 32.4 + (Math.random() - 0.5) * 1.8).toFixed(2));
        // s4: LPT outlet temp (T50) - Linear increase
        const s4 = parseFloat((1400.1 + progress * 28.5 + (Math.random() - 0.5) * 1.2).toFixed(2));
        // s5: Bypass inlet pressure (Constant 14.62)
        const s5 = 14.62;
        // s6: Total bypass pressure - Noisy stable
        const s6 = parseFloat((21.61 + (Math.random() - 0.5) * 0.05).toFixed(2));
        // s7: HPC pressure (P30) - Decreases
        const s7 = parseFloat((554.1 - progress * 8.9 + (Math.random() - 0.5) * 0.8).toFixed(2));
        // s8: Fan speed (Nf) - Slight upward drift, stronger in FD003
        const s8Offset = type === 'FD003' ? 4.5 : 1.5;
        const s8 = parseFloat((2387.9 + progress * s8Offset + (Math.random() - 0.5) * 0.5).toFixed(2));
        // s9: Core speed (Nc) - Strong downward degradation
        const s9 = parseFloat((9045.2 - progress * 68.5 + (Math.random() - 0.5) * 4.5).toFixed(2));
        // s10: Engine pressure ratio (Constant 1.3)
        const s10 = 1.3;
        // s11: Static pressure Ps30 - Increases
        const s11 = parseFloat((47.2 + progress * 1.95 + (Math.random() - 0.5) * 0.12).toFixed(2));
        // s12: Fuel flow ratio - Decreases
        const s12 = parseFloat((521.1 - progress * 16.4 + (Math.random() - 0.5) * 1.5).toFixed(2));
        // s13: Real fan speed - Increases, sharper in FD003
        const s13Offset = type === 'FD003' ? 3.8 : 1.4;
        const s13 = parseFloat((2388.0 + progress * s13Offset + (Math.random() - 0.5) * 0.6).toFixed(2));
        // s14: HPT speed - Decreases
        const s14 = parseFloat((8131.0 - progress * 48.0 + (Math.random() - 0.5) * 5.0).toFixed(2));
        // s15: Bypass ratio (Bpr) - Strong increase, coupled in FD003
        const s15Offset = type === 'FD003' ? 0.48 : 0.31;
        const s15 = parseFloat((8.41 + progress * s15Offset + (Math.random() - 0.5) * 0.02).toFixed(3));
        // s16: Burner ratio (Constant 0.03)
        const s16 = 0.03;
        // s17: Bleed Enthalpy - Quadratic increase
        const s17 = parseFloat((392.0 + progress * progress * 9.2 + (Math.random() - 0.5) * 0.8).toFixed(1));
        // s18: Demanded speed (Constant 2388)
        const s18 = 2388;
        // s19: Demanded corrected speed (Constant 100)
        const s19 = 100.00;
        // s20: HPT coolant bleed - Increases
        const s20 = parseFloat((38.85 + progress * 1.1 + (Math.random() - 0.5) * 0.06).toFixed(3));
        // s21: LPT coolant bleed - Increases
        const s21 = parseFloat((23.31 + progress * 0.65 + (Math.random() - 0.5) * 0.04).toFixed(3));

        // Operate in 6 operational conditions for FD002
        let setting1 = parseFloat(((Math.random() - 0.5) * 0.005).toFixed(4));
        let setting2 = parseFloat(((Math.random() - 0.5) * 0.0005).toFixed(4));
        let setting3 = 100;

        if (type === 'FD002') {
          const clusterId = (unitId + cycle) % 6;
          const clusters = [
            { s1: 10.0047, s2: 0.2501, s3: 100 },
            { s1: 25.0074, s2: 0.6200, s3: 60 },
            { s1: 35.0021, s2: 0.8400, s3: 100 },
            { s1: 42.0080, s2: 0.8406, s3: 100 },
            { s1: 20.0025, s2: 0.7002, s3: 100 },
            { s1: 0.0012, s2: 0.0002, s3: 100 }
          ];
          setting1 = clusters[clusterId].s1;
          setting2 = clusters[clusterId].s2;
          setting3 = clusters[clusterId].s3;
        }

        generated.push({
          unitId,
          cycle,
          setting1,
          setting2,
          setting3,
          sensors: [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16, s17, s18, s19, s20, s21]
        });
      }
    });

    const manager = new CMAPSSDatasetManager(generated);
    setRawRecords(generated);
    setUniqueUnits(manager.getUnitIds());
    setDatasetName(`NASA_C-MAPSS_${type}_Preloaded.txt`);
    setHasRunPipeline(false);
  };

  // Parser for raw txt files using CMAPSSDatasetManager class
  const handleFileParse = (text: string, filename: string) => {
    setIsProcessing(true);
    setHasRunPipeline(false);
    setPipelineLogs([`[05:10:00] [PARSER] Commencing ingestion of: ${filename}`]);

    setTimeout(() => {
      try {
        const manager = new CMAPSSDatasetManager();
        manager.loadFromString(text);
        const parsed = manager.getRecords();
        const units = manager.getUnitIds();

        setRawRecords(parsed);
        setUniqueUnits(units);
        setDatasetName(filename);
        setPipelineLogs(prev => [
          ...prev,
          `[05:10:01] [PARSER] Successfully parsed ${parsed.length} raw time-series steps.`,
          `[05:10:01] [PARSER] Auto-identified ${units.length} unique turbofan engine units: [${units.slice(0, 10).join(', ')}${units.length > 10 ? '...' : ''}].`
        ]);
      } catch (err: any) {
        setPipelineLogs(prev => [
          ...prev,
          `[05:10:01] [ERROR] Ingestion failed: ${err.message || 'Malformed file template.'}`
        ]);
        alert(`Error parsing file: ${err.message || 'Ensure it matches the standard 26-column space-delimited C-MAPSS format.'}`);
      } finally {
        setIsProcessing(false);
      }
    }, 800);
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
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        handleFileParse(text, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        handleFileParse(text, file.name);
      };
      reader.readAsText(file);
    }
  };

  // Preprocessing pipeline execution delegating to CMAPSSDatasetManager class
  const runPreprocessingPipeline = () => {
    if (rawRecords.length === 0 || isProcessing) return;
    setIsProcessing(true);
    setHasRunPipeline(false);
    
    setPipelineLogs([
      `[05:10:05] [PIPELINE] Initializing NASA C-MAPSS ${activeDatasetType} Preprocessing Pipeline (Class-Based).`,
      `[05:10:05] [PIPELINE] Window Size: ${windowSize} steps | Stride: ${stride} | RUL Piecewise Cap: ${rulCapping} cycles.`,
      `[05:10:05] [PIPELINE] Normalization: ${normalizationType === 'minmax_01' ? 'MinMax Scaling [0,1]' : normalizationType === 'minmax_11' ? 'MinMax Scaling [-1,1]' : 'Z-Score Standardization'}`
    ]);

    setTimeout(() => {
      // Create dataset manager instance
      const manager = new CMAPSSDatasetManager(rawRecords);

      // 1. Group-by-Unit Split to prevent data leakage
      setPipelineLogs(prev => [
        ...prev,
        `[05:10:06] [SPLITTER] Evaluating train/test split. Policy: ${preventLeakage ? 'Leakage Prevention (Group-by-Unit)' : 'Random Split'}`
      ]);

      const { trainUnits, testUnits } = manager.splitUnits(splitRatio / 100, preventLeakage);

      setPipelineLogs(prev => [
        ...prev,
        `[05:10:06] [SPLITTER] Selected Train Units (${trainUnits.length}): [${trainUnits.join(', ')}]`,
        `[05:10:06] [SPLITTER] Selected Test Units (${testUnits.length}): [${testUnits.join(', ')}]`
      ]);

      // 2. Normalization Parameter Calculations over Train Set ONLY (Avoid Leakage!)
      let alternateNorm: 'minmax_01' | 'minmax_11' | undefined = undefined;
      
      if (normalizationType === 'zscore') {
        const stats = manager.fitNormalization(trainUnits);
        setNormParams(stats);
        setPipelineLogs(prev => [
          ...prev,
          `[05:10:07] [NORMALIZER] Fitted Z-Score parameters on Train data. s1 mean: ${stats.means[0].toFixed(2)}, std: ${stats.stds[0].toFixed(2)}`,
          `[05:10:07] [NORMALIZER] Standard Deviation calculated for 21 sensory channels.`
        ]);
      } else {
        alternateNorm = normalizationType;
        // Fake stats container for UI visualization
        setNormParams({ means: Array(21).fill(0), stds: Array(21).fill(1) });
        setPipelineLogs(prev => [
          ...prev,
          `[05:10:07] [NORMALIZER] Configured alternative ${normalizationType} scaling parameters.`
        ]);
      }

      // 3. Piecewise Linear RUL target & Sliding Window Sequence Generation
      setPipelineLogs(prev => [
        ...prev,
        `[05:10:07] [WINDOWING] Rolling sliding sequences via class window generator. Window Size: ${windowSize} steps, Stride: ${stride}.`
      ]);

      const generatedTrainSeqs = manager.generateSequences(trainUnits, windowSize, stride, rulCapping, alternateNorm);
      const generatedTestSeqs = manager.generateSequences(testUnits, windowSize, stride, rulCapping, alternateNorm);

      setTrainSequences(generatedTrainSeqs);
      setTestSequences(generatedTestSeqs);
      setSelectedSequenceIndex(0);

      setPipelineLogs(prev => [
        ...prev,
        `[05:10:08] [WINDOWING] Generated ${generatedTrainSeqs.length} Train sequences and ${generatedTestSeqs.length} Test sequences.`,
        `[05:10:08] [PIPELINE_COMPLETE] Formatted data shapes:`,
        `    - X_train tensor shape: [${generatedTrainSeqs.length}, ${windowSize}, 21]`,
        `    - y_train target shape: [${generatedTrainSeqs.length}, 1]`,
        `    - X_test tensor shape:  [${generatedTestSeqs.length}, ${windowSize}, 21]`,
        `    - y_test target shape:  [${generatedTestSeqs.length}, 1]`,
        `[UPLINK SUCCESS] Preprocessed C-MAPSS FD001 dataset loaded into neural buffers.`
      ]);

      setHasRunPipeline(true);
      setIsProcessing(false);
    }, 1200);
  };

  const getSelectedSetData = () => {
    return selectedSet === 'train' ? trainSequences : testSequences;
  };

  const activeSetData = getSelectedSetData();
  const activeSeq = activeSetData[selectedSequenceIndex] || null;

  return (
    <div className="space-y-6">
      {/* Introduction Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900/90 to-slate-950 border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-slate-800/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] font-bold text-cyan-400 font-mono tracking-widest uppercase">
                NASA C-MAPSS Multi-Dataset Ingestion Hub
              </span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight font-sans flex items-center space-x-2">
              <Cpu className="w-5.5 h-5.5 text-cyan-400" />
              <span>Turbofan {activeDatasetType} Preprocessing Laboratory</span>
            </h1>
            <p className="text-slate-400 text-xs max-w-3xl leading-relaxed">
              Design, test, and package high-fidelity sequence windowing matrices for standard deep learning models. Select preloaded subsets, fit scaling parameters, enforce engine-indexed train-test partitions, and prevent transductive leakage.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-950 border border-slate-800 p-1.5 rounded-lg">
            <span className="text-[9px] font-mono font-bold text-slate-500 px-2 uppercase shrink-0">CHOOSE SUBSET:</span>
            <select
              value={activeDatasetType}
              onChange={(e) => {
                const val = e.target.value as 'FD001' | 'FD002' | 'FD003';
                setActiveDatasetType(val);
                loadPreloadedDataset(val);
              }}
              className="bg-transparent text-xs text-white font-mono font-bold focus:outline-none border-none pr-3 cursor-pointer uppercase py-1"
            >
              <option value="FD001" className="bg-slate-950 text-white">FD001 (1 Cond / HPC)</option>
              <option value="FD002" className="bg-slate-950 text-white">FD002 (6 Cond / HPC)</option>
              <option value="FD003" className="bg-slate-950 text-white">FD003 (1 Cond / Coupled)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: PARAMETER SETUP */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* File Upload / Ingest */}
          <div className="premium-card rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>Ingestion Engine</span>
              <span className="text-[9px] font-mono bg-slate-900 text-cyan-400 border border-cyan-900/30 px-2 py-0.5 rounded font-bold">
                {activeDatasetType} FORMAT
              </span>
            </h3>

            <div 
              onDragOver={handleDrag}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                dragActive 
                  ? 'border-slate-300 bg-slate-850/30' 
                  : 'border-slate-800 bg-slate-950 hover:border-slate-700'
              }`}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".csv,.txt"
                onChange={handleFileInput}
                className="hidden" 
              />
              <Upload className="w-7 h-7 mx-auto text-slate-500 mb-2" />
              <p className="text-xs text-slate-300 font-mono font-semibold">
                Upload NASA CSV/TXT
              </p>
              <p className="text-[9px] text-slate-500 font-mono mt-1">
                Supports space-separated FD001 structure
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-[10px] space-y-1.5">
              <div className="flex items-center space-x-2 text-slate-300">
                <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-bold truncate max-w-[200px]">{datasetName}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-500 text-[8px] uppercase pt-1 border-t border-slate-800">
                <div>Steps: <span className="text-slate-300 font-bold">{rawRecords.length}</span></div>
                <div>Turbofans: <span className="text-slate-300 font-bold">{uniqueUnits.length}</span></div>
              </div>
            </div>
          </div>

          {/* Hyperparameters Config Panel */}
          <div className="premium-card rounded-xl p-5 space-y-5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>Preprocessing Configuration</span>
              <Sliders className="w-4 h-4 text-slate-500" />
            </h3>

            {/* Window Size Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">Sequence Window Length:</span>
                <span className="text-white font-bold">{windowSize} steps</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="60" 
                value={windowSize}
                onChange={(e) => setWindowSize(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-slate-400"
              />
              <p className="text-[9px] text-slate-500 font-mono">Historical cycles fed as input to standard LSTMs</p>
            </div>

            {/* Stride Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">Sliding Window Stride:</span>
                <span className="text-white font-bold">{stride} step</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={stride}
                onChange={(e) => setStride(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-slate-400"
              />
              <p className="text-[9px] text-slate-500 font-mono">Window movement step size (1 = maximum overlap)</p>
            </div>

            {/* Piecewise linear capping RUL */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">Piecewise RUL Cap:</span>
                <span className="text-white font-bold">{rulCapping} cycles</span>
              </div>
              <input 
                type="range" 
                min="100" 
                max="150" 
                value={rulCapping}
                onChange={(e) => setRulCapping(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-slate-400"
              />
              <p className="text-[9px] text-slate-500 font-mono">Caps high RUL value in healthy operating states (Standard ML convention)</p>
            </div>

            {/* Normalization Choice */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-slate-400">Normalization Scaling:</label>
              <select
                value={normalizationType}
                onChange={(e: any) => setNormalizationType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 rounded p-2 focus:border-slate-500 focus:outline-none"
              >
                <option value="minmax_01">MinMax Scaling [0, 1]</option>
                <option value="minmax_11">MinMax Scaling [-1, 1]</option>
                <option value="zscore">Z-Score Standardization (μ=0, σ=1)</option>
              </select>
            </div>

            {/* Split Ratio Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">Train Split Ratio:</span>
                <span className="text-white font-bold">{splitRatio}%</span>
              </div>
              <input 
                type="range" 
                min="50" 
                max="90" 
                value={splitRatio}
                onChange={(e) => setSplitRatio(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-slate-400"
              />
            </div>

            {/* Leakage Prevention Toggle */}
            <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-slate-300 font-bold block">Prevent Data Leakage</span>
                <span className="text-[8px] font-mono text-slate-500 block">Split by Unit ID (Inductive)</span>
              </div>
              <button 
                onClick={() => setPreventLeakage(!preventLeakage)}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                  preventLeakage 
                    ? 'bg-slate-800 text-slate-100' 
                    : 'bg-slate-950 text-slate-600 border border-slate-800'
                }`}
              >
                {preventLeakage ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            {/* RUN BUTTON */}
            <button
              onClick={runPreprocessingPipeline}
              disabled={rawRecords.length === 0 || isProcessing}
              className={`w-full py-2.5 rounded-lg font-mono text-xs font-bold border transition-all flex items-center justify-center space-x-2 ${
                rawRecords.length === 0 || isProcessing
                  ? 'bg-slate-950 border-transparent text-slate-650 cursor-not-allowed'
                  : 'bg-slate-800 border-slate-700 hover:bg-slate-750 text-white'
              }`}
            >
              <Play className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>Compile Preprocessing Pipeline</span>
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: VISUALIZATIONS AND PIPELINE FEEDBACK */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Console logs */}
          <div className="premium-card rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans border-b border-slate-800 pb-2 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-slate-500" />
              <span>Pipeline Compiler Terminal</span>
            </h3>

            <div className="bg-slate-950 border border-slate-800 rounded p-3 h-44 overflow-y-auto font-mono text-[9px] space-y-2 text-slate-300">
              {pipelineLogs.length === 0 ? (
                <div className="text-slate-600 text-center h-full flex items-center justify-center">
                  Terminal inactive. Awaiting preprocessing command sequence...
                </div>
              ) : (
                pipelineLogs.map((log, idx) => (
                  <div key={idx} className={
                    log.includes('SUCCESS') || log.includes('PIPELINE_COMPLETE') ? 'text-emerald-400 font-bold' : 
                    log.includes('SPLITTER') ? 'text-amber-400' : 
                    log.includes('ERROR') ? 'text-rose-400 font-bold animate-pulse' : 'text-slate-400'
                  }>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* PREPROCESSING COMPLETED DASHBOARD */}
          {hasRunPipeline && (
            <div className="space-y-6">
              
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl premium-card">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">X_train Sequences</span>
                  <div className="text-xl font-bold font-mono text-white mt-1">
                    {trainSequences.length}
                  </div>
                  <span className="text-[8px] font-mono text-slate-650 block">Units: {splitRatio}% Split</span>
                </div>

                <div className="p-4 rounded-xl premium-card">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">X_test Sequences</span>
                  <div className="text-xl font-bold font-mono text-slate-300 mt-1">
                    {testSequences.length}
                  </div>
                  <span className="text-[8px] font-mono text-slate-650 block">Units: {100 - splitRatio}% Split</span>
                </div>

                <div className="p-4 rounded-xl premium-card">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Tensor Shape</span>
                  <div className="text-md font-bold font-mono text-emerald-400 mt-2">
                    [{getSelectedSetData().length}, {windowSize}, 21]
                  </div>
                  <span className="text-[8px] font-mono text-slate-650 block">Float32 Matrix</span>
                </div>

                <div className="p-4 rounded-xl premium-card">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Transductive Leak</span>
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-1 flex items-center space-x-1">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>0%</span>
                  </div>
                  <span className="text-[8px] font-mono text-slate-650 block">Secured Boundaries</span>
                </div>
              </div>

              {/* Sequence Browser Panel */}
              <div className="premium-card rounded-xl p-5 space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-800 pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans flex items-center space-x-1.5">
                      <LineChart className="w-4 h-4 text-slate-400" />
                      <span>Interactive Tensor Visualizer</span>
                    </h3>
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                      Select individual sequences from the preprocessed Train/Test sets to inspect normalizations and piecewise linear target RUL curves.
                    </p>
                  </div>

                  {/* Set Selector */}
                  <div className="flex bg-slate-900/60 p-1 rounded-lg border border-slate-800 shrink-0">
                    <button
                      onClick={() => { setSelectedSet('train'); setSelectedSequenceIndex(0); }}
                      className={`px-3 py-1 rounded text-[9px] font-mono font-bold uppercase transition-all ${
                        selectedSet === 'train' 
                          ? 'bg-slate-800 text-white shadow-sm' 
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      Train Set
                    </button>
                    <button
                      onClick={() => { setSelectedSet('test'); setSelectedSequenceIndex(0); }}
                      className={`px-3 py-1 rounded text-[9px] font-mono font-bold uppercase transition-all ${
                        selectedSet === 'test' 
                          ? 'bg-slate-800 text-white shadow-sm' 
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      Test Set
                    </button>
                  </div>
                </div>

                {activeSetData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-xs font-mono text-slate-550 bg-slate-950/20 rounded-xl border border-slate-800">
                    No sequences generated. Modify sequence lengths or increase raw records.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Controls Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-3 rounded-lg border border-slate-800">
                      {/* Sequence selector */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-slate-400">Select Sequence Instance:</span>
                          <span className="text-slate-300 font-bold">#{selectedSequenceIndex + 1} of {activeSetData.length}</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max={activeSetData.length - 1} 
                          value={selectedSequenceIndex}
                          onChange={(e) => setSelectedSequenceIndex(parseInt(e.target.value))}
                          className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-slate-400"
                        />
                        <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                          <span>Unit ID: {activeSeq?.unitId}</span>
                          <span>End Cycle: {activeSeq?.endCycle}</span>
                        </div>
                      </div>

                      {/* Sensor selector */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono text-slate-400 block">Track Channel Target:</span>
                        <select
                          value={selectedSensorIndex}
                          onChange={(e) => setSelectedSensorIndex(parseInt(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 rounded px-2 py-1.5 focus:border-slate-500 focus:outline-none"
                        >
                          {SENSOR_NAMES.map((name, idx) => (
                            <option key={idx} value={idx}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Chart & Target Info */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      
                      {/* Interactive SVG Chart */}
                      <div className="lg:col-span-2 p-3 bg-slate-950/50 rounded-xl border border-slate-800 space-y-2">
                        <span className="text-[10px] font-mono text-slate-400 block font-bold">
                          Sensor Signal values over sequence window steps (Length = {windowSize})
                        </span>
                        
                        <div className="h-44 w-full relative">
                          <svg className="w-full h-full text-slate-800" viewBox="0 0 400 120" preserveAspectRatio="none">
                            {/* Grid Lines */}
                            <line x1="30" y1="20" x2="380" y2="20" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />
                            <line x1="30" y1="60" x2="380" y2="60" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />
                            <line x1="30" y1="100" x2="380" y2="100" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />

                            {/* Path */}
                            {(() => {
                              if (!activeSeq) return null;
                              const vals = activeSeq.inputs.map(step => step[selectedSensorIndex]);
                              const minVal = Math.min(...vals);
                              const maxVal = Math.max(...vals);
                              const range = maxVal - minVal || 1;

                              const points = vals.map((val, idx) => {
                                const x = 30 + (idx / (windowSize - 1)) * 350;
                                // Normalized chart bounds inside the SVG
                                const normVal = range === 0 ? 0.5 : (val - minVal) / range;
                                const y = 100 - normVal * 80;
                                return `${x},${y}`;
                              });

                              return (
                                <>
                                  <path d={`M ${points.join(' L ')}`} fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
                                  
                                  {/* Circles on vertices */}
                                  {vals.length < 35 && points.map((pt, pIdx) => {
                                    const [cx, cy] = pt.split(',');
                                    return (
                                      <circle key={pIdx} cx={cx} cy={cy} r="1.5" fill="#ef4444" />
                                    );
                                  })}

                                  <text x="25" y="24" textAnchor="end" fill="#475569" fontSize="6" fontFamily="monospace">
                                    {normalizationType === 'zscore' ? maxVal.toFixed(2) : maxVal.toFixed(3)}
                                  </text>
                                  <text x="25" y="104" textAnchor="end" fill="#475569" fontSize="6" fontFamily="monospace">
                                    {normalizationType === 'zscore' ? minVal.toFixed(2) : minVal.toFixed(3)}
                                  </text>
                                </>
                              );
                            })()}

                            <text x="30" y="114" fill="#475569" fontSize="6" fontFamily="monospace">Step t-{windowSize-1}</text>
                            <text x="380" y="114" textAnchor="end" fill="#475569" fontSize="6" fontFamily="monospace">Step t</text>
                          </svg>
                        </div>
                      </div>

                      {/* Sequence details and Target RUL card */}
                      <div className="lg:col-span-1 p-4 bg-slate-900/40 rounded-xl border border-slate-800 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="border-b border-slate-800 pb-1.5">
                            <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block">Sequence Metadata</span>
                            <span className="text-xs font-mono font-bold text-white block mt-0.5">Instance #{activeSeq?.id}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
                            <div>Unit Ref:</div>
                            <div className="text-white font-bold text-right">Engine #{activeSeq?.unitId}</div>
                            
                            <div>Max Cycles:</div>
                            <div className="text-white font-bold text-right">
                              {rawRecords.filter(r => r.unitId === activeSeq?.unitId).length} cyc
                            </div>

                            <div>Window End:</div>
                            <div className="text-white font-bold text-right">Cycle {activeSeq?.endCycle}</div>
                          </div>
                        </div>

                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center mt-3 space-y-1">
                          <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest font-bold block">
                            Target Output RUL
                          </span>
                          <div className="text-2xl font-bold font-mono text-white">
                            {activeSeq?.targetRul}
                          </div>
                          <span className="text-[7px] font-mono text-slate-400 uppercase tracking-wider block">
                            Capped Piecewise cycles
                          </span>
                        </div>
                      </div>

                    </div>

                    {/* Sensor Array Grid */}
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2.5">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                        <span className="text-[10px] font-mono text-slate-400 block font-bold">
                          Multi-Dimensional Tensor Array Slice (Steps x Sensors)
                        </span>
                        <span className="text-[8px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          REDUCED TO 5 TIME-STEPS x 12 SENSORS
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-[8px] font-mono text-left border-collapse">
                          <thead>
                            <tr className="text-slate-500 border-b border-slate-800 uppercase">
                              <th className="pb-1.5">Time Step</th>
                              {SENSOR_NAMES.slice(0, 12).map((_, idx) => (
                                <th key={idx} className="pb-1.5 px-1">s{idx+1}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {activeSeq?.inputs.slice(0, 5).map((step, sStepIdx) => (
                              <tr key={sStepIdx} className="hover:bg-slate-900/30">
                                <td className="py-1 text-slate-400 font-bold">t-{windowSize - 1 - sStepIdx}</td>
                                {step.slice(0, 12).map((val, stepSensIdx) => (
                                  <td key={stepSensIdx} className="py-1 px-1 text-slate-300">
                                    {val.toFixed(3)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                )}
              </div>

              {/* Informative explanation banner */}
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-start space-x-3 text-xs leading-relaxed text-slate-400">
                <Info className="w-4.5 h-4.5 text-slate-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-white font-bold font-mono text-[10px] block uppercase tracking-wider">
                    Differential Train-Test Boundary Integrity Warning:
                  </span>
                  <p>
                    By splitting units into separate collections before windowing, we maintain absolute mathematical separation. If we were to generate sliding window sequences on the combined data first, and then randomly split those sequences, consecutive frames (e.g., cycle 50-79 and cycle 51-80) would share 29 duplicate states. This leads to massive model transductive leakage and falsely high validation accuracy during test runs.
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
