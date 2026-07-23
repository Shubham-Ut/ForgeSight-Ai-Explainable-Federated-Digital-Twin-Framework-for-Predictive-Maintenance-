import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  ShieldAlert, 
  Eye, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  Sliders, 
  Video, 
  FileDown, 
  Play, 
  Pause, 
  UserCheck, 
  Package, 
  Cpu, 
  History,
  TrendingUp,
  Activity
} from 'lucide-react';

interface DetectionEvent {
  id: string;
  timestamp: string;
  type: 'safety_violation' | 'defect_detected' | 'healthy_check';
  camera: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  resolved: boolean;
}

export default function ComputerVisionTab() {
  const [selectedCamera, setSelectedCamera] = useState<string>('cam-01');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(75);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(true);
  const [activeMode, setActiveMode] = useState<'safety' | 'defect'>('safety');
  const [logs, setLogs] = useState<DetectionEvent[]>([
    {
      id: 'log-101',
      timestamp: '11:22:15',
      type: 'safety_violation',
      camera: 'Cam #1 - Assembly Row B',
      description: 'Worker detected in Spindle Axis-X Buffer Zone without a safety helmet.',
      severity: 'high',
      resolved: false
    },
    {
      id: 'log-102',
      timestamp: '11:15:30',
      type: 'defect_detected',
      camera: 'Cam #2 - Precision CNC-101 Box',
      description: 'Micro-structural thermal crack detected on outer alloy rim of workpiece #840A.',
      severity: 'medium',
      resolved: false
    },
    {
      id: 'log-103',
      timestamp: '10:55:00',
      type: 'safety_violation',
      camera: 'Cam #1 - Assembly Row B',
      description: 'High-visibility vest check failed for cleaning contractor near robotic loader arm.',
      severity: 'high',
      resolved: true
    },
    {
      id: 'log-104',
      timestamp: '10:42:12',
      type: 'healthy_check',
      camera: 'Cam #3 - CNC Finishing Bed',
      description: 'Surface roughness validation pass. Surface deviation: <0.24 microns.',
      severity: 'low',
      resolved: true
    }
  ]);

  // Frame counter for canvas visual simulation
  const [frameTick, setFrameTick] = useState<number>(0);
  const [violationsCount, setViolationsCount] = useState<number>(1);
  const [defectsCount, setDefectsCount] = useState<number>(1);

  // Auto-scrolling logs & dynamic frame generator simulating real-time AI computer vision processing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setFrameTick(prev => prev + 1);

      // Randomly trigger a CV event based on selected modes
      const roll = Math.random();
      if (roll > 0.85) {
        const timeStr = new Date().toTimeString().split(' ')[0];
        const newEvent: DetectionEvent = roll > 0.93 ? {
          id: `log-${Date.now()}`,
          timestamp: timeStr,
          type: 'safety_violation',
          camera: selectedCamera === 'cam-01' ? 'Cam #1 - Assembly Row B' : 'Cam #2 - Precision CNC-101 Box',
          description: 'Intrusion alert: Spindle shroud proximity safety barrier breached by operator hand.',
          severity: 'high',
          resolved: false
        } : {
          id: `log-${Date.now()}`,
          timestamp: timeStr,
          type: 'defect_detected',
          camera: selectedCamera === 'cam-03' ? 'Cam #3 - CNC Finishing Bed' : 'Cam #2 - Precision CNC-101 Box',
          description: `Surface friction fissure detected on workpiece segment #${Math.floor(100 + Math.random() * 900)}B.`,
          severity: 'medium',
          resolved: false
        };

        if (newEvent.type === 'safety_violation') {
          setViolationsCount(c => c + 1);
        } else {
          setDefectsCount(c => c + 1);
        }

        setLogs(prevLogs => [newEvent, ...prevLogs.slice(0, 15)]);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isPlaying, selectedCamera]);

  const handleResolve = (id: string) => {
    setLogs(prev => prev.map(l => l.id === id ? { ...l, resolved: true } : l));
  };

  const handleDownloadReport = () => {
    const header = "FACTORY MAP COMPUTER VISION CO-PILOT INSPECTION REPORT\n======================================================\n";
    const body = logs.map(l => `[${l.timestamp}] [CAM: ${l.camera}] [TYPE: ${l.type.toUpperCase()}] [SEVERITY: ${l.severity.toUpperCase()}] - ${l.description} (Resolved: ${l.resolved})`).join('\n');
    const blob = new Blob([header + body], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FactoryMap_CV_Safety_Report_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Visual Workspace Feed */}
      <div className="lg:col-span-8 flex flex-col space-y-6">
        <div className="premium-card p-6 border border-slate-800 rounded-2xl bg-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Video className="w-5 h-5 text-white" />
                <span>Real-Time Neural Camera Uplink</span>
              </h3>
              <p className="text-xs text-slate-400">
                High-speed industrial camera streaming directly into local mobile YOLOv8 models.
              </p>
            </div>

            {/* Quick Action Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-2 rounded-lg border border-slate-800 transition-all flex items-center space-x-1 text-xs font-mono font-bold ${
                  isPlaying 
                    ? 'bg-red-950/20 text-red-400 border-red-900/30 hover:bg-red-900/10' 
                    : 'bg-emerald-950/20 text-emerald-400 border-emerald-900/30 hover:bg-emerald-900/10'
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'PAUSE LIVE' : 'PLAY LIVE'}</span>
              </button>

              <button
                onClick={() => setLogs(prev => prev.slice(0, 1))}
                className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs hover:text-white transition-colors"
                title="Clear Logs History"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Camera Selection Grid Tabs */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
            <button
              onClick={() => { setSelectedCamera('cam-01'); setActiveMode('defect'); }}
              className={`py-2 px-3 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center space-x-1.5 ${
                selectedCamera === 'cam-01' 
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="truncate">YOLOv8 Crack Segmenter</span>
            </button>
            <button
              onClick={() => { setSelectedCamera('cam-02'); setActiveMode('defect'); }}
              className={`py-2 px-3 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center space-x-1.5 ${
                selectedCamera === 'cam-02' 
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="truncate">ResNet Bearing Wear</span>
            </button>
            <button
              onClick={() => { setSelectedCamera('cam-03'); setActiveMode('defect'); }}
              className={`py-2 px-3 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center space-x-1.5 ${
                selectedCamera === 'cam-03' 
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="truncate">Autoencoder Surface Defect</span>
            </button>
          </div>

          {/* Simulated Active Frame Display Canvas */}
          <div className="relative aspect-video bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center">
            {/* Visual scanlines & technical grids representing AI analysis */}
            <div className="absolute inset-0 bg-radial-gradient from-transparent to-[#0D0D0D] pointer-events-none z-10" />
            <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none" />

            {/* Simulated Live Render Screen (Camera and Bounding Boxes) */}
            {selectedCamera === 'cam-01' ? (
              // Crack Detection (YOLOv8-Seg)
              <div className="w-full h-full relative flex flex-col justify-between p-6">
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Dynamic workpiece cylinder with high-fidelity cracks */}
                  <svg className="w-2/3 h-2/3 text-slate-400/25" viewBox="0 0 120 80" fill="none" stroke="currentColor" strokeWidth="1.5">
                    {/* Workpiece Cylinder Outline */}
                    <rect x="20" y="25" width="80" height="30" rx="3" fill="#18181B" />
                    <ellipse cx="20" cy="40" rx="4" ry="15" fill="#27272A" />
                    <ellipse cx="100" cy="40" rx="4" ry="15" fill="#3F3F46" />
                    
                    {/* Crack paths highlighted in red */}
                    <path d="M 45 35 L 50 42 L 48 48 L 54 51" stroke="#F43F5E" strokeWidth="1" strokeLinecap="round" className="animate-pulse" />
                    <path d="M 75 28 L 78 33 L 74 38 L 81 44" stroke="#F43F5E" strokeWidth="0.8" strokeLinecap="round" />
                  </svg>
                </div>

                {/* Bounding box segment overlay - Crack 1 */}
                <div className="absolute left-[34%] top-[30%] w-[18%] h-[32%] border-2 border-rose-500 rounded flex flex-col justify-start p-1 bg-rose-500/10 font-mono text-[9px] text-rose-400 font-bold">
                  <span>CRACK_01 {confidenceThreshold + 4}%</span>
                  <span className="text-[7px] text-white font-normal">AREA: 18.5mm²</span>
                </div>

                {/* Bounding box segment overlay - Crack 2 */}
                <div className="absolute left-[58%] top-[25%] w-[15%] h-[28%] border border-rose-400 rounded flex flex-col justify-start p-1 bg-rose-500/5 font-mono text-[8px] text-rose-300 font-bold">
                  <span>CRACK_02 {confidenceThreshold - 3}%</span>
                  <span className="text-[6px] text-slate-300 font-normal">MINOR FISSURE</span>
                </div>

                {/* Overlay Text Details */}
                <div className="flex justify-between items-start w-full relative z-10">
                  <span className="bg-slate-900/80 border border-slate-800 text-white font-mono text-[10px] px-2.5 py-1 rounded-lg flex items-center space-x-1.5 backdrop-blur-xs">
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                    <span>FEED // YOLOv8_CRACK_SEGMENTER</span>
                  </span>
                  <span className="bg-slate-900/80 border border-slate-800 text-slate-400 font-mono text-[10px] px-2.5 py-1 rounded-lg backdrop-blur-xs">
                    FPS: 45.2 • MAP: 0.884
                  </span>
                </div>

                <div className="flex justify-between items-end w-full relative z-10">
                  <div className="bg-slate-900/80 border border-slate-800 text-slate-400 font-mono text-[9px] p-2 rounded-lg space-y-1 backdrop-blur-xs">
                    <p>• INSTANCES DETECTED: 2 ALLOY FRACTURES</p>
                    <p>• MIN COCO IoU THRESHOLD: <span className="text-rose-400 font-bold">0.50</span></p>
                  </div>
                  <span className="bg-rose-500 text-white font-mono font-bold text-[9px] px-2.5 py-1 rounded-lg animate-pulse uppercase">
                    ACTIVE ALLOY INTRUSION ALARM
                  </span>
                </div>
              </div>
            ) : selectedCamera === 'cam-02' ? (
              // Bearing Wear (ResNet-50)
              <div className="w-full h-full relative flex flex-col justify-between p-6">
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Dynamic bearing ring representation */}
                  <svg className="w-2/3 h-2/3 text-slate-400/25" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5">
                    {/* Bearing races */}
                    <circle cx="50" cy="50" r="38" stroke="#3F3F46" strokeWidth="4" />
                    <circle cx="50" cy="50" r="26" stroke="#27272A" strokeWidth="3" />
                    
                    {/* Rolling balls */}
                    <circle cx="50" cy="18" r="5" fill="#71717A" />
                    <circle cx="50" cy="82" r="5" fill="#71717A" />
                    <circle cx="18" cy="50" r="5" fill="#71717A" />
                    <circle cx="82" cy="50" r="5" fill="#71717A" />
                    
                    {/* Highlighted frictional chattering groove in yellow */}
                    <path d="M 45 18 A 32 32 0 0 1 55 18" stroke="#F59E0B" strokeWidth="2.5" className="animate-pulse" />
                    <path d="M 18 45 A 32 32 0 0 1 18 55" stroke="#F59E0B" strokeWidth="2" />
                  </svg>
                </div>

                {/* Wear Bounding Box */}
                <div className="absolute left-[38%] top-[10%] w-[24%] h-[20%] border-2 border-yellow-500 rounded flex flex-col justify-start p-1 bg-yellow-500/10 font-mono text-[9px] text-yellow-400 font-bold">
                  <span>BALL_WEAR_A {confidenceThreshold + 8}%</span>
                  <span className="text-[7px] text-white font-normal">FRICTION INDEX: 4.8</span>
                </div>

                {/* Overlay Text Details */}
                <div className="flex justify-between items-start w-full relative z-10">
                  <span className="bg-slate-900/80 border border-slate-800 text-white font-mono text-[10px] px-2.5 py-1 rounded-lg flex items-center space-x-1.5 backdrop-blur-xs">
                    <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-ping" />
                    <span>FEED // RESNET_BEARING_WEAR_CO-PILOT</span>
                  </span>
                  <span className="bg-slate-900/80 border border-slate-800 text-slate-400 font-mono text-[10px] px-2.5 py-1 rounded-lg backdrop-blur-xs">
                    FPS: 30.00 • DEVIATION: 1.8%
                  </span>
                </div>

                <div className="flex justify-between items-end w-full relative z-10">
                  <div className="bg-slate-900/80 border border-slate-800 text-slate-400 font-mono text-[9px] p-2 rounded-lg space-y-1 backdrop-blur-xs">
                    <p>• SPINDLE ASSEMBLY: AXIAL HARMONIC FLUTTER</p>
                    <p>• WEAR CLASSIFICATION: <span className="text-yellow-400 font-bold">CLASS II SCORING</span></p>
                  </div>
                  <span className="bg-yellow-500 text-black font-mono font-bold text-[9px] px-2.5 py-1 rounded-lg animate-pulse uppercase">
                    ALERT: CORE BEARING FLUTTER
                  </span>
                </div>
              </div>
            ) : (
              // Surface Defect (Deep Autoencoder)
              <div className="w-full h-full relative flex flex-col justify-between p-6">
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Topographic Surface Grid representation */}
                  <svg className="w-4/5 h-2/3 text-indigo-500/15" viewBox="0 0 100 50">
                    <path d="M 10 40 Q 20 10, 30 35 T 50 15 T 70 42 T 90 20" stroke="currentColor" strokeWidth="1" fill="none" />
                    <path d="M 10 35 Q 20 18, 30 25 T 50 25 T 70 30 T 90 35" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2,2" fill="none" />
                    {/* Anomaly hot spot reconstruction error in orange-red */}
                    <circle cx="50" cy="20" r="8" fill="#EF4444" fillOpacity="0.25" className="animate-pulse" />
                    <path d="M 45 20 Q 50 5, 55 20" stroke="#EF4444" strokeWidth="1.5" />
                  </svg>
                </div>

                {/* Reconstruction Anomaly Box */}
                <div className="absolute left-[38%] top-[25%] w-[32%] h-[35%] border-2 border-indigo-500 rounded flex flex-col justify-start p-1 bg-indigo-500/10 font-mono text-[9px] text-indigo-400 font-bold">
                  <span>MSE_OUT_OF_BOUNDS 91%</span>
                  <span className="text-[7px] text-white font-normal">RECONSTRUCT MSE: 0.145</span>
                </div>

                {/* Overlay Text Details */}
                <div className="flex justify-between items-start w-full relative z-10">
                  <span className="bg-slate-900/80 border border-slate-800 text-white font-mono text-[10px] px-2.5 py-1 rounded-lg flex items-center space-x-1.5 backdrop-blur-xs">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
                    <span>FEED // DEEP_AUTOENCODER_PROFILER</span>
                  </span>
                  <span className="bg-slate-900/80 border border-slate-800 text-slate-400 font-mono text-[10px] px-2.5 py-1 rounded-lg backdrop-blur-xs">
                    FPS: 28.5 • LATENCY: 12.5ms
                  </span>
                </div>

                <div className="flex justify-between items-end w-full relative z-10">
                  <div className="bg-slate-900/80 border border-slate-800 text-slate-400 font-mono text-[9px] p-2 rounded-lg space-y-1 backdrop-blur-xs">
                    <p>• BED SURFACE FINISH: OUT OF ISO-4287 TOLERANCE</p>
                    <p>• RECONSTRUCTION ERROR: <span className="text-indigo-400 font-bold">REJECT THRESHOLD MET</span></p>
                  </div>
                  <span className="bg-indigo-500 text-white font-mono font-bold text-[9px] px-2.5 py-1 rounded-lg uppercase">
                    PROFILER RUNNING
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Real-time statistics summaries */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="premium-card p-5 border border-slate-800 rounded-2xl bg-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">CV MODEL SPEED</span>
            <div className="flex justify-between items-end mt-2">
              <span className="text-2xl font-bold text-white font-mono">8.4 ms</span>
              <span className="text-emerald-400 text-xs font-mono font-semibold">119 FPS Peak</span>
            </div>
            <p className="text-[10px] text-slate-400/60 mt-1.5">Edge compiled TensorRT inference latencies.</p>
          </div>

          <div className="premium-card p-5 border border-slate-800 rounded-2xl bg-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">TOTAL VIOLATIONS (WEEK)</span>
            <div className="flex justify-between items-end mt-2">
              <span className="text-2xl font-bold text-white font-mono">{violationsCount + 4}</span>
              <span className="text-emerald-400 text-xs font-mono font-semibold">-45% Improvement</span>
            </div>
            <p className="text-[10px] text-slate-400/60 mt-1.5">Worker entry in safety buffer corridors.</p>
          </div>

          <div className="premium-card p-5 border border-slate-800 rounded-2xl bg-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">DEFECTS PREVENTED</span>
            <div className="flex justify-between items-end mt-2">
              <span className="text-2xl font-bold text-white font-mono">{defectsCount + 12}</span>
              <span className="text-emerald-400 text-xs font-mono font-semibold">Saved $15,400</span>
            </div>
            <p className="text-[10px] text-slate-400/60 mt-1.5">Pre-release alloy fracture filtration.</p>
          </div>
        </div>
      </div>

      {/* Side Control Panels & Activity Logs */}
      <div className="lg:col-span-4 flex flex-col space-y-6">
        {/* Detection Parameter Panel */}
        <div className="premium-card p-6 border border-slate-800 rounded-2xl bg-slate-800 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h4 className="text-sm font-bold text-white flex items-center space-x-1.5">
              <Sliders className="w-4 h-4 text-slate-400" />
              <span>YOLO Threshold Knobs</span>
            </h4>
            <p className="text-xs text-slate-400">Tune visual confidence & thresholding rules.</p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono font-semibold">
                <span className="text-white">Minimum Object Confidence</span>
                <span className="text-white">{confidenceThreshold}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={99}
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(parseInt(e.target.value))}
                className="w-full accent-white bg-slate-900 h-1 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-[9px] text-slate-400/60 font-mono">Filters out low-probability false-positive detection frames.</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono font-semibold">
                <span className="text-white">Safety Zone Buffer Distance</span>
                <span className="text-white">1.8 meters</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={0.1}
                defaultValue={1.8}
                className="w-full accent-white bg-slate-900 h-1 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-[9px] text-slate-400/60 font-mono">Dynamic boundary corridor around high-speed spindle chucks.</span>
            </div>

            <div className="pt-2">
              <span className="text-xs font-bold text-white block mb-2">Hardware Accelerator</span>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center font-mono text-[10px]">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <div>
                    <p className="text-white font-bold">NVIDIA Jetson Orin</p>
                    <p className="text-slate-400/60">FP16 CUDA Stream Active</p>
                  </div>
                </div>
                <span className="bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded font-bold uppercase text-[9px]">
                  ON-DEVICE
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Detection Alerts Log */}
        <div className="premium-card p-6 border border-slate-800 rounded-2xl bg-slate-800 flex-1 flex flex-col justify-between space-y-4">
          <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center space-x-1.5">
                <ShieldAlert className="w-4 h-4 text-white" />
                <span>AI Vision Ingestion Stream</span>
              </h4>
              <p className="text-xs text-slate-400">Live safety violations & workpiece micro-defects.</p>
            </div>
            <button
              onClick={handleDownloadReport}
              className="text-slate-400 hover:text-white p-1 rounded-md bg-slate-900 border border-slate-800"
              title="Download Logs Text"
            >
              <FileDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[300px] space-y-3 pr-1.5 custom-scrollbar font-mono text-xs">
            <AnimatePresence initial={false}>
              {logs.map((log) => {
                const isViolation = log.type === 'safety_violation';
                const isDefect = log.type === 'defect_detected';
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`p-3 rounded-xl border text-[11px] leading-relaxed transition-all relative ${
                      log.resolved
                        ? 'bg-slate-900/30 border-slate-800 text-slate-400/60'
                        : isViolation
                        ? 'bg-red-950/20 border-red-900/30 text-red-200'
                        : isDefect
                        ? 'bg-yellow-950/20 border-yellow-900/30 text-yellow-200'
                        : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold uppercase tracking-wider text-[9px] flex items-center space-x-1">
                        {isViolation ? (
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping mr-1" />
                        ) : isDefect ? (
                          <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-ping mr-1" />
                        ) : (
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1" />
                        )}
                        {log.type.replace('_', ' ')}
                      </span>
                      <span className="text-slate-400/60 text-[9px]">{log.timestamp}</span>
                    </div>

                    <p className="text-[10px] leading-normal">{log.description}</p>
                    <p className="text-[9px] text-slate-400/50 mt-1 font-sans">{log.camera}</p>

                    {!log.resolved && (
                      <button
                        onClick={() => handleResolve(log.id)}
                        className="absolute right-2 bottom-2 bg-white/10 hover:bg-white/20 text-white border border-slate-800 px-2 py-0.5 rounded text-[8px] font-sans font-bold flex items-center space-x-0.5 transition-all"
                      >
                        <Check className="w-2.5 h-2.5" />
                        <span>RESOLVE</span>
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
