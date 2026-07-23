"""
ForgeSight AI — Robustness Evaluation
Evaluates model performance under Gaussian noise, missing values, and sensor drift.
"""
import json
import sys
from pathlib import Path

import numpy as np
from sklearn.metrics import mean_absolute_error
import joblib

WORKSPACE_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(WORKSPACE_ROOT))

from ml.preprocessing.cmapss_loader import load_cmapss_fd
from ml.preprocessing.feature_engineering import build_feature_matrix


def run_robustness(verbose: bool = True):
    data_dir = WORKSPACE_ROOT / "backend" / "app" / "data"
    results_dir = WORKSPACE_ROOT / "experiments" / "results"
    results_dir.mkdir(exist_ok=True)

    if verbose:
        print("=" * 60)
        print("ForgeSight AI — Robustness Evaluation")
        print("=" * 60)

    try:
        xgb = joblib.load(data_dir / "xgb_model.joblib")
        scaler = joblib.load(data_dir / "scaler.joblib")
        with open(data_dir / "feature_names.json") as f:
            feature_cols = json.load(f)
    except FileNotFoundError:
        print("Models not found. Run run_training.py first.")
        return

    _, test_df = load_cmapss_fd("FD001", informative_only=True)
    sensor_cols = [c for c in test_df.columns if c.startswith("s")]
    test_feat = build_feature_matrix(test_df, sensor_cols)

    X_test_clean = test_feat[feature_cols].values
    y_test = test_feat["rul"].values

    X_scaled = scaler.transform(X_test_clean)
    baseline_mae = mean_absolute_error(y_test, xgb.predict(X_scaled))

    results = {"baseline_mae": float(baseline_mae)}

    if verbose:
        print(f"Baseline MAE: {baseline_mae:.2f}")

    # 1. Gaussian Noise
    noise_level = 0.05  # 5% noise
    noise = np.random.normal(0, noise_level * np.std(X_test_clean, axis=0), X_test_clean.shape)
    X_noisy = X_test_clean + noise
    mae_noisy = mean_absolute_error(y_test, xgb.predict(scaler.transform(X_noisy)))
    results["gaussian_noise_5pct"] = float(mae_noisy)

    # 2. Missing Values (Imputed with median)
    X_missing = X_test_clean.copy()
    mask = np.random.rand(*X_missing.shape) < 0.1  # 10% missing
    medians = np.median(X_missing, axis=0)
    for i in range(X_missing.shape[1]):
        X_missing[mask[:, i], i] = medians[i]
    mae_missing = mean_absolute_error(y_test, xgb.predict(scaler.transform(X_missing)))
    results["missing_values_10pct_imputed"] = float(mae_missing)

    # 3. Sensor Drift (Linear drift over time)
    X_drift = X_test_clean.copy()
    drift_factor = np.linspace(1.0, 1.1, len(X_drift))  # 10% drift over dataset
    for i in range(X_drift.shape[1]):
        X_drift[:, i] *= drift_factor
    mae_drift = mean_absolute_error(y_test, xgb.predict(scaler.transform(X_drift)))
    results["sensor_drift_10pct"] = float(mae_drift)

    if verbose:
        print(f"Gaussian Noise (5%): MAE = {mae_noisy:.2f} (+{((mae_noisy - baseline_mae) / baseline_mae) * 100:.1f}%)")
        print(f"Missing Values (10%): MAE = {mae_missing:.2f} (+{((mae_missing - baseline_mae) / baseline_mae) * 100:.1f}%)")
        print(f"Sensor Drift (10%): MAE = {mae_drift:.2f} (+{((mae_drift - baseline_mae) / baseline_mae) * 100:.1f}%)")

    with open(results_dir / "robustness_results.json", "w") as f:
        json.dump(results, f, indent=2)

    return results

if __name__ == "__main__":
    run_robustness()
