/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface EngineRecord {
  unitId: number;
  cycle: number;
  setting1: number;
  setting2: number;
  setting3: number;
  sensors: number[]; // 21 C-MAPSS sensors
}

export interface WindowedSequence {
  id: number;
  unitId: number;
  endCycle: number;
  inputs: number[][]; // [windowSize][21] - normalized sensor readings
  targetRul: number;  // piecewise linear RUL target
}

export interface NormalizationStats {
  means: number[];
  stds: number[];
}

/**
 * Class-based manager for loading, partitioning, scaling, and windowing
 * the high-fidelity NASA C-MAPSS Turbofan engine degradation dataset (FD001).
 */
export class CMAPSSDatasetManager {
  private records: EngineRecord[] = [];
  private stats: NormalizationStats | null = null;

  constructor(records?: EngineRecord[]) {
    if (records) {
      this.records = [...records];
    }
  }

  /**
   * Ingests raw text representation of C-MAPSS FD001 data.
   * Expects standard 26-column space-delimited format:
   * Col 1: Unit ID
   * Col 2: Cycle
   * Col 3-5: Operational settings
   * Col 6-26: Sensors 1 to 21
   */
  public loadFromString(rawText: string): void {
    const lines = rawText.split(/\r?\n/).filter(line => line.trim().length > 0);
    const parsed: EngineRecord[] = [];

    for (const line of lines) {
      // Support space-separated (FD001 standard) or fallback to comma-separated
      const delimiters = /\s+/;
      let tokens = line.trim().split(delimiters).map(Number);
      
      if (tokens.length < 26) {
        tokens = line.trim().split(',').map(Number);
      }

      if (tokens.length >= 26 && !tokens.some(isNaN)) {
        parsed.push({
          unitId: tokens[0],
          cycle: tokens[1],
          setting1: tokens[2],
          setting2: tokens[3],
          setting3: tokens[4],
          sensors: tokens.slice(5, 26)
        });
      }
    }

    if (parsed.length === 0) {
      throw new Error("C-MAPSS parsing failure: No records matching 26 columns could be ingested.");
    }

    this.records = parsed;
    this.stats = null; // Reset stats on reloading data
  }

  /**
   * Load records directly from structural objects.
   */
  public loadRecords(records: EngineRecord[]): void {
    this.records = [...records];
    this.stats = null;
  }

  /**
   * Returns copy of stored engine records.
   */
  public getRecords(): EngineRecord[] {
    return [...this.records];
  }

  /**
   * Identifies all unique machine Unit IDs.
   */
  public getUnitIds(): number[] {
    const units = new Set<number>();
    this.records.forEach(r => units.add(r.unitId));
    return Array.from(units).sort((a, b) => a - b);
  }

  /**
   * Enforces machine-unit boundaries to split turbofans into Train & Test sets.
   * This is critical to prevent transductive leakage between windowed subsequences.
   * 
   * @param trainRatio Decimal ratio for split (e.g., 0.8 for 80%)
   * @param preventLeakage If true, group-by-unit is enforced.
   */
  public splitUnits(trainRatio: number = 0.8, preventLeakage: boolean = true): { trainUnits: number[]; testUnits: number[] } {
    const uniqueUnits = this.getUnitIds();

    if (preventLeakage) {
      // Group-by-Unit split
      const splitIdx = Math.max(1, Math.round(uniqueUnits.length * trainRatio));
      return {
        trainUnits: uniqueUnits.slice(0, splitIdx),
        testUnits: uniqueUnits.slice(splitIdx)
      };
    } else {
      // Random shuffle split (Note: still respects unit boundaries to prevent overlapping, but randomised)
      const shuffled = [...uniqueUnits].sort(() => Math.random() - 0.5);
      const splitIdx = Math.max(1, Math.round(shuffled.length * trainRatio));
      return {
        trainUnits: shuffled.slice(0, splitIdx).sort((a, b) => a - b),
        testUnits: shuffled.slice(splitIdx).sort((a, b) => a - b)
      };
    }
  }

  /**
   * Computes Z-Score Normalization parameters (mean, standard deviation)
   * exclusively on the Training Units to prevent transductive data leakage.
   * 
   * @param trainUnitIds Array of unit IDs designated for training
   */
  public fitNormalization(trainUnitIds: number[]): NormalizationStats {
    const trainRecords = this.records.filter(r => trainUnitIds.includes(r.unitId));
    const numSensors = 21;
    
    if (trainRecords.length === 0) {
      throw new Error("Cannot fit normalization: No training records found matching specified Unit IDs.");
    }

    const sums = Array(numSensors).fill(0);
    trainRecords.forEach(r => {
      r.sensors.forEach((val, idx) => {
        sums[idx] += val;
      });
    });

    const means = sums.map(sum => sum / trainRecords.length);
    const sqDiffSums = Array(numSensors).fill(0);

    trainRecords.forEach(r => {
      r.sensors.forEach((val, idx) => {
        sqDiffSums[idx] += Math.pow(val - means[idx], 2);
      });
    });

    const stds = sqDiffSums.map(sum => {
      const variance = sum / trainRecords.length;
      return Math.sqrt(variance) || 1.0; // Fallback to 1.0 to avoid division by zero for invariant sensors
    });

    this.stats = { means, stds };
    return this.stats;
  }

  /**
   * Normalizes a single 21-channel sensory readings array using the Z-Score stats.
   */
  public normalizeSensors(sensors: number[]): number[] {
    if (!this.stats) {
      throw new Error("Normalization stats have not been fitted. Call fitNormalization first.");
    }
    return sensors.map((val, idx) => {
      const mean = this.stats!.means[idx];
      const std = this.stats!.stds[idx];
      return (val - mean) / std;
    });
  }

  /**
   * Slides a temporal window over each designated unit sequence and generates tensors.
   * Employs standard ML Piecewise Linear RUL capping logic for targets.
   * 
   * @param unitIds Target turbofans
   * @param windowSize Sequential length of history
   * @param stride Stepping size of the window
   * @param rulCapping Constant to cap maximum RUL target
   * @param alternateNormType Optional choice of minmax scaling if standard Z-score is bypassed
   */
  public generateSequences(
    unitIds: number[],
    windowSize: number,
    stride: number = 1,
    rulCapping: number = 125,
    alternateNormType?: 'minmax_01' | 'minmax_11'
  ): WindowedSequence[] {
    const sequences: WindowedSequence[] = [];
    let seqId = 1;

    unitIds.forEach(unitId => {
      // Retrieve and sort chronological steps for this unit
      const unitRecords = this.records
        .filter(r => r.unitId === unitId)
        .sort((a, b) => a.cycle - b.cycle);
      
      const maxCycle = unitRecords.length;

      // Sliding window
      for (let t = windowSize; t <= maxCycle; t += stride) {
        const windowSlice = unitRecords.slice(t - windowSize, t);
        
        // Normalize each time-step
        const normalizedInputs = windowSlice.map(r => {
          if (alternateNormType) {
            // Apply MinMax scaling based on records
            return r.sensors.map((val, sIdx) => {
              const allSensorVals = this.records.map(rec => rec.sensors[sIdx]);
              const min = Math.min(...allSensorVals);
              const max = Math.max(...allSensorVals);
              const range = max - min || 1;
              if (alternateNormType === 'minmax_01') {
                return (val - min) / range;
              } else {
                return 2 * ((val - min) / range) - 1;
              }
            });
          } else {
            // Standard Z-Score normalization
            return this.normalizeSensors(r.sensors);
          }
        });

        // Compute RUL
        const trueRul = maxCycle - t;
        const targetRul = Math.min(rulCapping, trueRul);

        sequences.push({
          id: seqId++,
          unitId,
          endCycle: t,
          inputs: normalizedInputs,
          targetRul
        });
      }
    });

    return sequences;
  }

  /**
   * Helper to retrieve current normalization stats.
   */
  public getNormalizationStats(): NormalizationStats | null {
    return this.stats;
  }
}
