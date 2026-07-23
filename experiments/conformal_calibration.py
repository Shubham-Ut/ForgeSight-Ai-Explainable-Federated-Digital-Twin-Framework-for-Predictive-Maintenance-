import os
import sys
import json
from pathlib import Path
import numpy as np
import pandas as pd
from xgboost import XGBRegressor
from sklearn.preprocessing import StandardScaler
import joblib

WORKSPACE_ROOT = Path(__file__).parent.parent
sys.path.append(str(WORKSPACE_ROOT))

from ml.preprocessing.cmapss_loader import load_cmapss_fd
from ml.preprocessing.feature_engineering import build_feature_matrix

def calibrate_conformal():
    print("Loading data for conformal calibration...")
    train_df, test_df = load_cmapss_fd("FD001", informative_only=True)
    
    sensor_cols = [
        "s2", "s3", "s4", "s7", "s8", "s9",
        "s11", "s12", "s13", "s14", "s15", "s17", "s20", "s21"
    ]
    
    train_feat = build_feature_matrix(train_df, sensor_cols)
    test_feat = build_feature_matrix(test_df, sensor_cols)
    
    feature_names = [c for c in train_feat.columns if c not in ["unit_id", "rul", "subset", "health_index", "cycle_ratio"]]
    
    # ── Split Training Engines into Train (80) and Calibration (20) ──────────
    print("Partitioning engine units to train/calibration splits...")
    unique_units = train_feat["unit_id"].unique()
    np.random.seed(42)
    np.random.shuffle(unique_units)
    
    train_units = unique_units[:80]
    cal_units = unique_units[80:]
    
    train_split = train_feat[train_feat["unit_id"].isin(train_units)]
    cal_split = train_feat[train_feat["unit_id"].isin(cal_units)]
    
    X_tr_raw = train_split[feature_names].values
    y_tr = train_split["rul"].values
    X_cal_raw = cal_split[feature_names].values
    y_cal = cal_split["rul"].values
    X_te_raw = test_feat[feature_names].values
    y_te = test_feat["rul"].values
    
    # ── Scale features ────────────────────────────────────────────────────────
    scaler = StandardScaler()
    X_tr = scaler.fit_transform(X_tr_raw)
    X_cal = scaler.transform(X_cal_raw)
    X_te = scaler.transform(X_te_raw)
    
    print(f"Split sizes: Train={len(X_tr)}, Calibration={len(X_cal)}, Test={len(X_te)}")
    
    # ── Train the Calibration Model ───────────────────────────────────────────
    print("Training calibration model on training split...")
    xgb = XGBRegressor(n_estimators=100, max_depth=6, learning_rate=0.05, random_state=42, n_jobs=-1)
    xgb.fit(X_tr, y_tr)
    
    # ── Compute Residuals on Calibration Set ──────────────────────────────────
    print("Calculating conformal residuals on calibration set...")
    cal_preds = xgb.predict(X_cal)
    cal_residuals = np.abs(y_cal - cal_preds)
    n_cal = len(cal_residuals)
    
    quantiles = {}
    for confidence in [80, 90, 95]:
        alpha = 1 - (confidence / 100.0)
        # Quantile index formula: ceil((n+1)*(1-alpha)) / n
        q_idx = int(np.ceil((n_cal + 1) * (1 - alpha)))
        q_idx = min(n_cal - 1, max(0, q_idx - 1))
        sorted_residuals = np.sort(cal_residuals)
        q_value = sorted_residuals[q_idx]
        quantiles[f"q_{confidence}"] = round(float(q_value), 3)
        
    print(f"Calibration completed:")
    for confidence, q_val in quantiles.items():
        print(f" - Confidence {confidence}% radius: {q_val} cycles")
        
    # ── Verify Coverage on Held-Out Test Set ──────────────────────────────────
    print("Evaluating empirical coverage on held-out test engines...")
    te_preds = xgb.predict(X_te)
    te_residuals = np.abs(y_te - te_preds)
    
    coverage_stats = {}
    for conf_str, q_val in quantiles.items():
        covered = np.sum(te_residuals <= q_val)
        coverage_pct = (covered / len(te_residuals)) * 100
        coverage_stats[conf_str] = round(coverage_pct, 2)
        print(f" - Empirical Coverage for {conf_str}: {coverage_pct:.2f}% (Target: {conf_str.split('_')[1]}%)")
        
    data_dir = WORKSPACE_ROOT / "backend" / "app" / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    
    output = {
        "calibration_size": n_cal,
        "test_size": len(X_te),
        "quantiles": quantiles,
        "coverage": coverage_stats,
        "mae": round(float(np.mean(te_residuals)), 3),
        "rmse": round(float(np.sqrt(np.mean(te_residuals**2))), 3)
    }
    
    with open(data_dir / "conformal_stats.json", "w") as f:
        json.dump(output, f, indent=4)
        
    print(f"Calibration stats saved to {data_dir / 'conformal_stats.json'}")

if __name__ == "__main__":
    calibrate_conformal()
