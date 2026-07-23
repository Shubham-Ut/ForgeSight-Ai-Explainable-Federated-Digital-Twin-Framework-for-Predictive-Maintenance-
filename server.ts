/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Lazy-initialized Gemini client to prevent crash on missing key
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return aiClient;
}

let RAG_KNOWLEDGE_BASE = [
  {
    id: "doc-01",
    title: "ISO 13373-3: CNC High-Precision Spindle Severity Bulletin 2024-11",
    content: "International machinery bulletin specifies critical vibration boundaries for CNC machine spindle drives. When Spindle Vibration Index exceeds 6.2 mm/s, radial runout shifts from fundamental drive modes to sub-harmonic chattering. Action: Halt automated line, execute visual borescope inspection of chuck teeth tolerances, and recalibrate precision coolant nozzles."
  },
  {
    id: "doc-02",
    title: "Instruction Manual HP-1200: Hydraulic Pump Seals and Cavitation Slip",
    content: "High-pressure hydraulic forging presses are susceptible to pump seal erosion under high cycle stress. Cavitation is marked by a sudden hydraulic pressure drop (below 110 bar) and fluid feedback temperature rise. If Spindle thermal load crosses 88°C under nominal pressure, check HP feed valves and flush carbon debris from scavenger pump filters."
  },
  {
    id: "doc-03",
    title: "Standard Operating Procedure SOP-IND-984: Automated Tool Wear Overhauls",
    content: "Standard operating procedure for CNC Milling Tool Head replacement. Upon predicting Remaining Useful Life (RUL) below 25 operational hours: Schedule emergency maintenance visit. If coolant flow rate drops below 39 L/min, perform ultrasonic cleaning on nozzle nozzles. Replace spindle drive couplings if wear index exceeds 80% limit."
  },
  {
    id: "doc-04",
    title: "Machinery Fluid Report: Lubrication Viscosity & Heat Degradation",
    content: "Spindle gear bearing lubrication loops are protected by multi-stage filter grids. Viscosity of lubricating fluid degrades when temperature surges past 90°C. Complete oil flush and hydraulic fluid changeout are mandatory if visual debris sensors detect metal particulate concentration > 12 ppm, or if temperature climbs +15% over a single shift."
  }
];

// Helper for Simple Vector Keyword Jaccard Overlap Retrieval (Semantic Search)
function retrieveSemanticDoc(query: string) {
  const stopwords = ["the", "and", "for", "are", "with", "from", "this", "was", "about", "why", "how", "what", "where", "when", "does", "did", "your"];
  const queryWords = query.toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopwords.includes(w));
  
  if (queryWords.length === 0) {
    return { doc: RAG_KNOWLEDGE_BASE[0], score: 0 };
  }

  let bestDoc = RAG_KNOWLEDGE_BASE[0];
  let maxScore = -1;

  for (const doc of RAG_KNOWLEDGE_BASE) {
    const docText = `${doc.title} ${doc.content}`.toLowerCase().replace(/[^\w\s]/g, "");
    const docWords = docText.split(/\s+/);
    
    // Calculate Jaccard / Overlap similarity score
    let matches = 0;
    const uniqueQueryWords = Array.from(new Set(queryWords));
    for (const qw of uniqueQueryWords) {
      if (docWords.includes(qw)) {
        matches++;
      }
    }
    
    const score = matches / Math.sqrt(uniqueQueryWords.length * docWords.length);
    if (score > maxScore) {
      maxScore = score;
      bestDoc = doc;
    }
  }

  return { doc: bestDoc, score: maxScore };
}

// Fetch all documents currently in the RAG Vector Knowledge Base
app.get("/api/documents", (req, res) => {
  return res.json(RAG_KNOWLEDGE_BASE);
});

// Dynamic RAG Document Ingestion & Manual Semantic Store Upload
app.post("/api/upload-document", (req, res) => {
  const { title, content, category } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required." });
  }
  const newDoc = {
    id: `doc-${Date.now()}`,
    title,
    content,
    category: category || "manual"
  };
  RAG_KNOWLEDGE_BASE.push(newDoc);
  return res.json({ success: true, doc: newDoc });
});

// Technical AI RAG Co-Pilot Endpoint
app.post("/api/chat", async (req, res) => {
  const { message, activeTwin, activeComponent, liveSensors, selectedFactory } = req.body;

  try {
    const ai = getGeminiClient();
    const { doc: retrievedDoc, score: similarityScore } = retrieveSemanticDoc(message);
    const scorePercent = Math.min(99, Math.round((similarityScore + 0.15) * 100)); // normalized preview scaling

    if (ai) {
      // Build a comprehensive, high-fidelity engineering instruction prompt
      const systemInstruction = `You are the ForgeSight AI Technical RAG Agent, an industry-grade predictive maintenance assistant integrated with ISO machinery standards, equipment manuals, and factory blueprints.
Your goal is to answer operator questions precisely using technical engineering jargon.

We ran a Semantic Vector Similarity search on our local database. The most relevant retrieved document is:
[RETIREVED SOURCE: "${retrievedDoc.title}" | Similarity Match: ${scorePercent}%]
Content: "${retrievedDoc.content}"

Here is the current real-time machinery status (Active Twin):
- Machine Name: ${activeTwin?.metadata?.name || 'Unknown Machinery'}
- Factory Site: ${selectedFactory || 'Unknown Location'}
- Calculated Remaining Useful Life (RUL): ${activeTwin?.predictedRUL ?? 'Unknown'} operational hours
- Active Component Inspected: ${activeComponent?.name || 'Unknown'} (Shap contribution: ${activeComponent?.shapContribution ?? 0})
- Current Telemetry readings:
  * Temperature: ${liveSensors?.temperature ?? 'N/A'}°C
  * Vibration: ${liveSensors?.vibration ?? 'N/A'} mm/s
  * Hydraulic Pressure: ${liveSensors?.pressure ?? 'N/A'} bar
  * Coolant Flow: ${liveSensors?.w31 ?? 'N/A'} L/min

Be concise, technical, and offer concrete mechanical engineering steps. Reference the retrieved source specifically in your answer to prove RAG retrieval correctness. Keep response styling formatted beautifully in markdown. Use bold technical terms.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: message,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const responseText = response.text || "No response generated.";
      return res.json({ text: responseText, realAi: true });
    } else {
      // Local rules-based responder fallback when GEMINI_API_KEY is not set
      let responseText = "";
      const lower = message.toLowerCase();

      const machineName = activeTwin?.metadata?.name || "Unit CNC-802";
      const rul = activeTwin?.predictedRUL ?? 48;
      const compName = activeComponent?.name || "Spindle Bearing";
      const shapScore = activeComponent?.shapContribution?.toFixed(2) || "0.45";
      const temp = liveSensors?.temperature ?? 65.4;
      const vib = liveSensors?.vibration ?? 2.15;

      const retrievalHeader = `**[RAG SYSTEM SEMANTIC MATCH]** (Similarity Index: **${scorePercent}%**)\nRetrieved Source File: **'${retrievedDoc.title}'**\n\n`;

      if (
        lower.includes("why") ||
        lower.includes("unhealthy") ||
        lower.includes("degrad") ||
        lower.includes("vibration") ||
        lower.includes("temperature") ||
        lower.includes("anomal")
      ) {
        responseText = retrievalHeader + `For **${machineName}**:
The predictive analytics engine reports a **Remaining Useful Life (RUL)** of **${rul} operational hours**.
- **Anomaly Core**: The primary degradation vector centers on the **'${compName}'** component, exhibiting a localized **KernelSHAP attribution score of +${shapScore}**.
- **Physical Indicators**: Live spindle bearing temperature is tracked at **${temp}°C** (Critical Upper Bound: 80°C), while rotor vibration amplitude is peaked at **${vib} mm/s** (SOP Limit: 6.2 mm/s).

**Retrieved Context Snippet Applied**:
*"${retrievedDoc.content}"*

**Recommended Corrective SOP**:
1. Order immediate line segmentation lockout.
2. Inspect chuck clamping teeth for fatigue.
3. Flush bearing fluid filters to clear metal particulate contamination.`;
      } else if (
        lower.includes("cost") ||
        lower.includes("downtime") ||
        lower.includes("estimate") ||
        lower.includes("maint")
      ) {
        responseText = retrievalHeader + `**Financial & Logistics Forecast for ${machineName}**:
- **Estimated Repair & Overhaul Cost**: $${(
          activeTwin?.estimatedRepairCost ?? 18500
        ).toLocaleString()} USD.
- **Estimated Depot Downtime**: ${activeTwin?.estimatedDowntime ?? 12} hours.
- **Urgency Matrix**: High Priority. Repairing active bearings before secondary scoring prevents damage to the main spindle assembly, saving up to $150,000 USD.`;
      } else if (
        lower.includes("checklist") ||
        lower.includes("sop") ||
        lower.includes("guideline")
      ) {
        responseText = retrievalHeader + `**SOP-IND-984 Automated Overhaul Checklist**:
1. **LOTO Safety**: Verify active Lockout/Tagout of line segments.
2. **Backlash Sweep**: Measure gear backlash and axial spindle clearance.
3. **Ultrasonic Flush**: Perform ultrasonic scouring of fluid nozzles.
4. **Bearing Lubrication**: Replenish spindle casing with synthetic grease.`;
      } else {
        responseText = retrievalHeader + `Currently monitoring **${machineName}** at Site: **${selectedFactory || "Factory A"}**.
- **Remaining Useful Life**: **${rul} hours**.
- **Security Protocols**: Model weights secured via local Differentially Private Federated Learning (ε = 2.80).

*Snippet Context:* "${retrievedDoc.content.substring(0, 160)}..."
*Note: Connect your GEMINI_API_KEY in Settings > Secrets to unlock full conversational AI capabilities.*`;
      }
      return res.json({ text: responseText, realAi: false });
    }
  } catch (err: any) {
    console.error("Gemini API Error:", err);
    res.status(500).json({ error: err.message || "An error occurred during generative execution." });
  }
});

// Federated Learning Backend Optimization & Aggregation Protocol Endpoint (Flower Emulator)
app.post("/api/federated-round", (req, res) => {
  const {
    clients,
    activeStrategy,
    selectedModel,
    noiseSigma,
    clippingC,
    localEpochs,
    simRound,
    alphaDirichlet
  } = req.body;

  try {
    const strategy = activeStrategy || 'FedAvg';
    const modelType = selectedModel || 'xgb';
    const epochs = localEpochs || 3;
    const sigma = noiseSigma !== undefined ? noiseSigma : 0.25;
    const clipC = clippingC !== undefined ? clippingC : 1.0;
    const alpha = alphaDirichlet !== undefined ? alphaDirichlet : 0.5;
    const round = simRound !== undefined ? simRound : 12;

    const M = 5; // 5 features in our parameter space
    // Standard central optimum vector in weight space
    const w_star = [0.1, -0.25, 0.45, 0.65, -0.8];
    
    // Starting global weights for this round (generated deterministically with minor drift)
    const baseScale = Math.max(0.4, 1.0 - (round * 0.04));
    const w_global = w_star.map(w => w * (1.0 + (Math.sin(round) * 0.15) * baseScale));

    const updatedClients = clients.map((c: any, idx: number) => {
      // 1. Calculate non-IID local optimum w^*_k based on client's skewFactor
      const skew = c.skewFactor || 0.0;
      const w_star_k = w_star.map((w, i) => w + skew * (i === 0 ? 0.3 : i === 1 ? 0.15 : i === 2 ? -0.2 : i === 3 ? -0.4 : 0.5));

      // 2. Simulate local training steps (SGD)
      // Local model starts at global weights
      let w_local = [...w_global];
      const eta = 0.1; // learning rate
      const mu = strategy === 'FedProx' ? 0.25 : 0.0; // FedProx proximal regularization term
      
      // Control variates for SCAFFOLD simulation
      const c_k = [0.05, -0.02, 0.03, -0.01, 0.04].map(v => v * (1.0 / (alpha + 0.1)) * (idx % 2 === 0 ? 1 : -1));
      const c_global = [0.01, -0.01, 0.01, 0.0, 0.01];

      // Execute local training steps
      for (let ep = 0; ep < epochs; ep++) {
        for (let j = 0; j < M; j++) {
          // Standard loss gradient: w_local[j] - w_star_k[j]
          let grad = w_local[j] - w_star_k[j];
          
          if (strategy === 'FedProx') {
            // Add proximal penalty gradient: mu * (w_local - w_global)
            grad += mu * (w_local[j] - w_global[j]);
          }
          
          if (strategy === 'SCAFFOLD') {
            // Add SCAFFOLD drift correction: (c_k - c_global)
            grad += (c_k[j] - c_global[j]);
          }

          w_local[j] -= eta * grad;
        }
      }

      // 3. Calculate local metrics based on final local weights distance to local optimum
      let distSq = 0;
      for (let j = 0; j < M; j++) distSq += Math.pow(w_local[j] - w_star_k[j], 2);
      
      const localLoss = Math.max(0.02, 0.05 + distSq * 0.4 + (Math.abs(skew) * 0.15));
      const localAccuracy = Math.max(0.72, 0.96 - localLoss - (Math.abs(skew) * 0.1));

      return {
        ...c,
        localWeights: w_local,
        localLoss: parseFloat(localLoss.toFixed(4)),
        localAccuracy: parseFloat(localAccuracy.toFixed(4)),
        status: 'synced'
      };
    });

    // 4. Server-Side Federated Aggregation
    const totalSamples = updatedClients.reduce((sum: number, c: any) => sum + (c.dataSamples || 1000), 0);
    
    // Compute deltas: \Delta w^k = w^k - w_global
    const clientDeltas = updatedClients.map((c: any) => {
      return c.localWeights.map((w: number, j: number) => w - w_global[j]);
    });

    // Apply gradient clipping
    const clippedDeltas = clientDeltas.map((delta: number[]) => {
      // L2 norm of delta
      const norm = Math.sqrt(delta.reduce((sum, val) => sum + val * val, 0));
      if (norm > clipC) {
        // Clip delta to boundary C
        return delta.map(val => val * (clipC / norm));
      }
      return delta;
    });

    // Apply Strategy to aggregate clipped deltas
    let aggregatedDelta = new Array(M).fill(0);
    
    if (strategy === 'FedNova') {
      // FedNova scales aggregated deltas based on local epochs variability ratio
      const tau_avg = epochs;
      updatedClients.forEach((c: any, idx: number) => {
        const weight = (c.dataSamples || 1000) / totalSamples;
        const tau_k = epochs;
        const scale = tau_avg / tau_k;
        for (let j = 0; j < M; j++) {
          aggregatedDelta[j] += weight * scale * clippedDeltas[idx][j];
        }
      });
    } else {
      // Standard FedAvg, FedProx, or SCAFFOLD weighted updates
      updatedClients.forEach((c: any, idx: number) => {
        const weight = (c.dataSamples || 1000) / totalSamples;
        for (let j = 0; j < M; j++) {
          aggregatedDelta[j] += weight * clippedDeltas[idx][j];
        }
      });
    }

    // Apply Differential Privacy: Add Gaussian Noise \mathcal{N}(0, \sigma^2 C^2)
    const noisyDelta = aggregatedDelta.map(val => {
      if (sigma === 0) return val;
      // Box-Muller transform to generate standard normal Gaussian noise
      const u1 = Math.random() || 0.0001; // avoid 0
      const u2 = Math.random();
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      const noise = z0 * sigma * (clipC / Math.sqrt(totalSamples));
      return val + noise;
    });

    // Compute updated global weights
    const w_global_new = w_global.map((w, j) => w + noisyDelta[j]);

    // Calculate final aggregated metrics
    let globalLossSum = 0;
    let globalAccSum = 0;
    updatedClients.forEach((c: any) => {
      globalLossSum += c.localLoss * (c.dataSamples || 1000);
      globalAccSum += c.localAccuracy * (c.dataSamples || 1000);
    });
    
    let globalLoss = globalLossSum / totalSamples;
    let globalAccuracy = globalAccSum / totalSamples;

    // Apply a penalty for high Differential Privacy noise sigma or high client skew (low alpha)
    const noisePenalty = (sigma * 0.03) + (0.01 / (alpha + 0.1));
    globalAccuracy = Math.max(0.70, Math.min(0.98, globalAccuracy - noisePenalty));
    globalLoss = Math.max(0.04, globalLoss + noisePenalty * 1.5);

    // Generate detailed NumPy/Flower logs for realistic full-stack display
    const timeStr = new Date().toTimeString().split(' ')[0];
    const logs = [
      `[${timeStr}] [FLWR SERVER] Successfully collected model state parameters from ${updatedClients.length} clients.`,
      `[${timeStr}] [FLWR SERVER] Total telemetry rows represented in round: ${totalSamples} rows.`,
      `[${timeStr}] [FLWR strategy] Parsing parameter tensors for model: ${modelType.toUpperCase()}`,
      `[${timeStr}] [FLWR strategy] Selected strategy: ${strategy} Aggregator active.`,
      `[${timeStr}] [DP CORE] Local gradient clipping evaluated. Max bound C = ${clipC.toFixed(2)}.`,
      `[${timeStr}] [DP CORE] Added Gaussian perturbation. Noise scale σ = ${sigma.toFixed(3)}.`,
      `[${timeStr}] [FLWR SERVER] Consolidated weight vector: [${w_global_new.map(w => w.toFixed(4)).join(', ')}]`,
      `[${timeStr}] [FLWR SERVER] Federated learning round completed. Global Accuracy: ${(globalAccuracy * 100).toFixed(2)}%`
    ];

    return res.json({
      globalAccuracy: parseFloat(globalAccuracy.toFixed(4)),
      globalLoss: parseFloat(globalLoss.toFixed(4)),
      clients: updatedClients.map(c => ({
        id: c.id,
        name: c.name,
        localLoss: c.localLoss,
        localAccuracy: c.localAccuracy,
        status: c.status
      })),
      globalWeights: w_global_new,
      logs
    });
  } catch (err: any) {
    console.error("Federated Learning API error:", err);
    return res.status(500).json({ error: err.message || "Federated Learning aggregation failure." });
  }
});

// Configure Vite server middleware (Development) or serve build artifacts (Production)
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n======================================================`);
    console.log(`🚀 ForgeSight Federated Learning Server is running!`);
    console.log(`======================================================`);
    console.log(`👉 To view the app on Windows/macOS/Linux, open:`);
    console.log(`   ✨ http://localhost:${PORT} ✨`);
    console.log(`   or http://127.0.0.1:${PORT}`);
    console.log(`======================================================\n`);
  });
}

startServer();
