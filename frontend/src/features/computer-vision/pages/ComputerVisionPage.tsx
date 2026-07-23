import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  ShieldAlert, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  Sliders, 
  Video, 
  FileDown, 
  Play, 
  Pause, 
  Cpu
} from 'lucide-react';
import { cn } from '@shared/utils/cn';

interface DetectionEvent {
  id: string;
  timestamp: string;
  type: 'safety_violation' | 'defect_detected' | 'healthy_check';
  camera: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  resolved: boolean;
}

export default function ComputerVisionPage() {
  const [selectedCamera, setSelectedCamera] = useState<string>('cam-01');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(75);
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

  const [violationsCount, setViolationsCount] = useState<number>(1);
  const [defectsCount, setDefectsCount] = useState<number>(1);

  // Sync with real-time frame progression
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
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
    <div className="page-container">
      {/* Selector/Header Strip */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 rounded-lg bg-white border border-gray-200 mb-6">
        <div className="space-y-0.5">
          <h2 className="text-[16px] font-semibold text-gray-900 flex items-center gap-2">
            <Video className="w-4 h-4 text-blue-600" />
            <span>Industrial YOLOv8 & ResNet Video Feeds</span>
          </h2>
          <p className="text-[12px] text-gray-500">
            Real-time deep learning computer vision monitoring high-speed lathe spin beds and worker clearance rings.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Visual Workspace Feed */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
          <div className="card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-gray-100 pb-4 gap-4">
              <div>
                <h3 className="text-[14px] font-semibold text-gray-900 flex items-center space-x-2">
                  <Camera className="w-4 h-4 text-blue-600" />
                  <span>Real-Time Neural Camera Uplink</span>
                </h3>
              </div>

              {/* Quick Action Controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={cn(
                    "btn-secondary btn-sm flex items-center gap-1.5",
                    isPlaying 
                      ? 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200' 
                      : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200'
                  )}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlaying ? 'PAUSE LIVE' : 'PLAY LIVE'}</span>
                </button>

                <button
                  onClick={() => setLogs(prev => prev.slice(0, 1))}
                  className="btn-secondary btn-sm p-1.5"
                  title="Clear Logs History"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Camera Selection Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-gray-50 rounded-lg border border-gray-200">
              <button
                onClick={() => setSelectedCamera('cam-01')}
                className={cn(
                  "py-2 px-3 rounded-md text-[12px] font-medium transition-all flex items-center justify-center space-x-1.5 cursor-pointer",
                  selectedCamera === 'cam-01' 
                    ? 'bg-white text-blue-600 shadow-sm border border-gray-200' 
                    : 'text-gray-500 hover:text-gray-900'
                )}
              >
                <Camera className="w-3.5 h-3.5 text-blue-600" />
                <span className="truncate">YOLOv8 Crack Segmenter</span>
              </button>
              <button
                onClick={() => setSelectedCamera('cam-02')}
                className={cn(
                  "py-2 px-3 rounded-md text-[12px] font-medium transition-all flex items-center justify-center space-x-1.5 cursor-pointer",
                  selectedCamera === 'cam-02' 
                    ? 'bg-white text-blue-600 shadow-sm border border-gray-200' 
                    : 'text-gray-500 hover:text-gray-900'
                )}
              >
                <Camera className="w-3.5 h-3.5 text-blue-600" />
                <span className="truncate">ResNet Bearing Wear</span>
              </button>
              <button
                onClick={() => setSelectedCamera('cam-03')}
                className={cn(
                  "py-2 px-3 rounded-md text-[12px] font-medium transition-all flex items-center justify-center space-x-1.5 cursor-pointer",
                  selectedCamera === 'cam-03' 
                    ? 'bg-white text-blue-600 shadow-sm border border-gray-200' 
                    : 'text-gray-500 hover:text-gray-900'
                )}
              >
                <Camera className="w-3.5 h-3.5 text-blue-600" />
                <span className="truncate">Autoencoder Surface Defect</span>
              </button>
            </div>

            {/* Simulated Frame Display Canvas */}
            <div className="relative aspect-video bg-gray-900 border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center min-h-[360px]">
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent pointer-events-none z-10" />
              
              {selectedCamera === 'cam-01' ? (
                // Crack Detection
                <div className="w-full h-full relative flex flex-col justify-between p-6 z-20">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-2/3 h-2/3 text-gray-700" viewBox="0 0 120 80" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="20" y="25" width="80" height="30" rx="3" fill="#1e293b" />
                      <ellipse cx="20" cy="40" rx="4" ry="15" fill="#334155" />
                      <ellipse cx="100" cy="40" rx="4" ry="15" fill="#475569" />
                      <path d="M 45 35 L 50 42 L 48 48 L 54 51" stroke="#ef4444" strokeWidth="1" strokeLinecap="round" className="animate-pulse" />
                      <path d="M 75 28 L 78 33 L 74 38 L 81 44" stroke="#ef4444" strokeWidth="0.8" strokeLinecap="round" />
                    </svg>
                  </div>

                  <div className="absolute left-[34%] top-[30%] w-[20%] h-[34%] border-2 border-red-500 rounded flex flex-col justify-start p-1 bg-red-500/10 font-mono text-[9px] text-red-400 font-bold">
                    <span>CRACK_01 {confidenceThreshold + 4}%</span>
                    <span className="text-[7px] text-white font-normal">AREA: 18.5mm²</span>
                  </div>

                  <div className="absolute left-[58%] top-[25%] w-[16%] h-[30%] border border-red-400 rounded flex flex-col justify-start p-1 bg-red-500/5 font-mono text-[8px] text-red-300 font-bold">
                    <span>CRACK_02 {confidenceThreshold - 3}%</span>
                    <span className="text-[6px] text-gray-300 font-normal">MINOR FISSURE</span>
                  </div>

                  <div className="flex justify-between items-start w-full">
                    <span className="bg-gray-950/80 border border-gray-800 text-white font-mono text-[10px] px-2.5 py-1 rounded-lg flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                      <span>FEED // YOLOv8_CRACK_SEGMENTER</span>
                    </span>
                    <span className="bg-gray-950/80 border border-gray-800 text-gray-450 font-mono text-[10px] px-2.5 py-1 rounded-lg">
                      FPS: 45.2 • MAP: 0.884
                    </span>
                  </div>

                  <div className="flex justify-between items-end w-full">
                    <div className="bg-gray-950/80 border border-gray-800 text-gray-400 font-mono text-[9px] p-2 rounded-lg space-y-1">
                      <p>• INSTANCES DETECTED: 2 ALLOY FRACTURES</p>
                      <p>• MIN COCO IoU THRESHOLD: <span className="text-red-400 font-bold">0.50</span></p>
                    </div>
                    <span className="bg-red-500 text-white font-mono font-bold text-[9px] px-2.5 py-1 rounded-lg animate-pulse uppercase">
                      ACTIVE ALLOY INTRUSION ALARM
                    </span>
                  </div>
                </div>
              ) : selectedCamera === 'cam-02' ? (
                // Bearing Wear
                <div className="w-full h-full relative flex flex-col justify-between p-6 z-20">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-2/3 h-2/3 text-gray-750" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="50" cy="50" r="38" stroke="#334155" strokeWidth="4" />
                      <circle cx="50" cy="50" r="26" stroke="#1e293b" strokeWidth="3" />
                      <circle cx="50" cy="18" r="5" fill="#64748b" />
                      <circle cx="50" cy="82" r="5" fill="#64748b" />
                      <circle cx="18" cy="50" r="5" fill="#64748b" />
                      <circle cx="82" cy="50" r="5" fill="#64748b" />
                      <path d="M 45 18 A 32 32 0 0 1 55 18" stroke="#d97706" strokeWidth="2.5" className="animate-pulse" />
                      <path d="M 18 45 A 32 32 0 0 1 18 55" stroke="#d97706" strokeWidth="2" />
                    </svg>
                  </div>

                  <div className="absolute left-[38%] top-[10%] w-[25%] h-[22%] border-2 border-yellow-500 rounded flex flex-col justify-start p-1 bg-yellow-500/10 font-mono text-[9px] text-yellow-400 font-bold">
                    <span>BALL_WEAR_A {confidenceThreshold + 8}%</span>
                    <span className="text-[7px] text-white font-normal">FRICTION INDEX: 4.8</span>
                  </div>

                  <div className="flex justify-between items-start w-full">
                    <span className="bg-gray-950/80 border border-gray-800 text-white font-mono text-[10px] px-2.5 py-1 rounded-lg flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-ping" />
                      <span>FEED // RESNET_BEARING_WEAR</span>
                    </span>
                    <span className="bg-gray-950/80 border border-gray-800 text-gray-400 font-mono text-[10px] px-2.5 py-1 rounded-lg">
                      FPS: 30.00 • DEVIATION: 1.8%
                    </span>
                  </div>

                  <div className="flex justify-between items-end w-full">
                    <div className="bg-gray-950/80 border border-gray-800 text-gray-400 font-mono text-[9px] p-2 rounded-lg space-y-1">
                      <p>• SPINDLE ASSEMBLY: AXIAL HARMONIC FLUTTER</p>
                      <p>• WEAR CLASSIFICATION: <span className="text-yellow-400 font-bold">CLASS II SCORING</span></p>
                    </div>
                    <span className="bg-yellow-500 text-black font-mono font-bold text-[9px] px-2.5 py-1 rounded-lg animate-pulse uppercase">
                      ALERT: CORE BEARING FLUTTER
                    </span>
                  </div>
                </div>
              ) : (
                // Surface Defect
                <div className="w-full h-full relative flex flex-col justify-between p-6 z-20">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-4/5 h-2/3 text-blue-500/10" viewBox="0 0 100 50">
                      <path d="M 10 40 Q 20 10, 30 35 T 50 15 T 70 42 T 90 20" stroke="currentColor" strokeWidth="1" fill="none" />
                      <path d="M 10 35 Q 20 18, 30 25 T 50 25 T 70 30 T 90 35" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2,2" fill="none" />
                      <circle cx="50" cy="20" r="8" fill="#ef4444" fillOpacity="0.25" className="animate-pulse" />
                      <path d="M 45 20 Q 50 5, 55 20" stroke="#ef4444" strokeWidth="1.5" />
                    </svg>
                  </div>

                  <div className="absolute left-[38%] top-[25%] w-[34%] h-[38%] border-2 border-blue-500 rounded flex flex-col justify-start p-1 bg-blue-500/10 font-mono text-[9px] text-blue-450 font-bold">
                    <span>MSE_OUT_OF_BOUNDS 91%</span>
                    <span className="text-[7px] text-white font-normal">RECONSTRUCT MSE: 0.145</span>
                  </div>

                  <div className="flex justify-between items-start w-full">
                    <span className="bg-gray-950/80 border border-gray-800 text-white font-mono text-[10px] px-2.5 py-1 rounded-lg flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                      <span>FEED // DEEP_AUTOENCODER_PROFILER</span>
                    </span>
                    <span className="bg-gray-950/80 border border-gray-800 text-gray-400 font-mono text-[10px] px-2.5 py-1 rounded-lg">
                      FPS: 28.5 • LATENCY: 12.5ms
                    </span>
                  </div>

                  <div className="flex justify-between items-end w-full">
                    <div className="bg-gray-950/80 border border-gray-800 text-gray-450 font-mono text-[9px] p-2 rounded-lg space-y-1">
                      <p>• BED SURFACE FINISH: OUT OF ISO-4287 TOLERANCE</p>
                      <p>• RECONSTRUCTION ERROR: <span className="text-blue-500 font-bold">REJECT THRESHOLD MET</span></p>
                    </div>
                    <span className="bg-blue-600 text-white font-mono font-bold text-[9px] px-2.5 py-1 rounded-lg uppercase">
                      PROFILER RUNNING
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Real-time statistics summaries */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">CV MODEL SPEED</span>
                <div className="flex justify-between items-end mt-2">
                  <span className="text-xl font-bold text-gray-900 font-mono">8.4 ms</span>
                  <span className="text-emerald-600 text-xs font-semibold">119 FPS Peak</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1.5">Edge compiled TensorRT inference latencies.</p>
              </div>

              <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">TOTAL VIOLATIONS (WEEK)</span>
                <div className="flex justify-between items-end mt-2">
                  <span className="text-xl font-bold text-gray-900 font-mono">{violationsCount + 4}</span>
                  <span className="text-emerald-600 text-xs font-semibold">-45% Improvement</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1.5">Worker entry in safety buffer corridors.</p>
              </div>

              <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">DEFECTS PREVENTED</span>
                <div className="flex justify-between items-end mt-2">
                  <span className="text-xl font-bold text-gray-900 font-mono">{defectsCount + 12}</span>
                  <span className="text-emerald-600 text-xs font-semibold">Saved $15,400</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1.5">Pre-release alloy fracture filtration.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Side Control Panels & Activity Logs */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          {/* Detection Parameter Panel */}
          <div className="card p-5 space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h4 className="text-[13px] font-semibold text-gray-900 flex items-center space-x-1.5">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span>YOLO Threshold Control</span>
              </h4>
              <p className="text-[11px] text-gray-400">Tune visual confidence & thresholding rules.</p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-gray-600">Minimum Object Confidence</span>
                  <span className="text-gray-900 font-semibold">{confidenceThreshold}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={99}
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(parseInt(e.target.value))}
                  className="w-full accent-blue-600 bg-gray-200 h-1 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-[10px] text-gray-400 block leading-tight">Filters out low-probability false-positive detection frames.</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-gray-600">Safety Zone Buffer Distance</span>
                  <span className="text-gray-900 font-semibold">1.8 meters</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={0.1}
                  defaultValue={1.8}
                  className="w-full accent-blue-600 bg-gray-200 h-1 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-[10px] text-gray-400 block leading-tight">Dynamic boundary corridor around high-speed spindle chucks.</span>
              </div>

              <div className="pt-2">
                <span className="text-xs font-semibold text-gray-900 block mb-2">Hardware Accelerator</span>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center text-[11px]">
                  <div className="flex items-center space-x-2">
                    <Cpu className="w-4 h-4 text-emerald-600 animate-pulse" />
                    <div>
                      <p className="text-gray-900 font-semibold">NVIDIA Jetson Orin</p>
                      <p className="text-gray-550">FP16 CUDA Stream Active</p>
                    </div>
                  </div>
                  <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded font-semibold text-[9px] uppercase">
                    ON-DEVICE
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Detection Alerts Log */}
          <div className="card p-5 flex flex-col justify-between space-y-4 min-h-[300px]">
            <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
              <div>
                <h4 className="text-[13px] font-semibold text-gray-900 flex items-center space-x-1.5">
                  <ShieldAlert className="w-4 h-4 text-blue-600" />
                  <span>AI Vision Ingestion Stream</span>
                </h4>
                <p className="text-[11px] text-gray-400">Live safety violations & workpiece micro-defects.</p>
              </div>
              <button
                onClick={handleDownloadReport}
                className="btn-icon w-7 h-7"
                title="Download Logs Text"
              >
                <FileDown className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[300px] space-y-3 pr-1.5 font-mono text-[11px] scrollbar-thin">
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
                      className={cn(
                        "p-3 rounded-lg border text-[11px] leading-relaxed transition-all relative",
                        log.resolved
                          ? 'bg-gray-50/50 border-gray-200 text-gray-400'
                          : isViolation
                          ? 'bg-red-50 border-red-200 text-red-800'
                          : isDefect
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-white border border-gray-200 text-gray-700'
                      )}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold uppercase tracking-wider text-[9px] flex items-center">
                          {isViolation ? (
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse mr-1" />
                          ) : isDefect ? (
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse mr-1" />
                          ) : (
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1" />
                          )}
                          {log.type.replace('_', ' ')}
                        </span>
                        <span className="text-gray-400 text-[9px]">{log.timestamp}</span>
                      </div>

                      <p className="text-[10px] leading-normal">{log.description}</p>
                      <p className="text-[9px] text-gray-400 mt-1 font-sans">{log.camera}</p>

                      {!log.resolved && (
                        <button
                          onClick={() => handleResolve(log.id)}
                          className="absolute right-2 bottom-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-2 py-0.5 rounded text-[8px] font-sans font-bold flex items-center space-x-0.5 transition-all cursor-pointer shadow-2xs"
                        >
                          <Check className="w-2.5 h-2.5 text-emerald-600" />
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
    </div>
  );
}
