/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Represents a single time-step log record for a turbofan engine unit
 * in the NASA C-MAPSS dataset.
 */
export interface EngineRecord {
  unitId: number;
  cycle: number;
  setting1: number;
  setting2: number;
  setting3: number;
  sensors: number[]; // 21 high-dimensional sensory readings
}

/**
 * Formatted sequential window input-target tensor representation
 * suitable for feeding directly to recurrent or attention-based deep learning pipelines.
 */
export interface WindowedSequence {
  id: number;
  unitId: number;
  endCycle: number;
  inputs: number[][]; // Matrix dimensions: [WindowSize] x [Sensors (21)]
  targetRul: number;  // Capped piecewise linear Remaining Useful Life (RUL)
}

/**
 * Statistical properties of the sensory channels computed on the training set
 * to standardize and normalize incoming live or testing telemetry.
 */
export interface NormalizationStats {
  means: number[];
  stds: number[];
}

/**
 * Robust, production-ready DatasetManager service that encapsulates 
 * loading, group-wise partitioning, Z-score standardizing, and 
 * high-fidelity sliding-window sequence formulation of the NASA C-MAPSS FD001 dataset.
 */
export class DatasetManager {
  private records: EngineRecord[] = [];
  private stats: NormalizationStats | null = null;

  /**
   * Initializes the DatasetManager with an optional array of existing engine records.
   */
  constructor(records?: EngineRecord[]) {
    if (records) {
      this.records = [...records];
    }
  }

  /**
   * Ingests a raw text representation of the C-MAPSS dataset (space-separated standard or fallback CSV).
   * Parses the standard 26-column schema:
   *  - Columns 1-2: Unit ID, Cycle
   *  - Columns 3-5: Operational Settings 1, 2, and 3
   *  - Columns 6-26: Sensors 1 through 21
   */
  public loadFromString(rawText: string): void {
    const lines = rawText.split(/\r?\n/).filter(line => line.trim().length > 0);
    const parsed: EngineRecord[] = [];

    for (const line of lines) {
      const delimiters = /\s+/;
      let tokens = line.trim().split(delimiters).map(Number);
      
      // Fallback to comma-separated values if space delimiter didn't yield columns
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
      throw new Error("Ingestion Failed: No valid records with at least 26 numerical columns were found.");
    }

    this.records = parsed;
    this.stats = null; // Flush any old normalization stats
  }

  /**
   * Loads structured engine records directly.
   */
  public loadRecords(records: EngineRecord[]): void {
    this.records = [...records];
    this.stats = null;
  }

  /**
   * Retrieves a copy of the parsed engine records.
   */
  public getRecords(): EngineRecord[] {
    return [...this.records];
  }

  /**
   * Identifies all unique engine unit IDs in the dataset.
   */
  public getUnitIds(): number[] {
    const units = new Set<number>();
    this.records.forEach(r => units.add(r.unitId));
    return Array.from(units).sort((a, b) => a - b);
  }

  /**
   * Splits unique machine units into training and testing indices to preserve engine integrity.
   * This partition method prevents transductive temporal data leakage during sliding window creation.
   * 
   * @param trainRatio Portion of unit IDs to keep in training (default: 0.8 / 80%)
   * @param preserveUnitSequence If true, keeps chronological order of unit IDs; if false, shuffles them.
   */
  public splitUnits(trainRatio: number = 0.8, preserveUnitSequence: boolean = true): { trainUnits: number[]; testUnits: number[] } {
    const uniqueUnits = this.getUnitIds();

    if (preserveUnitSequence) {
      const splitIdx = Math.max(1, Math.round(uniqueUnits.length * trainRatio));
      return {
        trainUnits: uniqueUnits.slice(0, splitIdx),
        testUnits: uniqueUnits.slice(splitIdx)
      };
    } else {
      const shuffled = [...uniqueUnits].sort(() => Math.random() - 0.5);
      const splitIdx = Math.max(1, Math.round(shuffled.length * trainRatio));
      return {
        trainUnits: shuffled.slice(0, splitIdx).sort((a, b) => a - b),
        testUnits: shuffled.slice(splitIdx).sort((a, b) => a - b)
      };
    }
  }

  /**
   * Fits Z-Score Standardization (computing mean and standard deviation) on each 
   * sensory channel, strictly using the designated Training Units.
   * Fits are kept inside the class state for use in subsequent scaling.
   * 
   * @param trainUnitIds List of Unit IDs to train on.
   */
  public fitNormalization(trainUnitIds: number[]): NormalizationStats {
    const trainRecords = this.records.filter(r => trainUnitIds.includes(r.unitId));
    const numSensors = 21;
    
    if (trainRecords.length === 0) {
      throw new Error("Normalization Fit Error: No matching training records found.");
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
      const computedStd = Math.sqrt(variance);
      // Fallback to 1.0 standard deviation to prevent divisions by zero on invariant sensory lines
      return computedStd === 0 ? 1.0 : computedStd;
    });

    this.stats = { means, stds };
    return this.stats;
  }

  /**
   * Normalizes a sensor array using the fitted Z-score statistics.
   * 
   * @param sensors Array of 21 raw sensor values.
   */
  public normalizeSensors(sensors: number[]): number[] {
    if (!this.stats) {
      throw new Error("Transformation Error: Normalization parameters must be fitted (fitNormalization) before standardizing.");
    }
    return sensors.map((val, idx) => {
      const mean = this.stats!.means[idx];
      const std = this.stats!.stds[idx];
      return (val - mean) / std;
    });
  }

  /**
   * Generates sequential 3D matrix windows by sliding a frame across the operational timeline.
   * RUL target labels are capped using piecewise linear modeling (standard C-MAPSS convention).
   * 
   * @param unitIds Machine units to generate sliding sequences for.
   * @param windowSize Sequential historical timeline depth.
   * @param stride Offset increment for each sliding frame (default: 1 step).
   * @param rulCapping Cap value on high RUL indices during steady operating state (default: 125 cycles).
   */
  public generateSequences(
    unitIds: number[],
    windowSize: number,
    stride: number = 1,
    rulCapping: number = 125
  ): WindowedSequence[] {
    if (!this.stats) {
      throw new Error("Pipeline Error: Cannot generate sequences before fitting normalization parameters.");
    }

    const sequences: WindowedSequence[] = [];
    let seqId = 1;

    for (const unitId of unitIds) {
      // Isolate and chronologically order data steps for the target unit
      const unitRecords = this.records
        .filter(r => r.unitId === unitId)
        .sort((a, b) => a.cycle - b.cycle);
      
      const maxCycle = unitRecords.length;

      // Sliding window loops
      for (let t = windowSize; t <= maxCycle; t += stride) {
        const windowSlice = unitRecords.slice(t - windowSize, t);
        
        // Map elements into standardized floating point arrays
        const normalizedInputs = windowSlice.map(r => this.normalizeSensors(r.sensors));

        // Piecewise linear RUL designation
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
    }

    return sequences;
  }

  /**
   * Directly retrieves the fitted mean and standard deviation matrices.
   */
  public getNormalizationStats(): NormalizationStats | null {
    return this.stats;
  }
}
