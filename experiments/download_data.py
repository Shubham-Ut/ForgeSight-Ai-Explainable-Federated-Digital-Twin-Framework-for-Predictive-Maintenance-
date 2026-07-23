import os
from pathlib import Path
import numpy as np

DATASET_DIR = Path(r"c:\Users\shubh\Downloads\explainable-federated-digital-twin-predictive-maintenance-system (4)\ml\datasets\cmapss")

def generate_synthetic_cmapss():
    print("Generating synthetic C-MAPSS dataset (FD001) for self-contained execution...")
    DATASET_DIR.mkdir(parents=True, exist_ok=True)
    
    np.random.seed(42)
    
    train_lines = []
    test_lines = []
    rul_lines = []
    
    for unit in range(1, 101):
        max_cycles = np.random.randint(130, 362)
        settings = [0.001, 0.0002, 100.0]
        sensor_bases = [518.67, 642.5, 1589.0, 1400.0, 14.62, 21.61, 554.0, 2388.0, 9044.0, 1.3, 47.5, 521.8, 2388.0, 8138.0, 8.4, 0.03, 392.0, 2388.0, 100.0, 39.0, 23.3]
        
        for cycle in range(1, max_cycles + 1):
            t = cycle / max_cycles
            row = [unit, cycle]
            row.extend(settings)
            
            for i, base in enumerate(sensor_bases):
                if i in [1, 2, 3, 6, 7, 8, 10, 11, 12, 13, 14, 16, 19, 20]:
                    drift = t * np.random.uniform(2.0, 15.0) * (1 if i%2==0 else -1)
                    noise = np.random.normal(0, base * 0.01)
                    row.append(round(base + drift + noise, 4))
                else:
                    row.append(round(base + np.random.normal(0, base * 0.001), 4))
            train_lines.append(" ".join(map(str, row)))
            
        test_max = np.random.randint(30, max_cycles - 10)
        final_rul = max_cycles - test_max
        rul_lines.append(str(final_rul))
        
        for cycle in range(1, test_max + 1):
            t = cycle / max_cycles
            row = [unit, cycle]
            row.extend(settings)
            for i, base in enumerate(sensor_bases):
                if i in [1, 2, 3, 6, 7, 8, 10, 11, 12, 13, 14, 16, 19, 20]:
                    drift = t * np.random.uniform(2.0, 15.0) * (1 if i%2==0 else -1)
                    noise = np.random.normal(0, base * 0.01)
                    row.append(round(base + drift + noise, 4))
                else:
                    row.append(round(base + np.random.normal(0, base * 0.001), 4))
            test_lines.append(" ".join(map(str, row)))

    with open(DATASET_DIR / "train_FD001.txt", "w") as f:
        f.write("\n".join(train_lines) + "\n")
        
    with open(DATASET_DIR / "test_FD001.txt", "w") as f:
        f.write("\n".join(test_lines) + "\n")
        
    with open(DATASET_DIR / "RUL_FD001.txt", "w") as f:
        f.write("\n".join(rul_lines) + "\n")
        
    print(f"Synthetic C-MAPSS dataset generated successfully at {DATASET_DIR}.")

if __name__ == "__main__":
    generate_synthetic_cmapss()
