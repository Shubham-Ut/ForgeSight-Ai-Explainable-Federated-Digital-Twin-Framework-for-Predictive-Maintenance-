"""
ForgeSight AI — Feature Ablation Study
Evaluates model performance when specific feature sets are removed.
Reproduces paper ablation claims:
  - Without Cycle count: +66.4% MAE increase
  - Without Spindle Temperature (s4): +61.0% MAE increase
  - Without Vibration Telemetry (s14): +60.9% MAE increase

Usage: python experiments/run_ablation.py
"""
import json
import sys
from pathlib import Path

import numpy as np
from xgboost import XGBRegressor

WORKSPACE_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(WORKSPACE_ROOT))

from ml.preprocessing.cmapss_loader import load_cmapss_fd
from ml.preprocessing.feature_engineering import build_feature_matrix
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error

SENSOR_COLS = [
    "s2", "s3", "s4", "s7", "s8", "s9",
    "s11", "s12", "s13", "s14", "s15", "s17", "s20", "s21",
]


def run_ablation(verbose: bool = True):
    results_dir = WORKSPACE_ROOT / "experiments" / "results"
    results_dir.mkdir(exist_ok=True)

    if verbose:
        print("=" * 60)
        print("ForgeSight AI — Ablation Study")
        print("=" * 60)

    train_df, test_df = load_cmapss_fd("FD001", informative_only=True)
    train_feat = build_feature_matrix(train_df, SENSOR_COLS)
    test_feat = build_feature_matrix(test_df, SENSOR_COLS)

    all_features = [
        c for c in train_feat.columns
        if c not in ("unit_id", "rul", "subset", "health_index", "cycle_ratio")
    ]

    # Baseline performance
    scaler_base = StandardScaler()
    X_train_base = scaler_base.fit_transform(train_feat[all_features].values)
    X_test_base = scaler_base.transform(test_feat[all_features].values)
    y_train = train_feat["rul"].values
    y_test = test_feat["rul"].values

    xgb = XGBRegressor(n_estimators=150, max_depth=6, learning_rate=0.05, n_jobs=-1, random_state=42)
    xgb.fit(X_train_base, y_train)
    baseline_mae = mean_absolute_error(y_test, xgb.predict(X_test_base))

    if verbose:
        print(f"Baseline MAE: {baseline_mae:.2f}")

    ablation_sets = {
        "Without Cycle Count": ["cycle"],
        "Without Spindle Temp (s4)": [c for c in all_features if "s4" in c],
        "Without Vibration (s14)": [c for c in all_features if "s14" in c],
    }

    results = {"baseline_mae": float(baseline_mae), "ablations": {}}

    for name, feats_to_remove in ablation_sets.items():
        if verbose:
            print(f"Running: {name} (removing {len(feats_to_remove)} features)...")
            
        remaining_feats = [f for f in all_features if f not in feats_to_remove]
        
        scaler_abl = StandardScaler()
        X_train_abl = scaler_abl.fit_transform(train_feat[remaining_feats].values)
        X_test_abl = scaler_abl.transform(test_feat[remaining_feats].values)
        
        xgb_abl = XGBRegressor(n_estimators=150, max_depth=6, learning_rate=0.05, n_jobs=-1, random_state=42)
        xgb_abl.fit(X_train_abl, y_train)
        abl_mae = mean_absolute_error(y_test, xgb_abl.predict(X_test_abl))
        
        increase_pct = ((abl_mae - baseline_mae) / baseline_mae) * 100
        
        results["ablations"][name] = {
            "mae": float(abl_mae),
            "mae_increase_pct": float(increase_pct)
        }
        
        if verbose:
            print(f"  - MAE: {abl_mae:.2f} (+{increase_pct:.1f}%)")

    with open(results_dir / "ablation_results.json", "w") as f:
        json.dump(results, f, indent=2)

    return results

if __name__ == "__main__":
    run_ablation(verbose=True)
