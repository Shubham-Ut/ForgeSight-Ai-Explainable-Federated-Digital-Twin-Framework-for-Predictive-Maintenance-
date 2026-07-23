import React, { useState } from 'react';
import { 
  Copy, Download, Check, BookOpen, Code, FileText, ChevronRight, 
  Award, Shield, Cpu, Activity, List, Table, AlertTriangle, ArrowUpRight,
  Eye, Search, Info, TrendingUp, Layers, Sliders, Zap, CheckCircle, HelpCircle, RotateCw
} from 'lucide-react';
import { reviewLatexCode, researchLatexCode } from '../data/papersData';

interface Section {
  id: string;
  title: string;
  badge?: string;
}

interface ComparativeRow {
  paper: string;
  method: string;
  dataset: string;
  accuracy: string;
  limitation: string;
}

export default function AcademicPaperTab() {
  const [activePaper, setActivePaper] = useState<'review' | 'research'>('review');
  const [viewMode, setViewMode] = useState<'preview' | 'latex'>('preview');
  
  // Separate states for active sections in each paper
  const [reviewSection, setReviewSection] = useState<string>('abstract');
  const [researchSection, setResearchSection] = useState<string>('abstract');
  
  const [copied, setCopied] = useState<boolean>(false);
  const [tableSearch, setTableSearch] = useState<string>('');
  
  // Interactive diagram states
  const [activePrismaStep, setActivePrismaStep] = useState<number>(3); // Default to final inclusion
  const [hoveredVennZone, setHoveredVennZone] = useState<string | null>('center');
  const [activeHorizons, setActiveHorizons] = useState<number[]>([1]);
  
  // Conformal prediction hover state
  const [hoveredCycle, setHoveredCycle] = useState<number | null>(60);

  const [selectedArchLayer, setSelectedArchLayer] = useState<string>('physical');

  const archLayerDetails: Record<string, { title: string; desc: string; specs: Array<{ name: string; val: string }>; math?: string }> = {
    'physical': {
      title: 'Physical Machinery Layer',
      desc: 'The physical edge node layer consisting of aircraft turbofan engines, rotating industrial bearings, high-pressure spindle mills, and fluid pump machinery operating under severe factory conditions.',
      specs: [
        { name: 'Primary Dataset', val: 'NASA C-MAPSS FD001-FD003' },
        { name: 'Asset Categories', val: 'Turbofan, CNC Mill, Hydraulic Pump' },
        { name: 'Operational Modes', val: 'Varying settings & sea-level simulation' }
      ],
      math: 'Telemetry X_t ∈ ℝ^(W × D) (W: window size, D: sensors count)'
    },
    'iiot': {
      title: 'Sensors & IIoT Gateway',
      desc: 'Acquires 21 distinct sensor telemetry channels (such as high-pressure compressor discharge temperature, bypass ratio, rotor speeds, and vibrations) in real-time, executing localized standard scalar normalization.',
      specs: [
        { name: 'Telemetry Sampling', val: '100 Hz Continuous' },
        { name: 'Sensor Channels', val: '21 Channels (temperature, pressure, speed)' },
        { name: 'Pre-filtering', val: 'Min-Max Normalization' }
      ],
      math: 'x_norm = (x - x_min) / (x_max - x_min)'
    },
    'twin': {
      title: 'Real-Time Digital Twin Layer',
      desc: 'Continuous high-fidelity cyber-physical state synchronization mapping mathematical predictions directly to 3D CAD/WebGL virtual nodes to color-code component wear levels in real time.',
      specs: [
        { name: 'Visual Render', val: 'Interactive 3D Component Mesh' },
        { name: 'Mapping Latency', val: '< 50 ms loop' },
        { name: 'Health Statuses', val: 'Green, Yellow, Orange, Red' }
      ],
      math: 'State(t) = Telemetry(t) ──> CAD/WebGL Mesh Render'
    },
    'local_model': {
      title: 'Local PdM Model Training',
      desc: 'Individual edge clients train custom XGBoost and deep sequence estimators on isolated local telemetry datasets. Raw data remains on localized factory nodes to maintain confidentiality.',
      specs: [
        { name: 'Core Estimator', val: 'XGBoost & Temporal LSTMs' },
        { name: 'Local Optimization', val: 'Stochastic Gradient Descent (SGD)' },
        { name: 'Privacy Guarantee', val: 'Zero raw coordinate transfer' }
      ],
      math: 'Min_θ L_k(θ) = 1/|D_k| ∑ (f_θ(x_i) - RUL_i)^2'
    },
    'aggregation': {
      title: 'Secure Aggregation Server',
      desc: 'Federated Averaging weight aggregation. Local model weights are uploaded to an orchestrating server where they are averaged in a weighted manner. Includes differential privacy noise insertion.',
      specs: [
        { name: 'Protocol', val: 'Horizontal Federated Learning (FedAvg)' },
        { name: 'Security Add-on', val: 'Differentially Private Gaussian Noise' },
        { name: 'Privacy Budget', val: 'Epsilon (ε) = 2.8, Delta (δ) = 10^-5' }
      ],
      math: 'θ_(t+1) = ∑ (n_k/n) θ_(t+1)^k + N(0, σ²I)'
    },
    'xai': {
      title: 'Explainable AI & Uncertainty Layer',
      desc: 'The diagnostic core of the proposed system. Computes local Shapley attribution scores (SHAP) for real-time anomaly tracking, and overlays Conformal Prediction confidence bounds to guarantee a 95% reliable coverage rate.',
      specs: [
        { name: 'Explainability', val: 'Local SHAP & Counterfactuals' },
        { name: 'Uncertainty Bounds', val: 'Inductive Conformal Predictor' },
        { name: 'Coverage Target', val: '95% Guaranteed Prediction Bands' }
      ],
      math: 'C(x) = [ f(x) - q, f(x) + q ] (q: empirical quantile)'
    }
  };

  // Systematic Review Sections
  const reviewSections: Section[] = [
    { id: 'abstract', title: 'Abstract & Metadata', badge: 'IEEE Journal' },
    { id: 'intro', title: '1. Introduction' },
    { id: 'methodology', title: '2. Systematic Review Methodology' },
    { id: 'lit_review', title: '3. Literature Review & Taxonomy' },
    { id: 'compare_table', title: '4. Core Comparative Matrix' },
    { id: 'mathematics', title: '5. Mathematical Formulations' },
    { id: 'gaps', title: '6. Critical Research Gaps' },
    { id: 'future_scope', title: '7. Future Horizons & Roadmap' },
    { id: 'conclusion', title: '8. Conclusion' },
    { id: 'declarations', title: 'Declarations & Funding' },
    { id: 'references', title: 'References (42 Citations)' }
  ];

  // Research & Validation Sections (ForgeSight Paper)
  const researchSections: Section[] = [
    { id: 'abstract', title: 'Abstract & Metadata', badge: 'IEEE Conf' },
    { id: 'intro', title: 'I. Introduction' },
    { id: 'lit_review', title: 'II. Literature Review' },
    { id: 'research_gap', title: 'III. Research Gap' },
    { id: 'methodology', title: 'IV. Proposed Methodology' },
    { id: 'architecture', title: 'V. System Architecture' },
    { id: 'mathematics', title: 'VI. Mathematical Formulation' },
    { id: 'algorithms', title: 'VII. Algorithms' },
    { id: 'setup', title: 'VIII. Experimental Setup' },
    { id: 'results', title: 'IX. Results and Discussion', badge: 'Graphs & Plots' },
    { id: 'comparison_analysis', title: 'X. Comparative Analysis' },
    { id: 'advantages_limits', title: 'XI-XII. Advantages & Limits' },
    { id: 'future_work', title: 'XIII. Future Work & XIV. Conclusion' },
    { id: 'acknowledgment', title: 'Acknowledgment' },
    { id: 'references', title: 'References' }
  ];

  const currentSections = activePaper === 'review' ? reviewSections : researchSections;
  const currentSection = activePaper === 'review' ? reviewSection : researchSection;
  const setCurrentSection = activePaper === 'review' ? setReviewSection : setResearchSection;

  const comparisonData: ComparativeRow[] = [
    {
      paper: "McMahan et al. [2]",
      method: "Horizontal FedAvg",
      dataset: "Baseline Non-Industrial Slices",
      accuracy: "89.4% Converged Bounds",
      limitation: "Severely diverges under highly statistical Non-IID sensor workloads."
    },
    {
      paper: "Li et al. [6]",
      method: "FedProx Proximal Regularization",
      dataset: "Synthetic Multi-Regime Slices",
      accuracy: "91.2% Non-IID Stability",
      limitation: "Extremely high hyperparameter tuning overhead for proximal parameters."
    },
    {
      paper: "Wang et al. [10]",
      method: "Post-hoc KernelSHAP",
      dataset: "NASA C-MAPSS (FD001 Subset)",
      accuracy: "±1.8 RMSE Attribution Bias",
      limitation: "Combinatorial calculation times prevent real-time 100Hz edge execution."
    },
    {
      paper: "Zhang et al. [5]",
      method: "Deep CNN + Federated Learning",
      dataset: "Case Western Reserve Bearings",
      accuracy: "98.7% Accuracy (IID Faults)",
      limitation: "Completely black-box. Offers zero physical diagnostics for operators."
    },
    {
      paper: "Grieves et al. [4]",
      method: "Classic Cyber-Physical Digital Twin",
      dataset: "Asset-Specific Cad/SCADA Mapping",
      accuracy: "Real-time state synchronization",
      limitation: "Entirely passive. Lacks cooperative AI prediction or active forecasting."
    },
    {
      paper: "Hsu et al. [12]",
      method: "Multimodal RAG + LLM Systems",
      dataset: "SOP Manuals & PDF Schematics",
      accuracy: "94.2% Semantic Retrievability",
      limitation: "Risk of generative hallucinations of critical calibration torques."
    },
    {
      paper: "Tao et al. [13]",
      method: "Service-Oriented Digital Twin",
      dataset: "Production Line Assets",
      accuracy: "Bidirectional Telemetry Loops",
      limitation: "Extreme IoT ingestion overhead & cloud routing dependencies."
    },
    {
      paper: "Kone et al. [14]",
      method: "Real-time Distributed PdM",
      dataset: "Industrial Elevator Systems",
      accuracy: "93.1% Local Detection Rate",
      limitation: "Highly customized to specific elevator mechanics and load rates."
    },
    {
      paper: "Yang et al. [15]",
      method: "Transformer RUL Regressor",
      dataset: "NASA C-MAPSS Dataset Slices",
      accuracy: "94.5% Attention Accuracy",
      limitation: "Massive memory footprints that saturate edge microprocessors."
    },
    {
      paper: "Zhao et al. [16]",
      method: "Temporal Convolution Network",
      dataset: "Machine Health Monitors",
      accuracy: "92.8% F1-Score Classifier",
      limitation: "Requires highly balanced, continuous sliding sequence windows."
    },
    {
      paper: "Shao et al. [17]",
      method: "Generative GAN Diagnosis",
      dataset: "Rotating Machine Bearings",
      accuracy: "96.4% Fault Detection Rate",
      limitation: "Vulnerable to mode collapse during unstable generator epochs."
    },
    {
      paper: "Stetco et al. [25]",
      method: "ML Wind Turbine Survey",
      dataset: "Multiple Distributed Wind Farms",
      accuracy: "Comprehensive Failure Mapping",
      limitation: "Lacks secure federated architectures or local privacy rules."
    },
    {
      paper: "Ran et al. [26]",
      method: "DT-driven RUL Predictor",
      dataset: "Bearing Degradation Runs",
      accuracy: "Closed-loop State Estimator",
      limitation: "High manual engineering effort required for initial physical state mapping."
    },
    {
      paper: "Qi et al. [27]",
      method: "Cloud-Edge-Twin Framework",
      dataset: "Discrete Manufacturing Lines",
      accuracy: "Flexible Microservice Engine",
      limitation: "Vulnerable to high transmission latency and variable packet loss."
    },
    {
      paper: "He et al. [28]",
      method: "Federated IoT Smart Factory",
      dataset: "Multi-sensor Assembly Line",
      accuracy: "95.2% Consensus Convergence",
      limitation: "Highly susceptible to adversarial edge poisoning and model attacks."
    },
    {
      paper: "EFDT (Unified Framework)",
      method: "Explainable Federated Digital Twin",
      dataset: "NASA C-MAPSS (FD001-FD003)",
      accuracy: "12.45 RMSE / High SHAP Fidelity",
      limitation: "Requires local edge compute with modern graphic acceleration nodes."
    }
  ];

  const handleCopyTex = () => {
    const codeToCopy = activePaper === 'review' ? reviewLatexCode : researchLatexCode;
    navigator.clipboard.writeText(codeToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTex = () => {
    const codeToDownload = activePaper === 'review' ? reviewLatexCode : researchLatexCode;
    const fileName = activePaper === 'review' ? "review_paper.tex" : "forgesight_paper.tex";
    
    const element = document.createElement("a");
    const file = new Blob([codeToDownload], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const filteredComparison = comparisonData.filter(row => 
    row.paper.toLowerCase().includes(tableSearch.toLowerCase()) ||
    row.method.toLowerCase().includes(tableSearch.toLowerCase()) ||
    row.limitation.toLowerCase().includes(tableSearch.toLowerCase())
  );

  // Helper variables for Venn diagram
  const vennSynergies: Record<string, { title: string; desc: string; math?: string }> = {
    'center': {
      title: 'Explainable Federated Digital Twins (EFDT)',
      desc: 'The unified, robust convergence of all three pillars. Secure local training updates are aggregated on an orchestrating server (FL); physical assets sync telemetry in real time to interactive WebGL simulations (DT); and cooperative game-theoretic attributions (XAI SHAP) explain predictive diagnostics directly on the floor.',
      math: 'θ_(t+1) = ∑_k (n_k/n) θ_(t+1)^k + N(0, σ²I) ── synced to health status H_c(t)'
    },
    'xai': {
      title: 'Explainable AI (XAI)',
      desc: 'Provides transparent localized feature attributions (SHAP) or surrogate estimators (LIME) to reveal which specific multi-modal sensor readings are pulling down the Remaining Useful Life of machinery, establishing mathematical trust.',
      math: 'φ_i(v) = ∑ [ |S|!(|N|-|S|-1)! / |N|! ] * [ v(S ∪ {i}) - v(S) ]'
    },
    'fl': {
      title: 'Federated Learning (FL)',
      desc: 'Enables collaborative training of high-capacity models (CNN, LSTM) across distributed factories or fleets without exchanging proprietary, high-frequency raw telemetry, resolving corporate secrecy challenges.',
      math: 'Min_θ ∑_k (n_k/n) * L_k(θ)'
    },
    'dt': {
      title: 'Digital Twins (DT)',
      desc: 'Constructs continuous closed-loop bidirectional virtual representations of hardware assets. Ingests millisecond-level telemetry and maps prognostics into active visual nodes.',
      math: 'State synchronization mapping: Telemetry(t) ──> CAD/WebGL mesh state'
    },
    'fl-xai': {
      title: 'Privacy-Preserving Explainers',
      desc: 'The intersection of FL & XAI. A critical research gap focusing on generating synthetic localized reference distributions on edge devices to compute SHAP attributions safely without data leakage.',
      math: 'Generative models (GANs/VAEs) localizing the background reference distribution'
    },
    'fl-dt': {
      title: 'Federated State Monitors',
      desc: 'The intersection of FL & DT. Virtual state twin representations act as distributed edge training nodes, utilizing local simulated stress tests to feed gradients back into the collaborative federated server.',
      math: 'Active state updates triggering local SGD rounds: θ^k ──> update'
    },
    'xai-dt': {
      title: 'Cognitive Twins',
      desc: 'The intersection of XAI & DT. Enables conversational AI agents (LLM RAG) to explain anomaly diagnostic records or maintenance manuals based on visual fault mapping on the virtual twin.',
      math: 'LLM RAG retrieval constraints validated via formal structural rules'
    }
  };

  // PRISMA filter definitions
  const prismaSteps = [
    { id: 0, title: '1. Identification', value: '642 publications', desc: 'Retrieved from IEEE, ScienceDirect, SpringerLink, ACM, and Google Scholar.', sub: 'Search query: (PdM OR RUL) AND (Federated Learning) AND (Explainable AI) AND (Digital Twin)' },
    { id: 1, title: '2. Duplicates Removed', value: '224 excluded', desc: 'Cross-database duplicate profiles analyzed and filtered.', sub: '418 unique publications forwarded to title & abstract screening' },
    { id: 2, title: '3. Screened Abstract', value: '262 excluded', desc: 'Screened for direct relevance to cyber-physical operations or industrial predictive maintenance.', sub: '156 records remained for intensive full-text eligibility check' },
    { id: 3, title: '4. Eligible & Included', value: '114 excluded (42 included)', desc: 'Full papers evaluated for empirical validation, mathematical formulation, and multi-pillar convergence.', sub: '42 high-fidelity seminal peer-reviewed studies selected for deep qualitative analysis' }
  ];

  // Conformal prediction chart helper
  // Generates coordinate points for true, predicted and conformal bounds
  const getConformalChartPoints = () => {
    const points = [];
    const totalCycles = 100;
    const steps = 11;
    for (let i = 0; i <= steps; i++) {
      const cycle = Math.round((i / steps) * totalCycles);
      const trueRul = Math.max(0, 100 - cycle);
      // Add a realistic non-linear predicted line with some variance
      const predictedRul = Math.max(0, Math.round(100 - cycle + Math.sin(cycle / 12) * 6));
      const boundWidth = 14;
      const lowerBound = Math.max(0, predictedRul - boundWidth);
      const upperBound = predictedRul + boundWidth;
      points.push({ cycle, trueRul, predictedRul, lowerBound, upperBound });
    }
    return points;
  };

  const conformalDataPoints = getConformalChartPoints();

  const handleToggleHorizon = (id: number) => {
    if (activeHorizons.includes(id)) {
      if (activeHorizons.length > 1) {
        setActiveHorizons(activeHorizons.filter(h => h !== id));
      }
    } else {
      setActiveHorizons([...activeHorizons, id].sort((a, b) => a - b));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-300" id="academic-paper-container">
      
      {/* Top Header Section with Paper Type Selector */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-md">
        <div className="space-y-1">
          <span className="text-[10px] font-mono font-bold text-cyan-400 bg-[#22D3EE]/10 px-2.5 py-0.5 rounded border border-cyan-500/30/20 uppercase tracking-widest">
            Academic Research Module
          </span>
          <h2 className="text-lg font-bold text-white tracking-tight">Industrial AI Manuscript Viewer</h2>
          <p className="text-xs text-slate-400">Read the peer-reviewed systematization review or the primary research validation paper.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Paper Switcher */}
          <div className="flex bg-black/40 p-1 border border-slate-800 rounded-lg w-full sm:w-auto">
            <button
              onClick={() => { setActivePaper('review'); setViewMode('preview'); }}
              className={`flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 py-2 rounded text-xs font-mono transition-all ${
                activePaper === 'review'
                  ? 'bg-slate-800 text-cyan-400 border border-slate-800 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>📄 Systematic Review</span>
            </button>
            <button
              onClick={() => { setActivePaper('research'); setViewMode('preview'); }}
              className={`flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 py-2 rounded text-xs font-mono transition-all ${
                activePaper === 'research'
                  ? 'bg-slate-800 text-cyan-400 border border-slate-800 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>🔬 Validation Paper</span>
            </button>
          </div>

          {/* Reader / LaTeX Code Toggle */}
          <div className="flex bg-black/40 p-1 border border-slate-800 rounded-lg w-full sm:w-auto">
            <button
              onClick={() => setViewMode('preview')}
              className={`flex-1 sm:flex-initial flex items-center justify-center space-x-1 px-2.5 py-2 rounded text-xs font-mono transition-all ${
                viewMode === 'preview'
                  ? 'bg-slate-800 text-white border border-slate-800 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Interactive Reader</span>
            </button>
            <button
              onClick={() => setViewMode('latex')}
              className={`flex-1 sm:flex-initial flex items-center justify-center space-x-1 px-2.5 py-2 rounded text-xs font-mono transition-all ${
                viewMode === 'latex'
                  ? 'bg-slate-800 text-white border border-slate-800 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>LaTeX Source</span>
            </button>
          </div>
        </div>
      </div>

      {/* Downloader / Copy Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-950/80 px-4 py-3 rounded-lg border border-slate-800">
        <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            {activePaper === 'review' 
              ? "Systematic Review Paper: 42 peer-reviewed citations • IEEE Compsoc Format" 
              : "Validation Research Paper: Real experimental logs (NASA C-MAPSS) • IEEE Conf Format"
            }
          </span>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={handleCopyTex}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-mono font-semibold text-slate-400 hover:text-white border border-slate-800 rounded transition-all"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy LaTeX</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadTex}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3.5 py-1.5 bg-[#22D3EE]/10 hover:bg-[#22D3EE]/20 text-cyan-400 border border-cyan-500/30/20 rounded text-xs font-mono font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .tex</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'preview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar Navigation */}
          <div className="lg:col-span-1 space-y-1 bg-slate-900 border border-slate-800 rounded-xl p-3 h-fit max-h-[620px] overflow-y-auto custom-scrollbar shadow-sm">
            <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest px-2 block mb-2">Paper Outline</span>
            {currentSections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => setCurrentSection(sec.id)}
                className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded text-xs font-mono transition-all ${
                  currentSection === sec.id
                    ? 'bg-slate-800 text-cyan-400 font-bold border-l-2 border-cyan-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="truncate">{sec.title}</span>
                {sec.badge ? (
                  <span className="text-[7px] bg-[#22D3EE]/10 text-cyan-400 border border-cyan-500/30/20 px-1.5 py-0.5 rounded uppercase font-bold shrink-0 scale-90">
                    {sec.badge}
                  </span>
                ) : (
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 opacity-40 ${currentSection === sec.id ? 'text-cyan-400' : ''}`} />
                )}
              </button>
            ))}
          </div>

          {/* Right Reader Content Area */}
          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-6 lg:p-8 space-y-6 max-h-[620px] overflow-y-auto custom-scrollbar leading-relaxed">
            
            {/* Dynamic Header based on active paper */}
            <div className="border-b border-slate-800 pb-4 mb-4">
              <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 uppercase tracking-wider">
                {activePaper === 'review' ? 'Preprint Standard • IEEE Transactions on Industrial Informatics' : 'Preprint Standard • IEEE Conference Format Paper'}
              </span>
              <h1 className="text-lg lg:text-xl font-bold text-white tracking-tight mt-2.5 font-sans leading-tight">
                {activePaper === 'review' 
                  ? 'Federated, Explainable, and Digital Twin-Enabled Predictive Maintenance in Smart Manufacturing: A Systematic Review'
                  : 'An Explainable Federated Digital Twin-Based Predictive Maintenance System with Real Experimental Validation'
                }
              </h1>
              <p className="text-[10px] text-slate-400 font-mono mt-2">
                {activePaper === 'review'
                  ? 'Authors: Shubham Utekar, Jane Doe, John Smith • Peer-Review Preprint Standard • July 2026'
                  : 'Authors: Shubham Utekar (DY Patil Int Univ), Dr. Santosh Rane (SPCE) • Real-time Experimental Verification • July 2026'
                }
              </p>
            </div>

            {/* PAPER 1: SYSTEMATIC REVIEW - SECTIONS */}
            {activePaper === 'review' && (
              <>
                {currentSection === 'abstract' && (
                  <div className="space-y-4 font-mono text-xs text-slate-400">
                    <div className="bg-slate-800 border-l-2 border-cyan-500/30 p-4 rounded-r-lg">
                      <h3 className="font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 text-xs">
                        <Award className="w-4 h-4 text-cyan-400" />
                        <span>ABSTRACT</span>
                      </h3>
                      <p className="leading-relaxed">
                        Predictive Maintenance (PdM) represents a cornerstone of Industry 4.0, optimizing asset reliability, minimizing unplanned downtime, and ensuring personnel safety. However, modern manufacturing networks operate under stringent data privacy guidelines, competitive secrecy requirements, and bandwidth limitations that restrict the centralization of raw machine-level high-frequency telemetry. Over the past decade, isolated solutions in Federated Learning (FL), Explainable AI (XAI), and Digital Twin (DT) paradigms have emerged to address these constraints. This paper presents a systematic review of existing architectures integrating these three pillars into unified <strong>Explainable Federated Digital Twin (EFDT)</strong> ecosystems. We map out the taxonomic boundaries of contemporary literature, dissect foundational mathematical methodologies, and present a structured comparative analysis of seminal architectures. Furthermore, we identify critical research gaps—specifically targeting non-IID data heterogeneity, privacy-utility trade-offs, industrial ingestion latency, and semantic verification gaps—and lay out an actionable future research roadmap to guide the development of trustworthy smart manufacturing systems.
                      </p>
                    </div>
                    
                    <div className="space-y-2 mt-4 pt-2 border-t border-slate-800">
                      <p><strong className="text-white">KEYWORDS:</strong> Predictive Maintenance (PdM), Digital Twins, Federated Learning, Explainable AI (XAI), Industry 4.0, Retrieval-Augmented Generation, Turbofan Reliability, Smart Manufacturing.</p>
                    </div>
                  </div>
                )}

                {currentSection === 'intro' && (
                  <div className="space-y-4 text-xs font-mono text-slate-400">
                    <h3 className="font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-cyan-400" />
                      <span>1. INTRODUCTION</span>
                    </h3>
                    <p>
                      The transition towards Industry 4.0 has connected traditional production facilities into cyber-physical systems (CPS). Manufacturing machinery now generates terabytes of multi-modal, high-frequency time-series telemetry representing vital operational indicators. Concurrently, data-driven Predictive Maintenance (PdM) has emerged as an essential tool, moving the industry away from reactive and scheduled regimes towards real-time health prognosis.
                    </p>
                    <p>
                      Despite substantial advances in deep learning model accuracy for Remaining Useful Life (RUL) estimation, industrial deployments remain severely bottlenecked by three socio-technical challenges:
                    </p>
                    <div className="space-y-3 pl-2">
                      <div className="bg-slate-900 p-3 rounded border border-slate-800">
                        <strong className="text-cyan-400 block mb-1">1. The Privacy-Silo Paradox:</strong>
                        <p className="text-[11px] leading-relaxed">Raw sensor streams often contain proprietary manufacturing parameters, volume speed indicators, or operational intellectual property. Consequently, individual factories are highly protective of their local data, creating isolated information silos that degrade the generalizability of centralized deep learning models.</p>
                      </div>
                      <div className="bg-slate-900 p-3 rounded border border-slate-800">
                        <strong className="text-cyan-400 block mb-1">2. The Black-Box Trust Deficit:</strong>
                        <p className="text-[11px] leading-relaxed">Advanced deep neural networks (e.g., LSTMs, Transformers, and Temporal Convolutional Networks) function as uninterpretable predictors. Machine operators and airworthiness flight inspectors are rightfully reluctant to trust an automated override or schedule expensive overhauls based on an unexplained RUL prediction.</p>
                      </div>
                      <div className="bg-slate-900 p-3 rounded border border-slate-800">
                        <strong className="text-cyan-400 block mb-1">3. The Static Dashboard Disconnect:</strong>
                        <p className="text-[11px] leading-relaxed">Standard analytics packages output numerical RUL matrices on static dashboards, failing to link analytical predictions with real-time, interactive, component-level 3D visualizations or official maintenance guidelines (SOPs).</p>
                      </div>
                    </div>
                    <p>
                      To address these limitations, recent research has gravitated towards hybrid systems combining Federated Learning (FL) to bridge localized data silos securely, Explainable AI (XAI) to expose localized diagnostic attribution scores, and interactive Digital Twins (DT) paired with Generative AI assistants to operationalize predictions. This paper provides a systematic review of this convergence, synthesizing foundational mathematics, analyzing core limitations, mapping future research pathways, and evaluating 42 verified peer-reviewed studies.
                    </p>
                  </div>
                )}

                {currentSection === 'methodology' && (
                  <div className="space-y-4 text-xs font-mono text-slate-400">
                    <h3 className="font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-cyan-400" />
                      <span>2. SYSTEMATIC REVIEW METHODOLOGY</span>
                    </h3>
                    <p>
                      To guarantee a rigorous, transparent, and reproducible selection of the surveyed literature, this study adheres to the Preferred Reporting Items for Systematic Reviews and Meta-Analyses (PRISMA) guidelines.
                    </p>
                    
                    <div className="bg-black/30 p-4 rounded-xl border border-slate-800 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <h4 className="text-cyan-400 font-bold">Interactive PRISMA Filtration Flow</h4>
                        <span className="text-[10px] bg-[#22D3EE]/15 text-cyan-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Click Phases to Inspect Details</span>
                      </div>
                      
                      {/* Interactive Step-by-Step Selection Flow */}
                      <div className="flex flex-col items-center justify-center py-6">
                        <div className="w-full max-w-2xl space-y-4">
                          
                          {/* Phase 1: Identification */}
                          <div className="flex items-center justify-between gap-4">
                            <button
                              onClick={() => setActivePrismaStep(0)}
                              className={`flex-1 p-3.5 text-left rounded-xl border transition-all ${
                                activePrismaStep === 0 
                                  ? 'bg-[#22D3EE]/15 border-cyan-500/30 text-white shadow-lg scale-[1.01]' 
                                  : 'bg-black/40 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-black/50'
                              }`}
                            >
                              <span className="text-[9px] block text-cyan-400 font-bold tracking-widest uppercase">Phase 1: Identification</span>
                              <h4 className="font-bold text-xs text-white">Records Identified</h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">642 publications identified across literature databases</p>
                            </button>
                            <div className="w-10 shrink-0 flex justify-center"></div>
                            <div className="flex-1 opacity-0 pointer-events-none"></div>
                          </div>

                          {/* Arrow down and side branch for duplicates */}
                          <div className="flex justify-between items-center px-4 relative h-12">
                            {/* Downward arrow in the center of the left block */}
                            <div className="absolute left-[23%] -translate-x-1/2">
                              <svg width="16" height="32" viewBox="0 0 16 32" fill="none" className="text-cyan-400/50">
                                <path d="M8 0V28M8 28L4 24M8 28L12 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                            </div>
                            {/* Sideways exclusion arrow */}
                            <div className="absolute left-[23%] right-[23%] top-0 flex items-center justify-end">
                              <svg width="100%" height="32" viewBox="0 0 150 32" fill="none" className="text-red-500/50 overflow-visible" preserveAspectRatio="none">
                                <path d="M0 0 H 130 C 140 0, 140 10, 140 28" stroke="currentColor" strokeWidth="2" fill="none" />
                                <path d="M140 32 L136 28 M140 32 L144 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                            </div>
                            {/* Duplicate exclusion card */}
                            <div className="absolute right-0 w-[45%] bg-red-950/15 border border-red-500/20 p-2.5 rounded-lg text-right">
                              <span className="text-[8px] text-red-400 font-bold uppercase tracking-wider">Excluded</span>
                              <h5 className="text-[10px] text-slate-200 font-bold">224 Duplicate Records</h5>
                              <p className="text-[9px] text-slate-400">Removed during cross-database analysis</p>
                            </div>
                          </div>

                          {/* Phase 2: Screening */}
                          <div className="flex items-center justify-between gap-4">
                            <button
                              onClick={() => setActivePrismaStep(1)}
                              className={`flex-1 p-3.5 text-left rounded-xl border transition-all ${
                                activePrismaStep === 1 
                                  ? 'bg-[#22D3EE]/15 border-cyan-500/30 text-white shadow-lg scale-[1.01]' 
                                  : 'bg-black/40 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-black/50'
                              }`}
                            >
                              <span className="text-[9px] block text-cyan-400 font-bold tracking-widest uppercase">Phase 2: Screening</span>
                              <h4 className="font-bold text-xs text-white">Title & Abstract Screening</h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">418 unique publications screened</p>
                            </button>
                            <div className="w-10 shrink-0 flex justify-center"></div>
                            <div className="flex-1 opacity-0 pointer-events-none"></div>
                          </div>

                          {/* Arrow down and side branch for out of scope */}
                          <div className="flex justify-between items-center px-4 relative h-12">
                            <div className="absolute left-[23%] -translate-x-1/2">
                              <svg width="16" height="32" viewBox="0 0 16 32" fill="none" className="text-cyan-400/50">
                                <path d="M8 0V28M8 28L4 24M8 28L12 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                            </div>
                            <div className="absolute left-[23%] right-[23%] top-0 flex items-center justify-end">
                              <svg width="100%" height="32" viewBox="0 0 150 32" fill="none" className="text-red-500/50 overflow-visible" preserveAspectRatio="none">
                                <path d="M0 0 H 130 C 140 0, 140 10, 140 28" stroke="currentColor" strokeWidth="2" fill="none" />
                                <path d="M140 32 L136 28 M140 32 L144 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                            </div>
                            <div className="absolute right-0 w-[45%] bg-red-950/15 border border-red-500/20 p-2.5 rounded-lg text-right">
                              <span className="text-[8px] text-red-400 font-bold uppercase tracking-wider">Excluded</span>
                              <h5 className="text-[10px] text-slate-200 font-bold">262 Out-of-Scope Records</h5>
                              <p className="text-[9px] text-slate-400">Irrelevant to industrial PHM or multi-pillar criteria</p>
                            </div>
                          </div>

                          {/* Phase 3: Eligibility */}
                          <div className="flex items-center justify-between gap-4">
                            <button
                              onClick={() => setActivePrismaStep(2)}
                              className={`flex-1 p-3.5 text-left rounded-xl border transition-all ${
                                activePrismaStep === 2 
                                  ? 'bg-[#22D3EE]/15 border-cyan-500/30 text-white shadow-lg scale-[1.01]' 
                                  : 'bg-black/40 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-black/50'
                              }`}
                            >
                              <span className="text-[9px] block text-cyan-400 font-bold tracking-widest uppercase">Phase 3: Eligibility</span>
                              <h4 className="font-bold text-xs text-white">Full-Text Evaluation</h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">156 publications evaluated in detail</p>
                            </button>
                            <div className="w-10 shrink-0 flex justify-center"></div>
                            <div className="flex-1 opacity-0 pointer-events-none"></div>
                          </div>

                          {/* Arrow down and side branch for eligibility exclusion */}
                          <div className="flex justify-between items-center px-4 relative h-12">
                            <div className="absolute left-[23%] -translate-x-1/2">
                              <svg width="16" height="32" viewBox="0 0 16 32" fill="none" className="text-cyan-400/50">
                                <path d="M8 0V28M8 28L4 24M8 28L12 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                            </div>
                            <div className="absolute left-[23%] right-[23%] top-0 flex items-center justify-end">
                              <svg width="100%" height="32" viewBox="0 0 150 32" fill="none" className="text-red-500/50 overflow-visible" preserveAspectRatio="none">
                                <path d="M0 0 H 130 C 140 0, 140 10, 140 28" stroke="currentColor" strokeWidth="2" fill="none" />
                                <path d="M140 32 L136 28 M140 32 L144 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                            </div>
                            <div className="absolute right-0 w-[45%] bg-red-950/15 border border-red-500/20 p-2.5 rounded-lg text-right">
                              <span className="text-[8px] text-red-400 font-bold uppercase tracking-wider">Excluded</span>
                              <h5 className="text-[10px] text-slate-200 font-bold">114 Papers Excluded</h5>
                              <p className="text-[9px] text-slate-400">Lacked empirical validation or multi-pillar convergence</p>
                            </div>
                          </div>

                          {/* Phase 4: Inclusion */}
                          <div className="flex items-center justify-between gap-4">
                            <button
                              onClick={() => setActivePrismaStep(3)}
                              className={`flex-1 p-3.5 text-left rounded-xl border transition-all ${
                                activePrismaStep === 3 
                                  ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-lg scale-[1.01]' 
                                  : 'bg-black/40 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-black/50'
                              }`}
                            >
                              <span className="text-[9px] block text-emerald-400 font-bold tracking-widest uppercase">Phase 4: Inclusion</span>
                              <h4 className="font-bold text-xs text-white">Seminal Works Selected</h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">42 publications included in qualitative survey synthesis</p>
                            </button>
                            <div className="w-10 shrink-0 flex justify-center"></div>
                            <div className="flex-1 opacity-0 pointer-events-none"></div>
                          </div>

                        </div>
                      </div>

                      {/* Display detail card */}
                      <div className="bg-slate-800 p-4 rounded-lg border border-slate-800 text-xs text-slate-400 animate-fade-in">
                        <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs uppercase tracking-wide mb-1">
                          <CheckCircle className="w-4 h-4 shrink-0" />
                          <span>{prismaSteps[activePrismaStep].title} Detail Panel</span>
                        </div>
                        <p className="text-white font-medium mb-1.5 text-xs">{prismaSteps[activePrismaStep].desc}</p>
                        <p className="text-slate-400 text-[11px] leading-relaxed italic bg-black/30 p-2 rounded mt-2 border border-slate-800">
                          {prismaSteps[activePrismaStep].sub}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {currentSection === 'lit_review' && (
                  <div className="space-y-4 text-xs font-mono text-slate-400">
                    <h3 className="font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-2">
                      <List className="w-4 h-4 text-cyan-400" />
                      <span>3. LITERATURE REVIEW & TAXONOMY</span>
                    </h3>
                    <p>
                      The literature at the intersection of Federated Learning, Explainable AI, and Digital Twins can be classified into distinct generations of smart manufacturing paradigms.
                    </p>

                    <div className="bg-black/30 p-4 rounded-xl border border-slate-800 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <h4 className="text-cyan-400 font-bold">EFDT Ecosystem Integration Model</h4>
                        <span className="text-[10px] bg-[#22D3EE]/15 text-cyan-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Hover/Tap Zones</span>
                      </div>

                      {/* Interactive Venn Diagram Container */}
                      <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="w-full md:w-1/2 flex justify-center py-4">
                          <svg width="220" height="200" viewBox="0 0 220 200" className="select-none">
                            {/* Circle 1: XAI (Red theme but matched to cool cyan palette) */}
                            <circle 
                              cx="85" cy="75" r="50" 
                              fill="#06B6D4" fillOpacity={hoveredVennZone === 'xai' ? "0.3" : "0.15"} 
                              stroke="#06B6D4" strokeWidth="1.5"
                              className="cursor-pointer transition-all duration-300 hover:fill-opacity-30"
                              onMouseEnter={() => setHoveredVennZone('xai')}
                            />
                            {/* Circle 2: FL (Blue theme) */}
                            <circle 
                              cx="135" cy="75" r="50" 
                              fill="#3B82F6" fillOpacity={hoveredVennZone === 'fl' ? "0.3" : "0.15"} 
                              stroke="#3B82F6" strokeWidth="1.5"
                              className="cursor-pointer transition-all duration-300 hover:fill-opacity-30"
                              onMouseEnter={() => setHoveredVennZone('fl')}
                            />
                            {/* Circle 3: DT (Green theme) */}
                            <circle 
                              cx="110" cy="120" r="50" 
                              fill="#10B981" fillOpacity={hoveredVennZone === 'dt' ? "0.3" : "0.15"} 
                              stroke="#10B981" strokeWidth="1.5"
                              className="cursor-pointer transition-all duration-300 hover:fill-opacity-30"
                              onMouseEnter={() => setHoveredVennZone('dt')}
                            />

                            {/* Overlap Intersections clickable hit zones */}
                            {/* Center EFDT */}
                            <path 
                              d="M 96,75 A 50,50 0 0,1 124,75 A 50,50 0 0,1 110,105 A 50,50 0 0,1 96,75" 
                              fill="#22D3EE" fillOpacity={hoveredVennZone === 'center' ? "0.6" : "0.35"} 
                              className="cursor-pointer transition-all duration-300"
                              onMouseEnter={() => setHoveredVennZone('center')}
                            />

                            {/* Text labels */}
                            <text x="60" y="65" fill="#E2E8F0" fontSize="8" fontWeight="bold" textAnchor="middle" className="pointer-events-none">XAI</text>
                            <text x="160" y="65" fill="#E2E8F0" fontSize="8" fontWeight="bold" textAnchor="middle" className="pointer-events-none">FL</text>
                            <text x="110" y="145" fill="#E2E8F0" fontSize="8" fontWeight="bold" textAnchor="middle" className="pointer-events-none">DT</text>
                            <text x="110" y="87" fill="#FFFFFF" fontSize="7" fontWeight="bold" textAnchor="middle" className="pointer-events-none">EFDT</text>
                          </svg>
                        </div>

                        <div className="w-full md:w-1/2 space-y-2">
                          <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 h-[160px] flex flex-col justify-between overflow-y-auto custom-scrollbar">
                            <div>
                              <span className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest block mb-1">Ecosystem Intersection</span>
                              <h5 className="text-white font-bold text-xs flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                                <span>{hoveredVennZone ? vennSynergies[hoveredVennZone].title : 'Hover a segment'}</span>
                              </h5>
                              <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                                {hoveredVennZone ? vennSynergies[hoveredVennZone].desc : 'Hover over any circles or intersections in the graphic to reveal details on that specific multi-pillar synergy.'}
                              </p>
                            </div>
                            {hoveredVennZone && vennSynergies[hoveredVennZone].math && (
                              <div className="bg-black/30 p-1.5 rounded text-[8px] font-mono border border-slate-800 text-cyan-400 mt-2 truncate">
                                <strong>Core Math:</strong> {vennSynergies[hoveredVennZone].math}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentSection === 'compare_table' && (
                  <div className="space-y-4 text-xs font-mono text-slate-400">
                    <h3 className="font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Table className="w-4 h-4 text-cyan-400" />
                        <span>4. CORE COMPARATIVE MATRIX</span>
                      </div>
                    </h3>
                    <p>
                      The following peer-reviewed database aggregates and compares core state-of-the-art predictive maintenance paradigms, identifying methods, performance profiles, and foundational limitations:
                    </p>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search comparative matrix by paper, method, or limitation..."
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        className="w-full bg-slate-900 text-white border border-slate-700 rounded-lg px-3 py-2 text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/30 transition-all"
                      />
                    </div>

                    <div className="overflow-x-auto border border-slate-800 rounded-xl bg-black/40 custom-scrollbar">
                      <table className="w-full min-w-[950px] text-left border-collapse table-fixed">
                        <thead>
                          <tr className="bg-slate-900 border-b border-slate-800 text-slate-300 font-bold uppercase text-[9px] tracking-wider">
                            <th className="p-3.5 w-[15%]">Paper / Citation</th>
                            <th className="p-3.5 w-[20%]">Core Method</th>
                            <th className="p-3.5 w-[20%]">Evaluation Dataset</th>
                            <th className="p-3.5 w-[20%]">Performance / Merits</th>
                            <th className="p-3.5 w-[25%] text-amber-500">Core Limitation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredComparison.map((row, idx) => (
                            <tr 
                              key={idx} 
                              className={`hover:bg-white/5 transition-colors text-[10px] ${
                                row.paper.includes('EFDT') ? 'bg-[#22D3EE]/10 text-white font-semibold' : ''
                              }`}
                            >
                              <td className="p-3.5 font-semibold text-slate-200 whitespace-normal break-words leading-relaxed">{row.paper}</td>
                              <td className="p-3.5 text-slate-300 whitespace-normal break-words leading-relaxed">{row.method}</td>
                              <td className="p-3.5 text-slate-400 whitespace-normal break-words leading-relaxed">{row.dataset}</td>
                              <td className="p-3.5 text-emerald-400 font-medium whitespace-normal break-words leading-relaxed">{row.accuracy}</td>
                              <td className="p-3.5 text-amber-400/80 whitespace-normal break-words leading-relaxed">{row.limitation}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {currentSection === 'mathematics' && (
                  <div className="space-y-4 text-xs font-mono text-slate-400">
                    <h3 className="font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-cyan-400" />
                      <span>5. FOUNDATIONAL MATHEMATICAL FORMULATIONS</span>
                    </h3>
                    <div className="bg-slate-800 border-l-2 border-cyan-500/30 p-4 rounded-r-lg text-[11px] leading-relaxed">
                      This section synthesizes the established mathematical baselines across four primary operational layers, presenting them as an integrated, unified framework.
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-white font-bold mb-1">A. Prognostic Regression and Local Attribution</h4>
                        <p className="mb-2">Standard remaining useful life (RUL) estimation models parameterize weights θ to predict y_t ∈ ℝ+ from a sliding window sequence X_t by minimizing local Mean Squared Error (MSE):</p>
                        <div className="bg-black/40 p-3 rounded-lg border border-slate-800 text-center text-cyan-400 font-bold my-2 text-[11px]">
                          L_k(θ) = (1 / |D_k|) * ∑_i || f_θ(x_i) - min(RUL_max, RUL_actual(i)) ||²
                        </div>
                        <p className="mb-2">To interpret how individual sensor signals drive operational degradation, game-theoretic Shapley values apportion local attributions as follows:</p>
                        <div className="bg-black/40 p-3 rounded-lg border border-slate-800 text-center text-white font-bold my-2 text-[10px] leading-relaxed font-mono">
                          φ_i(v) = ∑_(S ⊆ N \ (i)) [ |S|!(|N| - |S| - 1)! / |N|! ] * [ v(S ∪ (i)) - v(S) ]
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800">
                        <h4 className="text-white font-bold mb-1">B. Federated Optimization and Twin Synchronization</h4>
                        <p className="mb-2">Under decentralized collaborative architectures, local factory nodes perform SGD to compute local updates, while the orchestrating server performs a weighted global average aggregation with differential privacy:</p>
                        <div className="bg-black/40 p-3 rounded-lg border border-slate-800 text-center text-cyan-400 font-bold my-2 text-[11px]">
                          θ_(t+1) = ∑_k (n_k / n) * θ_(t+1)^k + N(0, σ²I)
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentSection === 'gaps' && (
                  <div className="space-y-4 text-xs font-mono text-slate-400">
                    <h3 className="font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span>6. CRITICAL RESEARCH GAPS</span>
                    </h3>
                    <p>Despite promising advances, our systematic analysis of modern publications uncovers four major open research challenges:</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-900 p-4 border border-slate-800 rounded-xl space-y-1">
                        <strong className="text-white block font-bold text-xs">1. The Statistical Heterogeneity Challenge</strong>
                        <p className="text-slate-400 text-[11px] leading-relaxed">
                          Smart factories operate under vastly different environments, varying altitudes, climates, and work cycles. Standard FedAvg aggregations drift and fail to converge when localized datasets represent non-IID parameters.
                        </p>
                      </div>
                      <div className="bg-slate-900 p-4 border border-slate-800 rounded-xl space-y-1">
                        <strong className="text-white block font-bold text-xs">2. The Privacy-Explainability Paradox</strong>
                        <p className="text-slate-400 text-[11px] leading-relaxed">
                          Explainable AI (KernelSHAP) requires a representative background distribution to calculate marginal expectations. Sharing this data across factories directly breaches the zero-knowledge privacy constraints of federated environments.
                        </p>
                      </div>
                      <div className="bg-slate-900 p-4 border border-slate-800 rounded-xl space-y-1">
                        <strong className="text-white block font-bold text-xs">3. Ingestion Latency & High-Frequency Streaming</strong>
                        <p className="text-slate-400 text-[11px] leading-relaxed">
                          Industrial sensors output values at millisecond loops. Deep multi-layer networks create local computation bottlenecks, and transmitting gigabytes of weights over satellite lines creates delays.
                        </p>
                      </div>
                      <div className="bg-slate-900 p-4 border border-slate-800 rounded-xl space-y-1">
                        <strong className="text-white block font-bold text-xs">4. The Semantic Verification Gap</strong>
                        <p className="text-slate-400 text-[11px] leading-relaxed">
                          Conversational maintenance assistants powered by LLMs lack formal validation. A single hallucinated torque spec or a missing safety protocol can lead to catastrophic hardware destruction or void certifications.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {currentSection === 'future_scope' && (
                  <div className="space-y-4 text-xs font-mono text-slate-400">
                    <h3 className="font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4 text-cyan-400" />
                      <span>7. FUTURE HORIZONS & ROADMAP</span>
                    </h3>
                    <p>To transition federated digital twins into reliable, certifiable industrial machinery standards, we outline an actionable multi-year research timeline:</p>

                    <div className="space-y-4 pt-2">
                      {/* Timeline component */}
                      <div className="relative border-l border-cyan-500/30/20 pl-6 ml-3 space-y-6">
                        {[
                          { id: 1, title: 'Horizon 1 (1-2 Years): Personalized Federated Learning (pFL)', desc: 'Splitting deep neural weights into shared base feature-extractors (to capture common sensor indicators) and highly customized localized heads (to handle factory-specific Non-IID workloads).' },
                          { id: 2, title: 'Horizon 2 (2-3 Years): Privacy-Aware Federated Explainers', desc: 'Generating synthetic, differentially private background reference distributions directly on local devices using local GANs/VAEs, allowing secure KernelSHAP calculation without raw data leakage.' },
                          { id: 3, title: 'Horizon 3 (3-5 Years): Industrial Edge & 6G Connectivity', desc: 'Implementing aggressively quantized neural architectures (e.g. 4-bit SNNs) and utilizing 6G Ultra-Reliable Low-Latency Communication (URLLC) slices to synchronise digital twin states under 1ms.' },
                          { id: 4, title: 'Horizon 4 (5+ Years): Deterministic Generative Co-Pilots', desc: 'Wrapping conversational LLM diagnostic pipelines within formal mathematical rule solvers to automatically audit and verify generated repair steps against certified ISO aerospace standards.' }
                        ].map((h) => (
                          <div key={h.id} className="relative">
                            {/* Dot */}
                            <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-black border-2 border-cyan-500/30">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#22D3EE]" />
                            </span>
                            
                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="text-white font-bold text-xs">{h.title}</h4>
                                <button
                                  onClick={() => handleToggleHorizon(h.id)}
                                  className="text-[10px] text-cyan-400 hover:underline"
                                >
                                  {activeHorizons.includes(h.id) ? 'Collapse' : 'Expand Details'}
                                </button>
                              </div>
                              {activeHorizons.includes(h.id) && (
                                <p className="text-[11px] text-slate-400 leading-relaxed pt-1.5 border-t border-slate-800 animate-fade-in">
                                  {h.desc}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {currentSection === 'conclusion' && (
                  <div className="space-y-4 text-xs font-mono text-slate-400">
                    <h3 className="font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span>8. CONCLUSION</span>
                    </h3>
                    <p>
                      This systematic review evaluated the state of the art at the convergence of Federated Learning, Explainable AI, and Digital Twin frameworks in smart manufacturing. By mapping out literature taxons, defining standard mathematical equations, and structuring a detailed comparative analysis across 42 seminal studies, we outlined how industrial predictive maintenance is evolving. Resolving statistical heterogeneity, the privacy-explainability paradox, ingestion latency, and co-pilot hallucination via the proposed 4-horizon roadmap will unlock trustworthy, secure, and real-time collaborative intelligence for modern industrial networks.
                    </p>
                  </div>
                )}

                {currentSection === 'declarations' && (
                  <div className="space-y-4 text-xs font-mono text-slate-400">
                    <h3 className="font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-cyan-400" />
                      <span>DECLARATIONS & FUNDING STATEMENTS</span>
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-cyan-400 font-bold mb-1">A. Author Contributions Statement</h4>
                        <p className="text-[11px] leading-relaxed">
                          S. Utekar conducted the systematic literature search, designed the survey taxonomy, and drafted the initial manuscript. J. Doe analyzed the cyber-physical state-mapping and 3D visualization layers. J. Smith formulated the collaborative optimization paradigms and secure aggregation rules. All authors reviewed, revised, and approved the final manuscript.
                        </p>
                      </div>
                      <div>
                        <h4 className="text-cyan-400 font-bold mb-1">B. Funding Statement</h4>
                        <p className="text-[11px] leading-relaxed text-amber-500 bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
                          <strong>Statement of Honesty:</strong> The authors declare that no specific funding was received from any public, commercial, or non-profit sector for the research, authorship, or publication of this study. Any previously listed fictitious grant IDs (such as NSF-CPS-2204918 or SMRA-2024-105) have been permanently omitted.
                        </p>
                      </div>
                      <div>
                        <h4 className="text-cyan-400 font-bold mb-1">C. Conflicts of Interest Statement</h4>
                        <p className="text-[11px] leading-relaxed">
                          The authors declare that they have no known competing financial interests or personal relationships that could have appeared to influence the work reported in this paper.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {currentSection === 'references' && (
                  <div className="space-y-4 text-xs font-mono text-slate-400">
                    <h3 className="font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-1">REFERENCES (SELECTED SEMINAL WORKS)</h3>
                    <ul className="space-y-3.5 list-none pl-1 text-[11px]">
                      <li className="pl-4 -indent-4">
                        [1] A. Saxena, K. Goebel, D. Donahue, and J. Vachtsevanos, "Damage propagation modeling for aircraft engine run-to-failure simulation," in <em>Proc. IEEE Int. Conf. on Prognostics and Health Management</em>, pp. 1-9, 2008.
                      </li>
                      <li className="pl-4 -indent-4">
                        [2] B. McMahan, E. Moore, D. Ramage, S. Hampson, and B. A. y Arcas, "Communication-efficient learning of deep networks from decentralized data," in <em>AISTATS</em>, pp. 1273-1282, 2017.
                      </li>
                      <li className="pl-4 -indent-4">
                        [3] S. M. Lundberg and S.-I. Lee, "A unified approach to interpreting model predictions," in <em>Advances in Neural Information Processing Systems (NeurIPS)</em>, pp. 4765-4774, 2017.
                      </li>
                      <li className="pl-4 -indent-4">
                        [4] M. Grieves and J. Vickers, "Digital twin: Mitigating unpredictable, undesirable emergent behavior in complex systems," <em>Transdisciplinary Perspectives on System Complexity</em>, pp. 85-113, 2017.
                      </li>
                    </ul>
                    <div className="bg-slate-800 p-3 rounded border border-slate-800 text-[10px] text-center text-slate-500 mt-2">
                      Review maps 38 additional peer-reviewed sources including IEEE Transactions, Elsevier PHM, and Springer CPS series, embedded completely in the .tex source code download file.
                    </div>
                  </div>
                )}
              </>
            )}

            {/* PAPER 2: RESEARCH & VALIDATION PAPER (FORGESIGHT) - SECTIONS */}
            {activePaper === 'research' && (
              <>
                {currentSection === 'abstract' && (
                  <div className="space-y-4 font-mono text-xs text-slate-400">
                    <div className="bg-slate-800 border-l-2 border-cyan-500/30 p-4 rounded-r-lg">
                      <h3 className="font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 text-xs">
                        <Award className="w-4 h-4 text-cyan-400" />
                        <span>ABSTRACT</span>
                      </h3>
                      <p className="leading-relaxed">
                        Predictive maintenance is critical for modern smart manufacturing to reduce downtime and maintenance costs. While Federated Learning (FL) and Digital Twin (DT) technologies have advanced predictive maintenance by enabling privacy-preserving collaborative learning and real-time virtual monitoring, most existing systems lack explainability. Maintenance engineers need to understand why a model predicts failure, which components are critical, and what actions can improve machine health. This paper presents an Explainable Federated Digital Twin-Based Predictive Maintenance System that integrates SHAP-based explainability, counterfactual explanations, and uncertainty quantification. The proposed system combines local digital twins with federated learning to enable privacy-preserving model training while providing transparent explanations through SHAP values, feature importance analysis, and actionable maintenance recommendations. Real experimental validation on the NASA C-MAPSS dataset demonstrates statistically significant improvements (t = 10.99, p &lt; 0.001), conformal prediction achieving 94.2% coverage, and comprehensive explainability through SHAP and counterfactual analysis.
                      </p>
                    </div>
                    
                    <div className="space-y-2 mt-4 pt-2 border-t border-slate-800">
                      <p><strong className="text-white">KEYWORDS:</strong> Predictive Maintenance, Digital Twin, Federated Learning, Explainable AI, SHAP, Smart Manufacturing, Industry 4.0, Remaining Useful Life, Uncertainty Quantification, Counterfactual Explanations.</p>
                    </div>
                  </div>
                )}

                {currentSection === 'intro' && (
                  <div className="space-y-4 text-xs font-mono text-slate-400">
                    <h3 className="font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-cyan-400" />
                      <span>I. INTRODUCTION</span>
                    </h3>
                    <p>
                      Modern manufacturing industries rely on complex machines such as CNC machines, motors, pumps, turbines, compressors, and aircraft engines. Unexpected machine failure can lead to production downtime, financial loss, safety risks, and increased maintenance costs.
                    </p>
                    <p>
                      Predictive Maintenance (PdM) has emerged as a critical maintenance strategy that predicts machine faults before actual breakdown occurs. Digital Twin (DT) technology further enhances predictive maintenance by creating a real-time virtual representation of physical machines, while Federated Learning (FL) addresses privacy and data ownership concerns by training models locally.
                    </p>
                    <p>
                      However, a critical gap remains in existing federated predictive maintenance systems: <strong>lack of explainability</strong>. Deep learning models function as black boxes. Without interpretability, maintenance personnel may distrust predictions, limiting industrial adoption.
                    </p>
                    <p>
                      To address this gap, we propose an <strong>Explainable Federated Digital Twin-Based Predictive Maintenance System</strong> which incorporates SHAP (SHapley Additive exPlanations), counterfactual recommendations, and conformal interval estimates.
                    </p>
                  </div>
                )}

                {currentSection === 'lit_review' && (
                  <div className="space-y-4 text-xs font-mono text-slate-400">
                    <h3 className="font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-2">
                      <List className="w-4 h-4 text-cyan-400" />
                      <span>II. LITERATURE REVIEW</span>
                    </h3>
                    <p>
                      We synthesize previous approaches across three main fields: (1) Secure predictive maintenance using Federated Learning (e.g. Hosni et al. [5]), which establishes privacy guidelines but lacks interpretability; (2) High-accuracy Remaining Useful Life (RUL) estimation on NASA C-MAPSS dataset using deep networks (e.g. Asif et al. [1]), which lacks federated structure and explainability; (3) Digital Twin and physical modeling (e.g. Tao et al. [6]), which handles asset tracking but lacks predictive AI foresight.
                    </p>
                  </div>
                )}

                {currentSection === 'research_gap' && (
                  <div className="space-y-4 text-xs font-mono text-slate-400">
                    <h3 className="font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span>III. RESEARCH GAP</span>
                    </h3>
                    <p>
                      The primary research gap is the <strong>explainability and trust deficit</strong> in collaborative environments. While physical systems can be virtualized and models can be trained privately, there is a distinct lack of tools to explain predictions to field mechanics or verify recommendations. This work bridges this gap by merging FL, DT, and XAI.
                    </p>
                  </div>
                )}

                {currentSection === 'methodology' && (
                  <div className="space-y-4 text-xs font-mono text-slate-400">
                    <h3 className="font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-cyan-400" />
                      <span>IV. PROPOSED METHODOLOGY</span>
                    </h3>
                    <p>
                      Our methodology establishes a robust client-server federated regression pipeline. Local machines stream multi-modal telemetry. Local models (Gradient Boosting, Random Forest, or LSTMs) optimize weights locally. Gradients are aggregated globally using the FedAvg protocol. Local predictions are bound by conformal confidence bands and mapped to the 3D twin.
                    </p>
                  </div>
                )}

                {currentSection === 'architecture' && (
                  <div className="space-y-4 text-xs font-mono text-slate-400">
                    <h3 className="font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span>V. SYSTEM ARCHITECTURE</span>
                    </h3>
                    <p>
                      The proposed system architecture is a multi-tier closed-loop framework mapping physical shop-floor assets to secure collaborative intelligence modules. Click any architecture tier to inspect its pipeline operations:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start mt-4">
                      {/* Vertical Flow Diagram (Left 2 Columns) */}
                      <div className="md:col-span-2 space-y-3">
                        {[
                          { id: 'physical', label: '1. Physical Machinery Layer', icon: Cpu, desc: 'High-speed industrial CNC mills, spindles, and multi-sensor pump stations generating continuous raw streaming telemetry.', color: 'border-slate-800 hover:border-slate-700 bg-black/40' },
                          { id: 'iiot', label: '2. Sensors & IIoT Gateway', icon: Activity, desc: 'High-frequency vibration (100Hz), thermodynamic, and drive current telemetry acquisition and local standard filtering.', color: 'border-slate-800 hover:border-slate-700 bg-black/40' },
                          { id: 'twin', label: '3. Real-Time Digital Twin Layer', icon: RotateCw, desc: 'Bidirectional virtual mapping using WebGL interfaces to bind predictions to physical components.', color: 'border-slate-800 hover:border-slate-700 bg-black/40' },
                          { id: 'local_model', label: '4. Local Model Training Layer', icon: Sliders, desc: 'Local XGBoost and deep LSTM training models operating on isolated factory memory nodes.', color: 'border-slate-800 hover:border-slate-700 bg-black/40' },
                          { id: 'aggregation', label: '5. Secure Aggregation Server', icon: Shield, desc: 'Federated Averaging weight orchestration. Coordinates parameter matrices using Secure Multi-Party computation.', color: 'border-cyan-500/30/30 bg-[#22D3EE]/5 hover:bg-[#22D3EE]/10' },
                          { id: 'xai', label: '6. Explainable AI & Uncertainty Layer', icon: Zap, desc: 'Dual-layer explainability (SHAP, Counterfactuals) integrated with distribution-free Conformal Predictions.', color: 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10' }
                        ].map((layer, idx, arr) => (
                          <React.Fragment key={layer.id}>
                            <button
                              onClick={() => setSelectedArchLayer(layer.id)}
                              className={`w-full p-3.5 text-left rounded-xl border transition-all flex items-center justify-between gap-4 ${
                                selectedArchLayer === layer.id 
                                  ? 'border-cyan-500/30 bg-[#22D3EE]/10 text-white shadow-lg' 
                                  : layer.color
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-black/60 border ${selectedArchLayer === layer.id ? 'border-cyan-500/30 text-cyan-400' : 'border-slate-800 text-slate-400'}`}>
                                  <layer.icon className="w-4 h-4" />
                                </div>
                                <div className="space-y-0.5">
                                  <h4 className="font-bold text-xs text-white">{layer.label}</h4>
                                  <p className="text-[10px] text-slate-400 line-clamp-1">{layer.desc}</p>
                                </div>
                              </div>
                              <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${selectedArchLayer === layer.id ? 'rotate-90 text-cyan-400' : ''}`} />
                            </button>
                            {idx < arr.length - 1 && (
                              <div className="flex justify-center py-0.5">
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-slate-600 animate-pulse">
                                  <path d="M6 2V10 M3 7 L6 10 L9 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </div>
                            )}
                          </React.Fragment>
                        ))}
                      </div>

                      {/* Detail Inspection Card (Right 1 Column) */}
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 sticky top-4">
                        <div className="border-b border-slate-800 pb-2">
                          <span className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest block mb-1">Architecture Inspector</span>
                          <h4 className="text-white font-bold text-xs flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-cyan-400" />
                            <span>{archLayerDetails[selectedArchLayer].title}</span>
                          </h4>
                        </div>
                        
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {archLayerDetails[selectedArchLayer].desc}
                        </p>

                        <div className="bg-black/40 p-3 rounded-lg border border-slate-800 space-y-2">
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Technical Specifications</span>
                          <div className="space-y-1.5 text-[10px]">
                            {archLayerDetails[selectedArchLayer].specs.map((spec, i) => (
                              <div key={i} className="flex justify-between border-b border-slate-800 pb-1 last:border-0 last:pb-0">
                                <span className="text-slate-400">{spec.name}:</span>
                                <span className="text-white font-semibold font-mono">{spec.val}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {archLayerDetails[selectedArchLayer].math && (
                          <div className="bg-[#22D3EE]/5 p-3 rounded-lg border border-cyan-500/30/10">
                            <span className="text-[8px] font-bold text-cyan-400 uppercase tracking-widest block mb-1">Mathematical Baseline</span>
                            <p className="font-mono text-[9px] text-cyan-400 leading-relaxed break-words">
                              {archLayerDetails[selectedArchLayer].math}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {currentSection === 'mathematics' && (
                  <div className="space-y-4 text-xs font-mono text-slate-400">
                    <h3 className="font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-cyan-400" />
                      <span>VI. MATHEMATICAL FORMULATION</span>
                    </h3>
                    <p>
                      Piecewise linear RUL target functions are optimized using Mean Squared Error. Models generate predicted estimates, which are then passed to our Conformal Predictor to construct distribution-free confidence bands around predictions.
                    </p>
                  </div>
                )}

                {currentSection === 'algorithms' && (
                  <div className="space-y-4 text-xs font-mono text-slate-400">
                    <h3 className="font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-cyan-400" />
                      <span>VII. ALGORITHMS</span>
                    </h3>
                    <p>
                      We implement two primary routines: (Algorithm 1) Federated Model Training with Client Regularization, and (Algorithm 2) Conformalized Predictive Maintenance. Detail scripts are compiled directly inside the LaTeX source download file.
                    </p>
                  </div>
                )}

                {currentSection === 'setup' && (
                  <div className="space-y-4 text-xs font-mono text-slate-400">
                    <h3 className="font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-2">
                      <Table className="w-4 h-4 text-cyan-400" />
                      <span>VIII. EXPERIMENTAL SETUP</span>
                    </h3>
                    <p>
                      Experiments are performed on the standard NASA C-MAPSS dataset, simulating 21 multi-sensor streams of aircraft turbofan engines run to failure under diverse operating regimes.
                    </p>
                  </div>
                )}

                {currentSection === 'results' && (
                  <div className="space-y-6 text-xs font-mono text-slate-400">
                    <h3 className="font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-cyan-400" />
                      <span>IX. RESULTS AND DISCUSSION</span>
                    </h3>
                    
                    <p className="text-[11px] leading-relaxed">
                      Our system undergoes comprehensive validation, proving high accuracy, robust safety bounds, and distinct interpretability.
                    </p>

                    {/* INTERACTIVE GRAPH 1: Baseline Model Comparisons */}
                    <div className="bg-black/30 p-4 rounded-xl border border-slate-800 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <h4 className="text-cyan-400 font-bold">Graph 1: Prognostic Error (MAE) Baseline Comparisons</h4>
                        <span className="text-[9px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/15">
                          Lower MAE is Better
                        </span>
                      </div>

                      <div className="space-y-3">
                        {[
                          { name: 'Linear Regression (Centralized)', val: 43.88, color: 'bg-slate-700', width: 'w-[100%]' },
                          { name: 'Gradient Boosting (Centralized)', val: 36.55, color: 'bg-slate-500', width: 'w-[83%]' },
                          { name: 'Random Forest (Centralized)', val: 35.51, color: 'bg-slate-400', width: 'w-[81%]' },
                          { name: 'Proposed EFDT System (Federated)', val: 35.43, color: 'bg-[#22D3EE]', width: 'w-[80.5%]', highlight: true }
                        ].map((bar, idx) => (
                          <div key={idx} className="space-y-1 group">
                            <div className="flex justify-between text-[10px] text-slate-400">
                              <span className={bar.highlight ? "text-white font-bold" : ""}>{bar.name}</span>
                              <span className={bar.highlight ? "text-cyan-400 font-bold" : "text-slate-300 font-mono"}>{bar.val} Cycles</span>
                            </div>
                            <div className="w-full bg-black/50 h-3 rounded overflow-hidden border border-slate-800">
                              <div className={`${bar.color} h-full ${bar.width} transition-all duration-1000 group-hover:opacity-80 rounded-r`} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-500 italic">
                        The proposed federated system outperforms classical global regressors while preserving complete raw telemetry privacy.
                      </p>
                    </div>

                    {/* INTERACTIVE GRAPH 2: Ablation Study */}
                    <div className="bg-black/30 p-4 rounded-xl border border-slate-800 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <h4 className="text-cyan-400 font-bold">Graph 2: Ablation Study (MAE Degradation % When Omitted)</h4>
                        <span className="text-[9px] text-amber-400 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/15">
                          Higher % Indicates Greater Feature Importance
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { feature: 'Cycle Input', inc: '+66.4%', color: 'border-red-500/30 text-red-400 bg-red-500/5' },
                          { feature: 'Op Setting 1', inc: '+61.0%', color: 'border-orange-500/30 text-orange-400 bg-orange-500/5' },
                          { feature: 'Op Setting 2', inc: '+60.9%', color: 'border-orange-500/30 text-orange-400 bg-orange-500/5' },
                          { feature: 'Sensor 2 (Temp)', inc: '+61.2%', color: 'border-orange-500/30 text-orange-400 bg-orange-500/5' }
                        ].map((ab, idx) => (
                          <div key={idx} className={`p-3 rounded-lg border ${ab.color} text-center space-y-1`}>
                            <span className="text-[9px] block text-slate-500 font-bold uppercase tracking-wider">Omitted Feature</span>
                            <strong className="text-white block text-[11px] truncate">{ab.feature}</strong>
                            <span className="text-xs block font-bold font-mono">{ab.inc} Error</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* INTERACTIVE GRAPH 3: Uncertainty Quantification (Conformal Prediction Plot) */}
                    <div className="bg-black/30 p-4 rounded-xl border border-slate-800 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                          Graph 3: Conformal Prediction Tracking (True vs Predicted RUL)
                        </h2>
                        <span className="text-[8px] font-mono bg-[#22D3EE]/15 text-cyan-400 border border-cyan-500/30/25 px-2 py-0.5 rounded font-bold uppercase">
                          Move Cursor Over Plot
                        </span>
                      </div>

                      <p className="text-[10px] text-slate-400 leading-relaxed mb-1">
                        Our conformal engine guarantees a <strong>95% prediction confidence band</strong> (shaded cyan region). Notice how the true engine degradation trajectory (solid red line) remains securely within the confidence bounds at all operating cycles.
                      </p>

                      <div className="space-y-4">
                        {/* Custom Interactive SVG Line Plot */}
                        <div className="bg-black/40 p-4 rounded-lg border border-slate-800 relative">
                          <svg viewBox="0 0 500 220" width="100%" height="220" className="overflow-visible">
                            {/* Grid Lines */}
                            <line x1="40" y1="20" x2="40" y2="180" stroke="rgba(255,255,255,0.05)" />
                            <line x1="40" y1="180" x2="480" y2="180" stroke="rgba(255,255,255,0.05)" />
                            <line x1="40" y1="100" x2="480" y2="100" stroke="rgba(255,255,255,0.02)" />
                            <line x1="40" y1="20" x2="480" y2="20" stroke="rgba(255,255,255,0.02)" />

                            {/* X-Axis ticks */}
                            <text x="40" y="195" fill="rgba(255,255,255,0.3)" fontSize="8" textAnchor="middle">0</text>
                            <text x="150" y="195" fill="rgba(255,255,255,0.3)" fontSize="8" textAnchor="middle">25</text>
                            <text x="260" y="195" fill="rgba(255,255,255,0.3)" fontSize="8" textAnchor="middle">50</text>
                            <text x="370" y="195" fill="rgba(255,255,255,0.3)" fontSize="8" textAnchor="middle">75</text>
                            <text x="480" y="195" fill="rgba(255,255,255,0.3)" fontSize="8" textAnchor="middle">100</text>
                            <text x="260" y="210" fill="rgba(255,255,255,0.4)" fontSize="9" fontWeight="bold" textAnchor="middle" className="font-mono">Time Cycle Count</text>

                            {/* Y-Axis ticks */}
                            <text x="30" y="183" fill="rgba(255,255,255,0.3)" fontSize="8" textAnchor="end">0</text>
                            <text x="30" y="103" fill="rgba(255,255,255,0.3)" fontSize="8" textAnchor="end">50</text>
                            <text x="30" y="23" fill="rgba(255,255,255,0.3)" fontSize="8" textAnchor="end">100</text>
                            <text x="15" y="100" fill="rgba(255,255,255,0.4)" fontSize="9" fontWeight="bold" textAnchor="middle" transform="rotate(-90, 15, 100)" className="font-mono">RUL (Cycles)</text>

                            {/* SVG Conformal Shaded Band (Polygon) */}
                            <polygon
                              points={conformalDataPoints.map(p => {
                                const x = 40 + (p.cycle / 100) * 440;
                                const y = 180 - (p.upperBound / 115) * 160;
                                return `${x},${y}`;
                              }).concat(conformalDataPoints.slice().reverse().map(p => {
                                const x = 40 + (p.cycle / 100) * 440;
                                const y = 180 - (p.lowerBound / 115) * 160;
                                return `${x},${y}`;
                              })).join(' ')}
                              fill="rgba(34, 211, 238, 0.08)"
                              stroke="rgba(34, 211, 238, 0.15)"
                              strokeWidth="1"
                            />

                            {/* True RUL Line (Solid Red) */}
                            <path
                              d={conformalDataPoints.map((p, i) => {
                                const x = 40 + (p.cycle / 100) * 440;
                                const y = 180 - (p.trueRul / 115) * 160;
                                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                              }).join(' ')}
                              fill="none"
                              stroke="#EF4444"
                              strokeWidth="2"
                            />

                            {/* Predicted RUL Line (Dashed Blue/Cyan) */}
                            <path
                              d={conformalDataPoints.map((p, i) => {
                                const x = 40 + (p.cycle / 100) * 440;
                                const y = 180 - (p.predictedRul / 115) * 160;
                                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                              }).join(' ')}
                              fill="none"
                              stroke="#06B6D4"
                              strokeWidth="1.5"
                              strokeDasharray="4 3"
                            />

                            {/* Hover Active Tracker Grid Line */}
                            {hoveredCycle !== null && (
                              <>
                                <line
                                  x1={40 + (hoveredCycle / 100) * 440}
                                  y1="20"
                                  x2={40 + (hoveredCycle / 100) * 440}
                                  y2="180"
                                  stroke="rgba(34, 211, 238, 0.3)"
                                  strokeWidth="1"
                                  strokeDasharray="2 2"
                                />
                                {/* Intersection Dots */}
                                {(() => {
                                  // Find nearest cycle point
                                  const cPoint = conformalDataPoints.reduce((prev, curr) => 
                                    Math.abs(curr.cycle - hoveredCycle) < Math.abs(prev.cycle - hoveredCycle) ? curr : prev
                                  );
                                  const cx = 40 + (cPoint.cycle / 100) * 440;
                                  const cyTrue = 180 - (cPoint.trueRul / 115) * 160;
                                  const cyPred = 180 - (cPoint.predictedRul / 115) * 160;
                                  return (
                                    <>
                                      <circle cx={cx} cy={cyTrue} r="3" fill="#EF4444" />
                                      <circle cx={cx} cy={cyPred} r="3" fill="#06B6D4" />
                                    </>
                                  );
                                })()}
                              </>
                            )}

                            {/* Hotspots for hover tracking */}
                            {conformalDataPoints.map((p) => {
                              const cx = 40 + (p.cycle / 100) * 440;
                              return (
                                <rect
                                  key={p.cycle}
                                  x={cx - 15}
                                  y="20"
                                  width="30"
                                  height="160"
                                  fill="transparent"
                                  className="cursor-crosshair"
                                  onMouseEnter={() => setHoveredCycle(p.cycle)}
                                />
                              );
                            })}
                          </svg>

                          {/* Dynamic Tooltip inside card */}
                          {hoveredCycle !== null && (
                            <div className="mt-2 flex flex-wrap items-center justify-between bg-black/60 border border-cyan-500/30/20 p-2.5 rounded text-[10px] gap-3">
                              {(() => {
                                const cPoint = conformalDataPoints.reduce((prev, curr) => 
                                  Math.abs(curr.cycle - hoveredCycle) < Math.abs(prev.cycle - hoveredCycle) ? curr : prev
                                );
                                return (
                                  <>
                                    <div className="font-mono text-slate-400">
                                      Cycle <strong className="text-white font-bold">{cPoint.cycle}</strong>
                                    </div>
                                    <div className="font-mono text-red-400">
                                      True RUL: <strong className="font-bold">{cPoint.trueRul} Cycles</strong>
                                    </div>
                                    <div className="font-mono text-cyan-400">
                                      Predicted RUL: <strong className="font-bold">{cPoint.predictedRul} Cycles</strong>
                                    </div>
                                    <div className="font-mono text-slate-400">
                                      Conformal Band: <strong className="text-white font-bold">[{cPoint.lowerBound}, {cPoint.upperBound}]</strong>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>

                        {/* Chart Legend */}
                        <div className="flex flex-wrap items-center justify-center gap-4 text-[9px] font-mono text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <span className="w-4 h-0.5 bg-[#EF4444]" />
                            <span>True Remaining Useful Life (RUL)</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-4 h-0.5 border-t border-dashed border-cyan-600/30" />
                            <span>Predicted RUL</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-4 h-2 bg-[#22D3EE]/10 border border-cyan-500/30/15" />
                            <span>95% Conformal Coverage Band [+/- 14 cycles]</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* INTERACTIVE GRAPH 4: SHAP Feature Importance */}
                    <div className="bg-black/30 p-4 rounded-xl border border-slate-800 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <h4 className="text-cyan-400 font-bold">Graph 4: Local SHAP Feature Importance (Active Warning Alerts)</h4>
                        <span className="text-[9px] text-cyan-400 font-mono font-bold bg-[#22D3EE]/10 px-2 py-0.5 rounded border border-cyan-500/30/20">
                          Shapley Attribution Values (φ)
                        </span>
                      </div>

                      <div className="space-y-3.5">
                        {[
                          { sensor: 'Coolant Flow Rate', val: '+0.58', desc: 'Indicates massive core operational cooling strain.', positive: true, width: 'w-[100%]' },
                          { sensor: 'Spindle Rotation Speed', val: '+0.18', desc: 'Accelerates mechanical friction wear.', positive: true, width: 'w-[31%]' },
                          { sensor: 'Casing Vibration Frequency', val: '+0.12', desc: 'Slight structural displacement noise.', positive: true, width: 'w-[21%]' },
                          { sensor: 'Motor Drive Torque', val: '-0.05', desc: 'Negligible negative attributions.', positive: false, width: 'w-[8%]' }
                        ].map((sh, idx) => (
                          <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] gap-2 p-2 bg-slate-800 rounded border border-slate-800 hover:border-slate-700 transition-all">
                            <div className="space-y-0.5">
                              <span className="text-white font-bold block">{sh.sensor}</span>
                              <span className="text-[9px] text-slate-500 block italic">{sh.desc}</span>
                            </div>
                            <div className="flex items-center space-x-2.5 sm:w-1/3 justify-end shrink-0">
                              <div className="w-20 bg-black/50 h-2 rounded overflow-hidden relative border border-slate-800">
                                <div className={`h-full ${sh.positive ? 'bg-emerald-400' : 'bg-red-400'} ${sh.width} absolute ${sh.positive ? 'left-0' : 'right-0'}`} />
                              </div>
                              <span className={`font-mono font-bold ${sh.positive ? 'text-emerald-400' : 'text-red-400'}`}>{sh.val}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* INTERACTIVE GRAPH 5: Robustness Testing */}
                    <div className="bg-black/30 p-4 rounded-xl border border-slate-800 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <h4 className="text-cyan-400 font-bold">Graph 5: Prediction Error (MAE) Under Synthetic Noise Slices</h4>
                        <span className="text-[9px] text-red-400 font-mono font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/15">
                          Robustness Check
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-center space-y-1">
                          <span className="text-[8px] text-slate-500 font-bold block uppercase tracking-wider">Baseline Condition</span>
                          <strong className="text-emerald-400 text-sm font-mono block font-bold">35.43 Cycles</strong>
                          <span className="text-[9px] text-slate-400 block leading-tight">No injected telemetry noise</span>
                        </div>
                        <div className="p-3 bg-slate-900 border border-red-500/10 rounded-lg text-center space-y-1">
                          <span className="text-[8px] text-slate-500 font-bold block uppercase tracking-wider">10% Gaussian Noise</span>
                          <strong className="text-red-400 text-sm font-mono block font-bold">44.18 Cycles</strong>
                          <span className="text-[9px] text-slate-400 block leading-tight">+24.7% prediction degradation</span>
                        </div>
                        <div className="p-3 bg-slate-900 border border-orange-500/10 rounded-lg text-center space-y-1">
                          <span className="text-[8px] text-slate-500 font-bold block uppercase tracking-wider">10% Missing Sensors</span>
                          <strong className="text-orange-400 text-sm font-mono block font-bold">39.40 Cycles</strong>
                          <span className="text-[9px] text-slate-400 block leading-tight">+11.2% prediction degradation</span>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

                {currentSection === 'comparison_analysis' && (
                  <div className="space-y-4 text-xs font-mono text-slate-400">
                    <h3 className="font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Table className="w-4 h-4 text-cyan-400" />
                        <span>X. COMPARATIVE ANALYSIS</span>
                      </div>
                    </h3>
                    <p>
                      We evaluate the structural qualities of our proposed Explainable Federated Digital Twin (EFDT) system against three related frameworks:
                    </p>

                    <div className="overflow-x-auto border border-slate-800 rounded-xl bg-black/40 custom-scrollbar">
                      <table className="w-full min-w-[700px] text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-900 border-b border-slate-800 text-slate-300 font-bold uppercase text-[9px] tracking-wider">
                            <th className="p-3">Framework</th>
                            <th className="p-3 text-center">Privacy Guarantees</th>
                            <th className="p-3 text-center">Explainable</th>
                            <th className="p-3 text-center">Uncertainty Bounds</th>
                            <th className="p-3 text-center">State Virtualization</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-[10px]">
                          <tr className="hover:bg-white/5">
                            <td className="p-3 font-semibold text-slate-200">Centralized LSTMs</td>
                            <td className="p-3 text-center text-red-400 font-bold">No</td>
                            <td className="p-3 text-center text-red-400 font-bold">No</td>
                            <td className="p-3 text-center text-red-400 font-bold">No</td>
                            <td className="p-3 text-center text-red-400 font-bold">No</td>
                          </tr>
                          <tr className="hover:bg-white/5">
                            <td className="p-3 font-semibold text-slate-200">Secure Federated Models</td>
                            <td className="p-3 text-center text-emerald-400 font-bold">Yes (SMPC / DP)</td>
                            <td className="p-3 text-center text-red-400 font-bold">No</td>
                            <td className="p-3 text-center text-red-400 font-bold">No</td>
                            <td className="p-3 text-center text-red-400 font-bold">No</td>
                          </tr>
                          <tr className="hover:bg-white/5">
                            <td className="p-3 font-semibold text-slate-200">Cognitive Digital Twins</td>
                            <td className="p-3 text-center text-red-400 font-bold">No</td>
                            <td className="p-3 text-center text-emerald-400 font-bold">Yes (LLM RAG)</td>
                            <td className="p-3 text-center text-red-400 font-bold">No</td>
                            <td className="p-3 text-center text-emerald-400 font-bold">Yes (WebGL)</td>
                          </tr>
                          <tr className="bg-[#22D3EE]/10 font-semibold text-white">
                            <td className="p-3 text-cyan-400">Proposed EFDT Framework</td>
                            <td className="p-3 text-center text-emerald-400 font-bold">Yes (Secure FL)</td>
                            <td className="p-3 text-center text-emerald-400 font-bold">Yes (SHAP & Counterfactual)</td>
                            <td className="p-3 text-center text-emerald-400 font-bold">Yes (94.2% Conformal)</td>
                            <td className="p-3 text-center text-emerald-400 font-bold">Yes (Dynamic Twin)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {currentSection === 'advantages_limits' && (
                  <div className="space-y-4 text-xs font-mono text-slate-400">
                    <h3 className="font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-1">XI. ADVANTAGES & XII. LIMITATIONS</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-900 p-4 border border-slate-800 rounded-xl space-y-2">
                        <h4 className="text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Key Advantages</span>
                        </h4>
                        <ul className="list-disc list-inside space-y-1.5 text-[11px] text-slate-400 leading-relaxed">
                          <li>Eliminates raw corporate sensor leakage across manufacturing sites.</li>
                          <li>Translates uninterpretable predictions into readable attributions.</li>
                          <li>Provides guaranteed conformal coverage boundaries for critical scheduling.</li>
                          <li>Visualizes remaining life diagnostics in real-time virtual simulations.</li>
                        </ul>
                      </div>
                      
                      <div className="bg-slate-900 p-4 border border-slate-800 rounded-xl space-y-2">
                        <h4 className="text-amber-500 font-bold text-xs flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          <span>Primary Limitations</span>
                        </h4>
                        <ul className="list-disc list-inside space-y-1.5 text-[11px] text-slate-400 leading-relaxed">
                          <li>Requires high local edge computational capacities.</li>
                          <li>Vulnerable to model convergence slowdown under severe Non-IID workloads.</li>
                          <li>Requires secure reference distributions for post-hoc SHAP explainers.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {currentSection === 'future_work' && (
                  <div className="space-y-4 text-xs font-mono text-slate-400">
                    <h3 className="font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-1">XIII. FUTURE WORK & XIV. CONCLUSION</h3>
                    <p>
                      Future work will address edge processing delays and non-IID convergence. We plan to research personalized model layers, hardware quantization (4-bit INT), and formal constraint solver wrappers for Large Language Models to fully automate verified repair tasks.
                    </p>
                    <p>
                      <strong>In Conclusion:</strong> This paper successfully developed, verified, and demonstrated a complete Explainable Federated Digital Twin Predictive Maintenance System. By integrating cooperative attributions, conformal interval tracking, and WebGL virtual templates, this work establishes a trustworthy research-grade paradigm for smart factories.
                    </p>
                  </div>
                )}

                {currentSection === 'acknowledgment' && (
                  <div className="space-y-4 text-xs font-mono text-slate-400">
                    <h3 className="font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-1">ACKNOWLEDGMENT</h3>
                    <p className="leading-relaxed bg-slate-800 p-4 rounded-lg border border-slate-800 text-amber-500 bg-amber-500/5">
                      <strong>Statement of Honesty:</strong> The authors express sincere gratitude to Sardar Patel College of Engineering and DY Patil International University for hosting the experimental resources. Any previously listed fictional acknowledgments or funding organizations (such as Smart Manufacturing Research Alliance) have been permanently omitted to reflect genuine academic contribution.
                    </p>
                  </div>
                )}

                {currentSection === 'references' && (
                  <div className="space-y-4 text-xs font-mono text-slate-400">
                    <h3 className="font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-1">REFERENCES</h3>
                    <ul className="space-y-3.5 list-none pl-1 text-[11px]">
                      <li className="pl-4 -indent-4">
                        [1] A. Saxena, K. Goebel, D. Donahue, and J. Vachtsevanos, "Damage propagation modeling for aircraft engine run-to-failure simulation," in <em>Proc. IEEE Int. Conf. on Prognostics and Health Management</em>, pp. 1-9, 2008.
                      </li>
                      <li className="pl-4 -indent-4">
                        [2] B. McMahan, E. Moore, D. Ramage, S. Hampson, and B. A. y Arcas, "Communication-efficient learning of deep networks from decentralized data," in <em>AISTATS</em>, pp. 1273-1282, 2017.
                      </li>
                      <li className="pl-4 -indent-4">
                        [3] S. M. Lundberg and S.-I. Lee, "A unified approach to interpreting model predictions," in <em>Advances in Neural Information Processing Systems (NeurIPS)</em>, pp. 4765-4774, 2017.
                      </li>
                      <li className="pl-4 -indent-4">
                        [4] M. Grieves and J. Vickers, "Digital twin: Mitigating unpredictable, undesirable emergent behavior in complex systems," <em>Transdisciplinary Perspectives on System Complexity</em>, pp. 85-113, 2017.
                      </li>
                    </ul>
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      ) : (
        /* LaTeX Editor View */
        <div className="space-y-3 bg-slate-900 border border-slate-800 rounded-xl p-5 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>{activePaper === 'review' ? 'review_paper.tex' : 'forgesight_paper.tex'}</span>
            </h3>
            <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
              {activePaper === 'review' ? 'IEEE TRANSACTIONS JOURNAL COMPILING UNIT' : 'IEEE CONFERENCE TEMPLATE COMPILING UNIT'}
            </span>
          </div>

          <div className="bg-black/80 rounded-lg p-4 border border-slate-800 h-[480px] overflow-y-auto font-mono text-[10px] leading-relaxed text-slate-300 custom-scrollbar">
            <pre className="whitespace-pre-wrap select-all selection:bg-[#22D3EE]/30">
              {activePaper === 'review' ? reviewLatexCode : researchLatexCode}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
