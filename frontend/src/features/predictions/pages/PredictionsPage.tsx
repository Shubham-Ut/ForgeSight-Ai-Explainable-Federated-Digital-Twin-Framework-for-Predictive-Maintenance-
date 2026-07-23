import React, { useState } from 'react';
import { Search, Download, MoreHorizontal } from 'lucide-react';
import { cn } from '@shared/utils/cn';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar,
} from 'recharts';

const MODEL_COMPARISON = [
  { name: 'Stacking Ensemble', mae: 8.9, rmse: 11.2, r2: 0.957, inference: '18.4ms', memory: '280 MB', best: true },
  { name: 'Temporal Transformer', mae: 9.8, rmse: 12.1, r2: 0.948, inference: '8.2ms', memory: '140 MB', best: false },
  { name: 'Informer Attention', mae: 10.1, rmse: 12.4, r2: 0.944, inference: '6.5ms', memory: '95 MB', best: false },
  { name: 'PINN', mae: 10.4, rmse: 12.8, r2: 0.941, inference: '4.8ms', memory: '35 MB', best: false },
  { name: 'LSTM RNN', mae: 10.4, rmse: 14.2, r2: 0.950, inference: '12ms', memory: '48 MB', best: false },
  { name: 'XGBoost', mae: 11.2, rmse: 15.8, r2: 0.940, inference: '4ms', memory: '12 MB', best: false },
  { name: 'LightGBM', mae: 12.1, rmse: 16.5, r2: 0.930, inference: '3ms', memory: '8 MB', best: false },
  { name: 'CatBoost', mae: 11.8, rmse: 16.1, r2: 0.930, inference: '6ms', memory: '15 MB', best: false },
];

const MACHINES = [
  { id: 'CNC-001', name: 'CNC Mill Alpha', factory: 'Munich Plant', rul: 312, health: 91, trend: 'stable', status: 'healthy', confidence: 94 },
  { id: 'CNC-002', name: 'CNC Mill Beta', factory: 'Munich Plant', rul: 89, health: 67, trend: 'declining', status: 'warning', confidence: 87 },
  { id: 'CNC-003', name: 'Lathe Station 1', factory: 'Stuttgart', rul: 24, health: 43, trend: 'critical', status: 'critical', confidence: 96 },
  { id: 'CNC-004', name: 'Assembly Robot A', factory: 'Hamburg', rul: 418, health: 88, trend: 'stable', status: 'healthy', confidence: 91 },
  { id: 'CNC-005', name: 'Press Unit 2', factory: 'Leipzig', rul: 156, health: 75, trend: 'declining', status: 'warning', confidence: 82 },
  { id: 'CNC-006', name: 'Drill Station X', factory: 'Stuttgart', rul: 521, health: 94, trend: 'stable', status: 'healthy', confidence: 97 },
];

const genRULCurve = (initialRUL: number, health: number) =>
  Array.from({ length: 21 }, (_, i) => {
    const d = (100 - health) / 100;
    const rul = Math.max(0, initialRUL - i * (initialRUL / 20) * (1 + d * 0.3));
    return { cycle: i * 10, predicted: Math.round(rul) };
  });

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card p-2.5 shadow-md text-[12px]">
      <p className="text-gray-400 mb-1">Cycle {label}</p>
      <p className="font-medium text-gray-900">RUL: {payload[0]?.value}h</p>
    </div>
  );
};

export default function PredictionsPage() {
  const [selectedMachine, setSelectedMachine] = useState(MACHINES[2]);
  const [activeTab, setActiveTab] = useState<'rul' | 'models' | 'train' | 'upload'>('rul');
  const [search, setSearch] = useState('');
  const [uploadResults, setUploadResults] = useState<any[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const [trainingFile, setTrainingFile] = useState<File | null>(null);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainError, setTrainError] = useState<string | null>(null);
  const [trainingResults, setTrainingResults] = useState<any | null>(null);

  const handleModelTrain = async () => {
    if (!trainingFile) return;
    setIsTraining(true);
    setTrainError(null);
    const formData = new FormData();
    formData.append('file', trainingFile);
    
    try {
      const response = await fetch('/api/v1/predictions/train', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setTrainingResults(data.data);
      } else {
        setTrainError(data.detail || data.message || 'AutoML training failed.');
      }
    } catch (err: any) {
      setTrainError(err.message || 'Error connecting to AutoML server.');
    } finally {
      setIsTraining(false);
    }
  };

  const handleCsvUpload = async (file: File) => {
    setUploadError(null);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('/api/v1/predictions/upload-csv', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        const camelCased = data.data.map((row: any) => ({
          rowIndex: row.row_index,
          inputs: {
            speed: row.inputs.speed,
            torque: row.inputs.torque,
            wear: row.inputs.wear,
            temperature: row.inputs.temperature,
            vibration: row.inputs.vibration
          },
          rfRul: row.rf_rul,
          xgbRul: row.xgb_rul,
          anomalyScore: row.anomaly_score,
          status: row.status,
          faultType: row.fault_type
        }));
        setUploadResults(camelCased);
      } else {
        setUploadError(data.message || 'Error processing CSV file.');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Error connecting to prediction server.');
    }
  };

  const filtered = MACHINES.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) || m.factory.toLowerCase().includes(search.toLowerCase())
  );

  const rulCurve = genRULCurve(selectedMachine.rul * 3, selectedMachine.health);

  function healthBarColor(h: number) {
    return h > 75 ? 'bg-emerald-500' : h > 50 ? 'bg-amber-400' : 'bg-red-500';
  }
  function statusBadge(s: string) {
    return s === 'healthy' ? 'badge-healthy' : s === 'warning' ? 'badge-warning' : 'badge-critical';
  }

  return (
    <div className="page-container">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="page-title">Predictions</h1>
          <p className="page-subtitle">Remaining Useful Life forecasting across all monitored machines</p>
        </div>
        <button className="btn-secondary btn-sm">
          <Download size={13} strokeWidth={2} /> Export
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
        {(['rul', 'models', 'train', 'upload'] as const).map(id => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors duration-150 cursor-pointer',
              activeTab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900',
            )}
          >
            {id === 'rul' ? 'RUL Forecast' : id === 'models' ? 'Model Comparison' : id === 'train' ? 'Upload & Train' : 'Batch Upload Test'}
          </button>
        ))}
      </div>

      {activeTab === 'rul' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Machine list */}
          <div className="card overflow-hidden lg:col-span-2">
            <div className="px-4 py-3.5 border-b border-gray-100">
              <div className="relative">
                <Search size={14} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search machines…" value={search} onChange={e => setSearch(e.target.value)} className="forge-input search-input" />
              </div>
            </div>
            <div className="divide-y divide-gray-50 overflow-y-auto max-h-[480px] scrollbar-thin">
              {filtered.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMachine(m)}
                  className={cn(
                    'w-full text-left px-4 py-3.5 transition-colors duration-150',
                    selectedMachine.id === m.id ? 'bg-blue-50 border-r-2 border-blue-600' : 'hover:bg-gray-50',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={cn('text-[13px] font-medium', selectedMachine.id === m.id ? 'text-blue-600' : 'text-gray-900')}>{m.name}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{m.factory} · {m.id}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn('text-[13px] font-semibold tabular-nums', m.rul < 50 ? 'text-red-600' : m.rul < 150 ? 'text-amber-600' : 'text-gray-900')}>{m.rul}h</p>
                      <p className={cn('text-[10px] font-medium', m.trend === 'critical' ? 'text-red-500' : m.trend === 'declining' ? 'text-amber-500' : 'text-emerald-600')}>{m.trend}</p>
                    </div>
                  </div>
                  <div className="mt-2.5 progress-track">
                    <div className={cn('progress-fill', healthBarColor(m.health))} style={{ width: `${m.health}%` }} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Detail */}
          <div className="lg:col-span-3 space-y-4">
            <div className="card p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-[16px] font-semibold text-gray-900">{selectedMachine.name}</h2>
                  <p className="text-[12px] text-gray-500 mt-0.5">{selectedMachine.factory} · {selectedMachine.id}</p>
                </div>
                <span className={statusBadge(selectedMachine.status)}>{selectedMachine.status.charAt(0).toUpperCase() + selectedMachine.status.slice(1)}</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Remaining Life', value: `${selectedMachine.rul}h`, urgent: selectedMachine.rul < 50 },
                  { label: 'Health Score', value: `${selectedMachine.health}%`, urgent: selectedMachine.health < 50 },
                  { label: 'Confidence', value: `${selectedMachine.confidence}%`, urgent: false },
                ].map(s => (
                  <div key={s.label} className="p-3 bg-gray-50 rounded-md">
                    <p className="text-[11px] text-gray-400">{s.label}</p>
                    <p className={cn('text-xl font-semibold mt-1 tabular-nums', s.urgent ? 'text-red-600' : 'text-gray-900')}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="section-title">RUL Degradation Curve</p>
                  <p className="text-[12px] text-gray-500 mt-0.5">Ensemble prediction with confidence interval</p>
                </div>
                <span className="badge-neutral text-[10px]">Stacking Ensemble</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={rulCurve} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="cycle" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine y={50} stroke="#FECACA" strokeDasharray="4 2" strokeWidth={1} />
                  <Line type="monotone" dataKey="predicted" stroke="#2563EB" strokeWidth={2} dot={false} name="RUL" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'models' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="section-title">Model Performance Comparison</p>
              <p className="text-[12px] text-gray-500 mt-0.5">Evaluated on NASA C-MAPSS FD001 test set</p>
            </div>
            <span className="badge-neutral">8 models</span>
          </div>
          <div className="table-wrapper">
            <table className="forge-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th className="text-right">MAE</th>
                  <th className="text-right">RMSE</th>
                  <th className="text-right">R²</th>
                  <th className="text-right">Inference</th>
                  <th className="text-right">Memory</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {MODEL_COMPARISON.map(m => (
                  <tr key={m.name} className={m.best ? 'bg-blue-50/50' : ''}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{m.name}</span>
                        {m.best && <span className="badge-info text-[10px]">Best</span>}
                      </div>
                    </td>
                    <td className="text-right"><span className={cn('tabular-nums font-medium', m.best && 'text-blue-600')}>{m.mae}</span></td>
                    <td className="text-right"><span className={cn('tabular-nums font-medium', m.best && 'text-blue-600')}>{m.rmse}</span></td>
                    <td className="text-right"><span className={cn('tabular-nums font-medium', m.best && 'text-blue-600')}>{m.r2}</span></td>
                    <td className="text-right"><span className="tabular-nums text-gray-500 font-mono text-[12px]">{m.inference}</span></td>
                    <td className="text-right"><span className="text-gray-500 text-[12px]">{m.memory}</span></td>
                    <td><button className="btn-icon"><MoreHorizontal size={14} strokeWidth={1.75} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-[12px] text-gray-400">MAE and RMSE in cycles. Lower is better. R² closer to 1 is better.</p>
          </div>
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="space-y-6">
          <div className="card p-6 bg-white space-y-4">
            <div>
              <p className="section-title">Batch Telemetry Predictor</p>
              <p className="text-[12px] text-gray-500 mt-0.5">Upload a CSV file containing machine sensor readings to run parallel inference on all models.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start text-left">
              {/* Uploader Dropzone */}
              <div 
                className="border-2 border-dashed border-gray-200 hover:border-blue-500 transition-all rounded-lg p-8 text-center flex flex-col items-center justify-center cursor-pointer min-h-[180px]"
                onClick={() => document.getElementById('csv-file-input')?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleCsvUpload(file);
                }}
              >
                <input 
                  type="file" 
                  id="csv-file-input" 
                  accept=".csv" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCsvUpload(file);
                  }}
                />
                <Download size={24} className="text-gray-400 mb-2 rotate-180" />
                <p className="text-[13px] font-medium text-gray-700">Drag & drop your sensor CSV here, or <span className="text-blue-600">browse files</span></p>
                <p className="text-[11px] text-gray-400 mt-1">Supports standard CSV format up to 5MB</p>
              </div>

              {/* CSV Schema helper */}
              <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg space-y-2 text-xs">
                <p className="font-semibold text-gray-700 uppercase tracking-wider text-[10px]">Expected CSV Header & Columns</p>
                <p className="text-gray-500">Your CSV file must contain the following sensor values (excluding headers):</p>
                <div className="bg-white p-2.5 rounded font-mono text-[11px] border border-gray-100 text-gray-800 leading-relaxed overflow-x-auto">
                  Speed, Torque, Wear, Temperature, Vibration<br />
                  1500, 42.5, 12.0, 25.4, 1.45<br />
                  1800, 52.0, 16.5, 68.2, 5.23
                </div>
                <button 
                  onClick={() => {
                    const csvContent = "data:text/csv;charset=utf-8,Speed,Torque,Wear,Temperature,Vibration\n1500,42.5,12.0,25.4,1.45\n1800,52.0,16.5,68.2,5.23\n3200,60.5,120.0,78.5,6.34\n";
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", "forgesight_telemetry_template.csv");
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 mt-1 cursor-pointer bg-transparent border-none text-left"
                >
                  Download template CSV
                </button>
              </div>
            </div>

            {uploadError && (
              <p className="text-xs text-red-500 bg-red-50 p-2.5 border border-red-100 rounded-md text-left">{uploadError}</p>
            )}
          </div>

          {/* Results table */}
          {uploadResults.length > 0 && (
            <div className="card overflow-hidden bg-white">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="section-title">Batch Processing Results</p>
                  <p className="text-[12px] text-gray-500 mt-0.5">Calculated model outputs for {uploadResults.length} telemetry records.</p>
                </div>
                <span className="badge-healthy font-mono">{uploadResults.length} records</span>
              </div>
              <div className="table-wrapper">
                <table className="forge-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Speed / Torque</th>
                      <th>Temp / Vib / Wear</th>
                      <th className="text-right">RF Fail Prob</th>
                      <th className="text-right">XGB RUL</th>
                      <th className="text-right">LSTM Anomaly</th>
                      <th>Status</th>
                      <th>Fault Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadResults.map((row) => (
                      <tr key={row.rowIndex}>
                        <td className="font-mono text-[11px] text-gray-400">{row.rowIndex}</td>
                        <td>
                          <div className="text-[12px] font-medium text-gray-800">
                            {row.inputs.speed.toFixed(0)} rpm / {row.inputs.torque.toFixed(1)} Nm
                          </div>
                        </td>
                        <td>
                          <div className="text-[11px] text-gray-500">
                            {row.inputs.temperature.toFixed(1)}°C / {row.inputs.vibration.toFixed(2)} mm/s / {row.inputs.wear.toFixed(1)}m
                          </div>
                        </td>
                        <td className="text-right"><span className="tabular-nums font-semibold font-mono text-[13px] text-gray-800">{(row.rfRul * 100).toFixed(1)}%</span></td>
                        <td className="text-right"><span className="tabular-nums font-semibold font-mono text-[13px] text-blue-600">{row.xgbRul}h</span></td>
                        <td className="text-right">
                          <span className={cn(
                            "tabular-nums font-mono font-medium",
                            row.anomalyScore > 0.7 ? "text-red-600 font-bold" : row.anomalyScore > 0.4 ? "text-amber-500" : "text-emerald-600"
                          )}>
                            {row.anomalyScore.toFixed(3)}
                          </span>
                        </td>
                        <td>
                          <span className={cn(
                            row.status === 'Critical' ? 'badge-critical' : row.status === 'Warning' ? 'badge-warning' : 'badge-healthy'
                          )}>
                            {row.status}
                          </span>
                        </td>
                        <td>
                          <span className={cn(
                            "text-[12px] font-medium",
                            row.faultType !== 'None' ? 'text-red-600 font-semibold' : 'text-gray-500'
                          )}>
                            {row.faultType}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'train' && (
        <div className="space-y-6">
          <div className="card p-6 bg-white space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="section-title">AutoML Custom Model Training</p>
                <p className="text-[12px] text-gray-500 mt-0.5">Upload a historical machine runs dataset to train custom XGBoost and Random Forest regressors dynamically.</p>
              </div>
              {trainingResults && (
                <span className="badge-healthy text-[10px] font-bold">Custom Model Active</span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Training File selector */}
              <div className="space-y-3 w-full">
                <div 
                  className="border-2 border-dashed border-gray-200 hover:border-blue-500 transition-all rounded-lg p-6 text-center flex flex-col items-center justify-center cursor-pointer min-h-[160px]"
                  onClick={() => document.getElementById('train-file-input')?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) {
                      setTrainingFile(file);
                      setTrainingResults(null);
                    }
                  }}
                >
                  <input 
                    type="file" 
                    id="train-file-input" 
                    accept=".csv" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setTrainingFile(file);
                        setTrainingResults(null);
                      }
                    }}
                  />
                  <Download size={24} className="text-gray-400 mb-2 rotate-180" />
                  {trainingFile ? (
                    <div className="space-y-1">
                      <p className="text-[13px] font-medium text-emerald-600">Selected: {trainingFile.name}</p>
                      <p className="text-[11px] text-gray-400">Size: {(trainingFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-[13px] font-medium text-gray-700">Drag & drop your training CSV, or <span className="text-blue-600">browse files</span></p>
                      <p className="text-[11px] text-gray-400 mt-1">Expected columns: Speed, Torque, Wear, Temperature, Vibration, RUL</p>
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    disabled={!trainingFile || isTraining}
                    onClick={handleModelTrain}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white text-[13px] font-medium py-2.5 rounded-md transition-all cursor-pointer text-center"
                  >
                    {isTraining ? 'Training estimators in background...' : 'Train Custom Models'}
                  </button>
                  {trainingFile && (
                    <button 
                      onClick={() => {
                        setTrainingFile(null);
                        setTrainingResults(null);
                      }}
                      className="btn-secondary text-[12px] px-3 rounded-md cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Helper */}
              <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg space-y-2 text-xs text-left w-full">
                <p className="font-semibold text-gray-700 uppercase tracking-wider text-[10px]">AutoML Pipeline Description</p>
                <p className="text-gray-500">Upon clicking Train, the FastAPI backend parses the CSV data, performs an 80/20 train-validation split, and fits regressors in real-time. A tree SHAP explainer then generates feature attributions relative to custom baselines.</p>
                <button 
                  onClick={() => {
                    const csvContent = "data:text/csv;charset=utf-8,Speed,Torque,Wear,Temperature,Vibration,RUL\n1500,42.5,12.0,25.4,1.45,191\n1800,52.0,16.5,68.2,5.23,121\n3200,60.5,120.0,78.5,6.34,42\n2800,55.0,90.0,72.4,4.52,89\n1400,38.0,8.0,24.2,1.21,195\n1600,45.0,24.0,30.5,2.15,160\n2000,50.0,35.0,45.2,3.12,142\n2200,53.5,60.0,55.4,4.21,110\n2400,56.0,82.0,63.5,4.98,95\n3000,58.0,110.0,75.2,5.92,55\n";
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", "forgesight_training_template.csv");
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 mt-1 cursor-pointer bg-transparent border-none text-left"
                >
                  Download sample training CSV
                </button>
              </div>
            </div>

            {trainError && (
              <p className="text-xs text-red-500 bg-red-50 p-2.5 border border-red-100 rounded-md text-left">{trainError}</p>
            )}
          </div>

          {/* Results section */}
          {trainingResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Training metrics comparison */}
                <div className="card p-5 bg-white space-y-4">
                  <p className="section-title">Validation Performance Metrics</p>
                  <div className="grid grid-cols-2 gap-4">
                    {/* XGBoost */}
                    <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-lg space-y-2">
                      <p className="font-semibold text-blue-700 uppercase tracking-wider text-[10px]">XGBoost Regressor</p>
                      <div className="space-y-1.5 text-xs text-left font-mono">
                        <div className="flex justify-between">
                          <span className="text-gray-500">MAE:</span>
                          <span className="font-bold text-gray-800">{trainingResults.metrics.xgb.mae} cycles</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">RMSE:</span>
                          <span className="font-bold text-gray-800">{trainingResults.metrics.xgb.rmse} cycles</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">R² Score:</span>
                          <span className="font-bold text-blue-600">{trainingResults.metrics.xgb.r2}</span>
                        </div>
                      </div>
                    </div>

                    {/* Random Forest */}
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                      <p className="font-semibold text-gray-700 uppercase tracking-wider text-[10px]">Random Forest</p>
                      <div className="space-y-1.5 text-xs text-left font-mono">
                        <div className="flex justify-between">
                          <span className="text-gray-500">MAE:</span>
                          <span className="font-bold text-gray-800">{trainingResults.metrics.rf.mae} cycles</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">RMSE:</span>
                          <span className="font-bold text-gray-800">{trainingResults.metrics.rf.rmse} cycles</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">R² Score:</span>
                          <span className="font-bold text-gray-800">{trainingResults.metrics.rf.r2}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-50 text-emerald-800 p-3 rounded-lg border border-emerald-100 text-xs flex items-center gap-2 text-left">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping flex-shrink-0" />
                    <p>Model loaded into system memory. All subsequent forecasts across the application will use this estimator.</p>
                  </div>
                </div>

                {/* Dynamic SHAP Explanability */}
                <div className="card p-5 bg-white space-y-4">
                  <div className="text-left">
                    <p className="section-title">Dynamic SHAP Feature Attributions</p>
                    <p className="text-[12px] text-gray-500 mt-0.5">Calculated using TreeSHAP on your custom fitted XGBoost model.</p>
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart
                      data={[...trainingResults.shap_values].sort((a, b) => b.shap - a.shap)}
                      layout="vertical"
                      margin={{ top: 0, right: 20, left: 100, bottom: 0 }}
                      barSize={12}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                      <YAxis type="category" dataKey="feature" tick={{ fontSize: 10, fill: '#6B7280' }} width={95} />
                      <Tooltip formatter={(value: any) => [`${value} cycles`, 'SHAP']} />
                      <Bar dataKey="shap" fill="#2563EB" radius={[0, 2, 2, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Outcome Schema Legend Table */}
              <div className="card p-6 bg-white space-y-4 text-left">
                <div>
                  <p className="section-title">Platform Diagnostic Outcome Legend</p>
                  <p className="text-[12px] text-gray-500 mt-0.5">System capability mappings activated upon model deployment.</p>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider w-[220px]">Output</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100 font-medium">
                      <tr>
                        <td className="px-4 py-2.5 font-semibold text-blue-600">Predicted RUL</td>
                        <td className="px-4 py-2.5 text-gray-600">Estimate remaining life</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 font-semibold text-blue-600">Health Score (%)</td>
                        <td className="px-4 py-2.5 text-gray-600">Overall condition</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 font-semibold text-blue-600">Machine Status</td>
                        <td className="px-4 py-2.5 text-gray-600">Healthy / Warning / Critical</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 font-semibold text-blue-600">Failure Risk</td>
                        <td className="px-4 py-2.5 text-gray-600">Low / Medium / High</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 font-semibold text-blue-600">Anomaly Score</td>
                        <td className="px-4 py-2.5 text-gray-600">Detect unusual behavior</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 font-semibold text-blue-600">Fault Type</td>
                        <td className="px-4 py-2.5 text-gray-600">Identify likely fault</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 font-semibold text-blue-600">Component Health</td>
                        <td className="px-4 py-2.5 text-gray-600">Health of bearing, motor, cooling, etc.</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 font-semibold text-blue-600">SHAP Explanation</td>
                        <td className="px-4 py-2.5 text-gray-600">Explain the prediction</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 font-semibold text-blue-600">Maintenance Recommendation</td>
                        <td className="px-4 py-2.5 text-gray-600">Suggest next actions</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 font-semibold text-blue-600">AI Maintenance Report</td>
                        <td className="px-4 py-2.5 text-gray-600">Human-readable summary</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 font-semibold text-blue-600">Digital Twin Visualization</td>
                        <td className="px-4 py-2.5 text-gray-600">Show fault location visually</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 font-semibold text-blue-600">Dashboard Alerts</td>
                        <td className="px-4 py-2.5 text-gray-600">Notify operators of important events</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
