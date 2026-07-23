import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, 
  Terminal, 
  Sparkles, 
  Network, 
  Play, 
  RotateCw, 
  ShieldAlert, 
  MessageSquare,
  Cpu, 
  DollarSign, 
  Wrench, 
  Settings,
  HelpCircle,
  FileText,
  Activity,
  CheckCircle
} from 'lucide-react';

interface AgentDetails {
  id: string;
  name: string;
  role: string;
  specialty: string;
  status: 'idle' | 'processing' | 'active';
  color: string;
}

const INDUSTRIAL_AGENTS: AgentDetails[] = [
  {
    id: 'predict',
    name: 'Predictive RUL Agent',
    role: 'RUL Forecasting',
    specialty: 'Calculates high-capacity regression decay curves and epistemic uncertainty intervals.',
    status: 'idle',
    color: '#0ea5e9'
  },
  {
    id: 'diagnose',
    name: 'Anomaly Diagnostic Agent',
    role: 'Anomaly Detection',
    specialty: 'Monitors deep Autoencoder reconstruction error deviations & triggers Page-Hinkley cumulative sum alarms.',
    status: 'idle',
    color: '#06b6d4'
  },
  {
    id: 'causal',
    name: 'Bayesian Causal Agent',
    role: 'Causal Root Cause Analysis',
    specialty: 'Traverses Directed Acyclic Graphs (DAGs) and computes backdoor intervention scores.',
    status: 'idle',
    color: '#10b981'
  },
  {
    id: 'cost',
    name: 'Multi-Objective Cost Optimizer',
    role: 'Financial Operations',
    specialty: 'Balances maintenance budgets, operational downtime costs, and energy-saving metrics.',
    status: 'idle',
    color: '#f59e0b'
  },
  {
    id: 'planner',
    name: 'Maintenance Scheduler Agent',
    role: 'LOTO Optimization',
    specialty: 'Schedules Lockout-Tagout (LOTO) intervals aligning with production shift boundaries.',
    status: 'idle',
    color: '#8b5cf6'
  },
  {
    id: 'sustain',
    name: 'Sustainability Auditor',
    role: 'Carbon Auditing',
    specialty: 'Models energy efficiency (kWh) and carbon footprint reductions (kg CO2e) of maintenance plans.',
    status: 'idle',
    color: '#10b981'
  },
  {
    id: 'federated',
    name: 'Federated aggregator Client',
    role: 'Privacy-Preserving Sync',
    specialty: 'Manages Differential Privacy parameter weights and encrypts local neural network matrices.',
    status: 'idle',
    color: '#3b82f6'
  },
  {
    id: 'sop',
    name: 'SOP Generator Agent',
    role: 'SOP & Manual Writing',
    specialty: 'Compiles technical diagnostics into printable standard operating procedures.',
    status: 'idle',
    color: '#ec4899'
  },
  {
    id: 'llm',
    name: 'Technical Advisory Agent',
    role: 'Expert System Briefing',
    specialty: 'Evaluates gas turbine thermal slips and generates natural language engineering briefings.',
    status: 'idle',
    color: '#14b8a6'
  },
  {
    id: 'dt',
    name: 'Digital Twin Controller',
    role: 'Schematic Rendering',
    specialty: 'Controls animated state colors, component meshes, and physical cross-section SVG mappings.',
    status: 'idle',
    color: '#6366f1'
  }
];

interface ChatMessage {
  senderId: string;
  senderName: string;
  color: string;
  message: string;
  timestamp: string;
}

const CONVERSATION_LOGS = [
  {
    senderId: 'diagnose',
    senderName: 'Anomaly Diagnostic Agent',
    color: '#06b6d4',
    message: 'ALERT: Radial vibration in Workstation CNC #802 has spiked to 6.8 mm/s. Autoencoder reconstruction MSE exceeds nominal threshold (Reconstruction Error: 4.85).'
  },
  {
    senderId: 'predict',
    senderName: 'Predictive RUL Agent',
    color: '#0ea5e9',
    message: 'Evaluating remaining useful life. Temporal Transformer estimates RUL at 11 production hours. Decline is exponential, moving average cycle health score has dropped to 52%.'
  },
  {
    senderId: 'causal',
    senderName: 'Bayesian Causal Agent',
    color: '#10b981',
    message: 'Running Bayesian causal traversal. Conditioning on Spindle Temperature and Oil Viscosity. Primary Root Cause identified as Spindle Motor Axis Bearing Wear with 78.4% posterior probability (β_c = 0.68).'
  },
  {
    senderId: 'sustain',
    senderName: 'Sustainability Auditor',
    color: '#10b981',
    message: 'Evaluating carbon footprint. Continuing to run in degraded state spikes energy consumption by 25.4% (approx. +18 kWh/shift), emitting an additional 12.4 kg CO2e daily.'
  },
  {
    senderId: 'cost',
    senderName: 'Multi-Objective Cost Optimizer',
    color: '#f59e0b',
    message: 'Running cost optimization matrix. Deferring repair to failure triggers catastrophic stator lockup, causing $42,000 in cascade parts damage. Intervening now limits costs to a $4,500 bearing kit.'
  },
  {
    senderId: 'planner',
    senderName: 'Maintenance Scheduler Agent',
    color: '#8b5cf6',
    message: 'Scheduling. Recommended Intervention Window: Shift change in 4 hours (t=18) to minimize labor disruption. LOTO protocol 802-A must be triggered. Preparing bearing swap task cards.'
  },
  {
    senderId: 'sop',
    senderName: 'SOP Generator Agent',
    color: '#ec4899',
    message: 'SOP-IND-984 generated successfully. Incorporating axis bearing tolerances, LOTO safety guidelines, and calibration requirements. Sending drafting parameters to RAG Co-Pilot tab.'
  },
  {
    senderId: 'dt',
    senderName: 'Digital Twin Controller',
    color: '#6366f1',
    message: 'Updating workstation models. Digital Twin visual status altered to CRITICAL. Animating thermal leakage on SVG coolant nozzle module.'
  }
];

export default function MultiAgentTab() {
  const [agents, setAgents] = useState<AgentDetails[]>(INDUSTRIAL_AGENTS);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(-1);

  const startAgenticAudit = () => {
    if (isAuditing) return;
    setIsAuditing(true);
    setMessages([]);
    setActiveStep(0);
    
    // Set first agent to processing
    setAgents(prev => prev.map((a, idx) => idx === 1 ? { ...a, status: 'processing' } : a));
  };

  useEffect(() => {
    if (!isAuditing || activeStep < 0) return;

    if (activeStep >= CONVERSATION_LOGS.length) {
      setIsAuditing(false);
      setActiveStep(-1);
      setAgents(prev => prev.map(a => ({ ...a, status: 'idle' })));
      return;
    }

    const timer = setTimeout(() => {
      const currentLog = CONVERSATION_LOGS[activeStep];
      const newMsg: ChatMessage = {
        senderId: currentLog.senderId,
        senderName: currentLog.senderName,
        color: currentLog.color,
        message: currentLog.message,
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, newMsg]);

      // Update Agent status states
      setAgents(prev => prev.map(a => {
        if (a.id === currentLog.senderId) {
          return { ...a, status: 'active' };
        }
        // Set next sender to processing if available
        const nextLog = CONVERSATION_LOGS[activeStep + 1];
        if (nextLog && a.id === nextLog.senderId) {
          return { ...a, status: 'processing' };
        }
        return { ...a, status: a.status === 'active' ? 'active' : 'idle' };
      }));

      setActiveStep(prev => prev + 1);
    }, 1800);

    return () => clearTimeout(timer);
  }, [isAuditing, activeStep]);

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="p-6 rounded-2xl glass-card border border-slate-800 glow-cyan relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-xs font-semibold text-cyan-400 font-mono tracking-widest uppercase">
                COOPERATIVE INTELLIGENCE LAYER
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight font-display">
              Autonomous Multi-Agent AI Coordinator
            </h1>
            <p className="text-slate-400 text-xs max-w-3xl leading-relaxed">
              Differentiated industrial AI agents negotiating cost, remaining useful life, carbon impact, and maintenance safety windows. Trigger a Joint Audit to observe real-time agentic collaboration in response to shop floor anomalies.
            </p>
          </div>
          <button
            onClick={startAgenticAudit}
            disabled={isAuditing}
            className={`px-4 py-2 rounded-lg font-mono text-xs font-bold border transition-all flex items-center space-x-2 shrink-0 ${
              isAuditing 
                ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed' 
                : 'bg-cyan-950/40 border-cyan-800 hover:bg-cyan-900/60 text-cyan-400 shadow-md'
            }`}
          >
            <Play className={`w-4 h-4 ${isAuditing ? 'animate-spin' : ''}`} />
            <span>{isAuditing ? 'Audit Negotiation Active...' : 'Trigger Agentic Audit'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bento Grid of 10 Autonomous Agents */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display border-b border-slate-800 pb-2 mb-4 flex items-center space-x-2">
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>Multi-Agent Directory ({agents.length} Monitored Agents)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[460px] overflow-y-auto pr-2">
              {agents.map((agent) => (
                <div 
                  key={agent.id}
                  className={`p-3.5 rounded-xl border font-mono text-xs transition-all relative overflow-hidden ${
                    agent.status === 'active' 
                      ? 'bg-cyan-950/15 border-cyan-500/80 shadow-md scale-[1.01]' 
                      : agent.status === 'processing'
                      ? 'bg-slate-900/50 border-amber-500/80 animate-pulse'
                      : 'bg-slate-950/50 border-slate-900 hover:border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-bold text-white flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: agent.color }} />
                      <span>{agent.name}</span>
                    </span>
                    <span className={`text-[8px] px-1.5 py-0.5 border rounded uppercase font-bold tracking-wider ${
                      agent.status === 'active' 
                        ? 'bg-cyan-950/40 text-cyan-400 border-cyan-900' 
                        : agent.status === 'processing'
                        ? 'bg-amber-950/40 text-amber-400 border-amber-900'
                        : 'bg-slate-900 text-slate-500 border-slate-800'
                    }`}>
                      {agent.status}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-bold block mb-1 uppercase">ROLE: {agent.role}</span>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    {agent.specialty}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Real-time Agent Inter-Communication Log Console */}
        <div className="glass-card border border-slate-800 rounded-xl p-5 flex flex-col justify-between min-h-[420px]">
          <div className="space-y-4 flex-1 flex flex-col justify-between">
            <div className="border-b border-slate-800 pb-2 mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>Inter-Agent Negotiator Console</span>
              </h3>
              {isAuditing && (
                <span className="text-[9px] font-mono text-cyan-400 uppercase font-semibold animate-pulse">Streaming logs...</span>
              )}
            </div>

            {/* Logs Area */}
            <div className="bg-slate-950 border border-slate-900 rounded-lg p-3.5 font-mono text-[10px] space-y-4 h-96 overflow-y-auto flex-1 max-h-[360px]">
              <AnimatePresence>
                {messages.length === 0 ? (
                  <div className="text-slate-600 flex flex-col items-center justify-center h-full text-center py-10 space-y-2">
                    <MessageSquare className="w-8 h-8 text-slate-800" />
                    <span>No active agent coordination streams.<br />Click "Trigger Agentic Audit" to launch negotiation.</span>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-1"
                    >
                      <div className="flex justify-between text-[9px]">
                        <span className="font-bold uppercase flex items-center space-x-1.5" style={{ color: msg.color }}>
                          <Bot className="w-3.5 h-3.5" />
                          <span>{msg.senderName}</span>
                        </span>
                        <span className="text-slate-600 font-semibold">{msg.timestamp}</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed bg-slate-900/50 border border-slate-900/80 p-2 rounded">
                        {msg.message}
                      </p>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-3 mt-3 text-[9px] font-mono text-slate-500 leading-relaxed flex items-center justify-between">
            <span>PROTOCOL: COOPERATIVE NASH EQUILIBRIUM</span>
            <span>SYSTEM STATE: SYNCED</span>
          </div>
        </div>

      </div>
    </div>
  );
}
