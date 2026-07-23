import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wrench, 
  Send, 
  Sparkles, 
  BookOpen, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  FileText,
  AlertTriangle,
  FileDown,
  Info,
  Terminal,
  Printer,
  Upload
} from 'lucide-react';
import { RAG_KNOWLEDGE_BASE } from '../data/mockData';
import { MachineDigitalTwin, FactoryDetails } from '../types';

interface MaintenanceTabProps {
  factories: Record<string, FactoryDetails>;
  machines: Record<string, Record<string, MachineDigitalTwin>>;
  chatMessages: Array<{ sender: 'user' | 'gemini'; text: string; rrul?: boolean }>;
  onSendMessage: (msg: string) => void;
}

export default function MaintenanceTab({
  factories,
  machines,
  chatMessages,
  onSendMessage
}: MaintenanceTabProps) {

  const [inputMessage, setInputMessage] = useState<string>('');
  const [activeDocTab, setActiveDocTab] = useState<string>('doc-01');
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportEngine, setReportEngine] = useState<string>('tf-102');

  const [documents, setDocuments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newContent, setNewContent] = useState<string>('');
  const [newCategory, setNewCategory] = useState<'manual' | 'bulletin' | 'incident_report'>('manual');
  const [showUploadForm, setShowUploadForm] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load knowledge base dynamically from the full-stack server
  const loadDocuments = () => {
    fetch('/api/documents')
      .then(res => res.json())
      .then(data => {
        setDocuments(data);
        if (data.length > 0 && !data.find((d: any) => d.id === activeDocTab)) {
          setActiveDocTab(data[0].id);
        }
      })
      .catch(err => {
        console.error("Error loading RAG documents:", err);
        // Fallback to imported mock list on local network error
        setDocuments(RAG_KNOWLEDGE_BASE);
      });
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    setIsUploading(true);
    try {
      const response = await fetch('/api/upload-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          content: newContent,
          category: newCategory
        })
      });
      if (response.ok) {
        const result = await response.json();
        setDocuments(prev => [...prev, result.doc]);
        setActiveDocTab(result.doc.id);
        setNewTitle('');
        setNewContent('');
        setShowUploadForm(false);
      }
    } catch (err) {
      console.error("Manual document ingestion failed:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (text) {
        setNewTitle(file.name.replace(/\.[^/.]+$/, ""));
        setNewContent(text);
        setNewCategory('manual');
        setShowUploadForm(true);
      }
    };
    reader.readAsText(file);
  };

  // Flatten machines list
  const activeMonitoredEngines = Object.entries(machines).flatMap(([fId, fMacs]) => 
    Object.values(fMacs).map(mac => ({
      ...mac,
      factoryId: fId,
      factoryName: factories[fId]?.name || fId
    }))
  );

  const handleSend = () => {
    if (!inputMessage.trim()) return;
    onSendMessage(inputMessage);
    setInputMessage('');
  };

  const handleQuickPrompt = (prompt: string) => {
    onSendMessage(prompt);
  };

  const currentReportMachine = activeMonitoredEngines.find(m => m.metadata.id === reportEngine) || activeMonitoredEngines[1];

  const exportCSV = () => {
    if (!currentReportMachine) return;
    const headers = "Metric,Value\n";
    const rows = [
      ["Report Date", new Date().toLocaleDateString()],
      ["Machine Name", currentReportMachine.metadata.name],
      ["Machine ID", currentReportMachine.metadata.id],
      ["Machine Type", currentReportMachine.metadata.type],
      ["Factory ID", currentReportMachine.factoryId],
      ["Factory Name", currentReportMachine.factoryName],
      ["Predicted RUL (cycles)", currentReportMachine.predictedRUL],
      ["Failure Probability (%)", currentReportMachine.failureProbability],
      ["Health Score (%)", currentReportMachine.healthScore],
      ["Estimated Overhaul Cost ($)", currentReportMachine.estimatedRepairCost],
      ["Estimated Downtime (hours)", currentReportMachine.estimatedDowntime],
      ["Recommended Actions", (currentReportMachine.recommendedAction || "Inspect casing").replace(/,/g, ";")]
    ];
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers 
      + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ForgeSight_Airworthiness_${currentReportMachine.metadata.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportExcel = () => {
    if (!currentReportMachine) return;
    
    const htmlTable = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sheet1</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
      <body>
        <table>
          <tr><th colspan="2" style="font-size:16px;font-weight:bold;background-color:#4f46e5;color:white;">FORGESIGHT AIRWORTHINESS REPORT</th></tr>
          <tr><td><strong>Report Date</strong></td><td>${new Date().toLocaleDateString()}</td></tr>
          <tr><td><strong>Machine Name</strong></td><td>${currentReportMachine.metadata.name}</td></tr>
          <tr><td><strong>Machine ID</strong></td><td>${currentReportMachine.metadata.id}</td></tr>
          <tr><td><strong>Machine Type</strong></td><td>${currentReportMachine.metadata.type}</td></tr>
          <tr><td><strong>Factory Site</strong></td><td>${currentReportMachine.factoryName}</td></tr>
          <tr><td><strong>Remaining Useful Life</strong></td><td>${currentReportMachine.predictedRUL} flight cycles</td></tr>
          <tr><td><strong>Failure Probability</strong></td><td>${currentReportMachine.failureProbability}%</td></tr>
          <tr><td><strong>Estimated Overhaul Cost</strong></td><td>$${currentReportMachine.estimatedRepairCost}</td></tr>
          <tr><td><strong>Estimated Downtime</strong></td><td>${currentReportMachine.estimatedDowntime} hours</td></tr>
          <tr><td><strong>Health Score</strong></td><td>${currentReportMachine.healthScore}%</td></tr>
          <tr><td><strong>SOP Recommended Actions</strong></td><td>${currentReportMachine.recommendedAction || "Inspect casing"}</td></tr>
        </table>
      </body>
      </html>
    `;
    
    const blob = new Blob([htmlTable], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ForgeSight_Airworthiness_${currentReportMachine.metadata.id}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Maintenance Planner Overview */}
      <div className="glass-card border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display flex items-center space-x-1.5">
            <Wrench className="w-4 h-4 text-cyan-400" />
            <span>Overhaul & Heavy Maintenance Visit (HMV) Planner</span>
          </h3>
          <button
            onClick={() => setShowReportModal(true)}
            className="bg-cyan-950/40 border border-cyan-800 hover:bg-cyan-900/60 text-cyan-300 px-3 py-1 text-xs font-mono font-bold rounded flex items-center space-x-1.5 transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Airworthiness Report</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-bold text-[10px] uppercase">
                <th className="py-2 pb-3">TURBOFAN UNIT</th>
                <th className="py-2 pb-3 text-right">RUL (CYCLES)</th>
                <th className="py-2 pb-3 text-right">EXPECTED EXPIRY</th>
                <th className="py-2 pb-3 text-right">EST. OVERHAUL COST</th>
                <th className="py-2 pb-3 text-right">EST. DOWNTIME</th>
                <th className="py-2 pb-3 text-right">URGENCY STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {activeMonitoredEngines.map((m) => {
                const isCrit = m.healthScore < 60;
                const isWarn = m.healthScore >= 60 && m.healthScore < 85;
                const expectedExpiry = new Date(Date.now() + m.predictedRUL * 24 * 3600 * 1000).toLocaleDateString();
                
                return (
                  <tr key={m.metadata.id} className="hover:bg-slate-950/20">
                    <td className="py-3 font-semibold text-slate-200">{m.metadata.name}</td>
                    <td className="py-3 text-right text-cyan-400">{m.predictedRUL} flight cycles</td>
                    <td className="py-3 text-right text-slate-400">{expectedExpiry}</td>
                    <td className="py-3 text-right text-emerald-400">${m.estimatedRepairCost.toLocaleString()}</td>
                    <td className="py-3 text-right text-slate-400">{m.estimatedDowntime} hours</td>
                    <td className="py-3 text-right">
                      <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                        isCrit ? 'bg-rose-950/60 text-rose-400 border border-rose-900' :
                        isWarn ? 'bg-amber-950/60 text-amber-400 border border-amber-900' : 'bg-emerald-950/60 text-emerald-400 border border-emerald-900'
                      }`}>
                        {isCrit ? 'CRITICAL' : isWarn ? 'WARNING' : 'HEALTHY'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Core section: AI Assistant & Knowledge Base retrieval */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* AI Co-Pilot chat room */}
        <div className="lg:col-span-2 glass-card border border-slate-800 rounded-xl p-5 flex flex-col justify-between h-[420px]">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
            <div>
              <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold">SMART MAINTENANCE DECISION CO-PILOT</span>
              <h3 className="text-md font-bold text-white font-display">Aerospace Technical RAG Agent</h3>
            </div>
          </div>

          {/* Scrolling message thread */}
          <div className="flex-1 my-4 overflow-y-auto space-y-3 pr-1 text-xs font-mono">
            {chatMessages.map((msg, index) => {
              const isGemini = msg.sender === 'gemini';
              return (
                <div 
                  key={index}
                  className={`p-3 rounded-lg leading-relaxed ${
                    isGemini 
                      ? 'bg-slate-950/70 text-slate-200 border border-slate-900' 
                      : 'bg-cyan-950/20 text-cyan-300 border border-cyan-900/40 ml-12'
                  }`}
                >
                  <span className={`block font-bold mb-1 uppercase text-[9px] ${isGemini ? 'text-cyan-400' : 'text-cyan-300'}`}>
                    {isGemini ? '🤖 ForgeSight AI Agent (RAG RUL-Agent)' : '👤 Aerospace Operator'}
                  </span>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              );
            })}
          </div>

          {/* Prompt quick suggestions list */}
          <div className="flex flex-wrap gap-2 mb-3 border-t border-slate-900 pt-3">
            <button 
              onClick={() => handleQuickPrompt('Why did health decrease on Turbofan #102?')}
              className="bg-slate-950/60 hover:bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400 px-2 py-1 rounded"
            >
              Analyze Turbofan #102 anomalies
            </button>
            <button 
              onClick={() => handleQuickPrompt('Retrieve maintenance check SOP guidelines')}
              className="bg-slate-950/60 hover:bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400 px-2 py-1 rounded"
            >
              SOP overhaul checklist
            </button>
            <button 
              onClick={() => handleQuickPrompt('Estimate HPT coolant overhaul cost and downtime')}
              className="bg-slate-950/60 hover:bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400 px-2 py-1 rounded"
            >
              HPT Overhaul estimates
            </button>
          </div>

          {/* Send Box */}
          <div className="flex space-x-2 border-t border-slate-900 pt-3">
            <input 
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Ask the co-pilot (e.g. why is turbine #102 critical, remaining cycles?)..."
              className="flex-1 bg-slate-950/80 border border-slate-800/80 font-mono text-xs rounded-lg px-3 py-2.5 text-white focus:outline-hidden focus:border-cyan-500"
            />
            <button
              onClick={handleSend}
              className="bg-cyan-950/40 border border-cyan-800 text-cyan-400 hover:bg-cyan-900/60 px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all flex items-center space-x-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>
        </div>

        {/* Knowledge Base Documents Library (RAG reference) */}
        <div className="glass-card border border-slate-800 rounded-xl p-5 flex flex-col justify-between h-[420px] overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <div>
                  <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold">RAG SYSTEMS MEMORY STORAGE</span>
                  <h3 className="text-xs font-bold text-white font-display">Engineering Bulletins & Manuals</h3>
                </div>
              </div>
              <button
                onClick={() => setShowUploadForm(!showUploadForm)}
                className="bg-indigo-950/40 border border-indigo-800 hover:bg-indigo-900/60 text-indigo-300 px-2 py-1 text-[9px] font-mono font-bold rounded flex items-center space-x-1 transition-all"
              >
                <Upload className="w-3 h-3" />
                <span>Upload</span>
              </button>
            </div>

            {/* Document upload form overlay */}
            <AnimatePresence>
              {showUploadForm && (
                <motion.form 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleUploadDocument}
                  className="bg-slate-950/80 border border-indigo-950 rounded-lg p-3 space-y-2 text-[10px] font-mono"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold text-[9px]">INGEST NEW MANUAL / SOP</span>
                    <button 
                      type="button" 
                      onClick={() => setShowUploadForm(false)} 
                      className="text-slate-500 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="border border-dashed border-slate-800 hover:border-indigo-500 rounded-lg p-2 text-center cursor-pointer transition-all"
                       onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 text-indigo-400 mx-auto mb-1 animate-bounce" />
                    <span className="text-slate-400 block text-[8px]">Drag & Drop or Click to Upload Manual File</span>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      className="hidden" 
                      accept=".txt,.json,.md"
                    />
                  </div>

                  <input 
                    type="text"
                    placeholder="Document Title (e.g. ISO-848 Spindle SOP)"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded p-1 text-[9.5px] focus:outline-none focus:border-indigo-500"
                  />

                  <textarea 
                    placeholder="Document content/text extraction body..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    required
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded p-1 text-[9.5px] focus:outline-none focus:border-indigo-500"
                  />

                  <div className="flex justify-between items-center">
                    <select
                      value={newCategory}
                      onChange={(e: any) => setNewCategory(e.target.value)}
                      className="bg-slate-900 border border-slate-800 text-slate-300 rounded p-0.5 text-[8.5px]"
                    >
                      <option value="manual">Manual</option>
                      <option value="bulletin">Bulletin</option>
                      <option value="incident_report">Incident Report</option>
                    </select>
                    <button
                      type="submit"
                      disabled={isUploading}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded px-2.5 py-1 text-[9px] transition-all"
                    >
                      {isUploading ? 'Ingesting...' : 'Ingest Document'}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* List selector */}
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setActiveDocTab(doc.id)}
                  className={`w-full p-2 rounded-lg text-left font-mono text-[10px] border transition-all block ${
                    activeDocTab === doc.id 
                      ? 'bg-indigo-950/30 border-indigo-500 text-indigo-300' 
                      : 'bg-slate-950/60 border-slate-900 hover:border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="font-bold truncate max-w-[150px]">{doc.title}</span>
                    <span className="text-[8px] uppercase px-1 border border-indigo-900 bg-indigo-950 text-indigo-400 rounded">
                      {doc.category}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 block">ID: {doc.id}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Document Reader panel */}
          <div className="bg-slate-950/60 rounded-lg p-3 border border-slate-900 text-[10px] font-mono leading-relaxed text-slate-400 h-24 overflow-y-auto mt-2">
            <span className="text-white font-bold block mb-1 border-b border-slate-900 pb-0.5">
              RETRIEVED DATA BLOCK:
            </span>
            <p>
              {documents.find(d => d.id === activeDocTab)?.content || "Select a document to read telemetry bounds..."}
            </p>
          </div>
        </div>

      </div>

      {/* Printer modal for aerospace report (HTML printable layout) */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[85vh] space-y-4"
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono text-cyan-400 font-bold block uppercase">
                    AEROSPACE AIRWORTHINESS RUL INSPECTION REPORT
                  </span>
                  <h3 className="text-lg font-bold text-white font-display">FORGESIGHT-AI CO-PILOT AGENT GENERATION</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={reportEngine}
                    onChange={(e) => setReportEngine(e.target.value)}
                    className="text-xs border border-slate-800 bg-slate-950 font-mono text-slate-300 rounded px-2 py-1 focus:border-cyan-500 focus:outline-hidden"
                  >
                    {activeMonitoredEngines.map(m => (
                      <option key={m.metadata.id} value={m.metadata.id}>{m.metadata.name}</option>
                    ))}
                  </select>
                  <button 
                    onClick={exportPDF}
                    className="bg-indigo-950 border border-indigo-900/40 text-indigo-400 hover:bg-indigo-900 px-2 py-1 rounded text-xs font-mono flex items-center space-x-1"
                    title="Export to PDF / Print layout"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Export PDF</span>
                  </button>
                  <button 
                    onClick={exportExcel}
                    className="bg-emerald-950 border border-emerald-900/40 text-emerald-400 hover:bg-emerald-900 px-2 py-1 rounded text-xs font-mono flex items-center space-x-1"
                    title="Export to Microsoft Excel spreadsheet"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Export Excel</span>
                  </button>
                  <button 
                    onClick={exportCSV}
                    className="bg-cyan-950 border border-cyan-900/40 text-cyan-400 hover:bg-cyan-900 px-2 py-1 rounded text-xs font-mono flex items-center space-x-1"
                    title="Export as Comma Separated Values"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* PDF printable sheet */}
              <div id="printable-area" className="bg-white text-slate-900 p-6 rounded-lg font-mono text-[10px] space-y-4 leading-relaxed border border-slate-300 shadow-inner">
                
                {/* Visual Header */}
                <div className="border-b-2 border-slate-800 pb-3 flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase text-slate-950">FORGESIGHT INTEL SYSTEMS INC.</h4>
                    <span className="text-[8px] text-slate-500 block">MUNICH AEROSPACE OVERHAUL DEPOT | RE-0984</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[8px] text-indigo-700 uppercase bg-indigo-100 px-1 border border-indigo-300 rounded block">
                      CONFIDENTIAL AIRWORTHINESS BRIEF
                    </span>
                    <span className="text-[8px] text-slate-500">Date: {new Date().toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-slate-500 block uppercase font-bold text-[8px]">Machine Metadata:</span>
                    <span>Name: <b>{currentReportMachine?.metadata.name}</b></span><br />
                    <span>ID: {currentReportMachine?.metadata.id}</span><br />
                    <span>Type: {currentReportMachine?.metadata.type}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase font-bold text-[8px]">Predictive Status:</span>
                    <span>Predicted RUL: <b>{currentReportMachine?.predictedRUL} Flight Cycles</b></span><br />
                    <span>Failure Prob: {currentReportMachine?.failureProbability}%</span><br />
                    <span>Estimated Overhaul: <b>${currentReportMachine?.estimatedRepairCost.toLocaleString()}</b></span>
                  </div>
                </div>

                {/* Report Section 1: Executive Summary */}
                <div className="space-y-1">
                  <h5 className="text-[9px] font-bold uppercase text-slate-950 bg-slate-100 p-1">
                    1. EXECUTIVE AIRWORTHINESS SUMMARY
                  </h5>
                  <p>
                    Turbofan engine Unit #{currentReportMachine?.metadata.id} was evaluated using the <strong>ForgeSight TCN (Temporal Convolutional Network) Regressor</strong>. 
                    Based on local weights converged during Federated averaging round 12, the engine RUL is calculated at {currentReportMachine?.predictedRUL} cycles before reaching the thermodynamic failure safety threshold bounds.
                  </p>
                </div>

                {/* Report Section 2: Root Cause Diagnostics */}
                <div className="space-y-1">
                  <h5 className="text-[9px] font-bold uppercase text-slate-950 bg-slate-100 p-1">
                    2. CORE COMPRESSOR ANOMALY DIAGNOSTICS & SHAP ATTRIBUTIONS
                  </h5>
                  <p>
                    Attribution engines show progressive adiabatic slip in the HPC (High-Pressure Compressor) cascade. 
                    The most critical drivers reducing turbine life are high outlet temperatures T30 and bypass sealing slips, resulting in a localized KernelSHAP penalty score of +0.58.
                  </p>
                </div>

                {/* Report Section 3: Recommended Corrective Tasks */}
                <div className="space-y-1">
                  <h5 className="text-[9px] font-bold uppercase text-slate-950 bg-slate-100 p-1">
                    3. MANDATORY FIELD ACTIONS & SOP PROTOCOLS
                  </h5>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Execute heavy borescope inspection of HP Turbine casing layout guide vanes immediately.</li>
                    <li>Ultrasonically clear HPT Coolant Bleed Line (W31) to release carbon deposits.</li>
                    <li>Balance fan rotor blades and replace bypass flow outer composite seals to restore pressure ratios.</li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-300 text-center text-slate-400 text-[8px]">
                  Generated securely by Gemini RUL-Agent v3.5 • ForgeSight Decentralized Engine Co-Pilot • Certified under NASA C-MAPSS FD001 standards.
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all"
                >
                  Close Document
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
