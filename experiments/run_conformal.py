"""
ForgeSight AI — Conformal Prediction Calibration
Computes split conformal prediction quantiles to guarantee 95% coverage.
"""
import json
import sys
from pathlib import Path

import joblib
import numpy as np

WORKSPACE_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(WORKSPACE_ROOT))

from ml.preprocessing.cmapss_loader import load_cmapss_fd
from ml.preprocessing.feature_engineering import build_feature_matrix


def run_conformal(verbose: bool = True):
    data_dir = WORKSPACE_ROOT / "backend" / "app" / "data"
    
    if verbose:
        print("=" * 60)
        print("ForgeSight AI — Conformal Prediction")
        print("=" * 60)

    try:
        xgb = joblib.load(data_dir / "xgb_model.joblib")
        scaler = joblib.load(data_dir / "scaler.joblib")
        with open(data_dir / "feature_names.json") as f:
            feature_cols = json.load(f)
    except FileNotFoundError:
        print("Models not found. Run run_training.py first.")
        return

    # Load train and test data
    train_df, test_df = load_cmapss_fd("FD001", informative_only=True)
    sensor_cols = [c for c in train_df.columns if c.startswith("s")]
    train_feat_full = build_feature_matrix(train_df, sensor_cols)
    test_feat = build_feature_matrix(test_df, sensor_cols)

    # Use units 81-100 (20% of training engines) for calibration
    cal_units = list(range(81, 101))
    cal_feat = train_feat_full[train_feat_full["unit_id"].isin(cal_units)]

    X_cal = scaler.transform(cal_feat[feature_cols].values)
    y_cal = cal_feat["rul"].values

    preds_cal = xgb.predict(X_cal)
    residuals_cal = np.abs(y_cal - preds_cal)

    n = len(residuals_cal)
    alpha = 0.05
    q_idx = int(np.ceil((n + 1) * (1 - alpha)))
    if q_idx >= n:
        q_idx = n - 1
    
    sorted_residuals = np.sort(residuals_cal)
    q_val = sorted_residuals[q_idx]

    # Evaluate coverage on the completely unseen test set
    X_test = scaler.transform(test_feat[feature_cols].values)
    y_test = test_feat["rul"].values
    preds_test = xgb.predict(X_test)
    residuals_test = np.abs(y_test - preds_test)

    empirical_coverage = np.mean(residuals_test <= q_val)

    if verbose:
        print(f"Calibration size: {n}")
        print(f"Target coverage:  {(1-alpha)*100:.1f}%")
        print(f"Quantile (q_val): {q_val:.2f} cycles")
        print(f"Empirical cover:  {empirical_coverage*100:.1f}%")

    stats = {
        "alpha": alpha,
        "n_calibration": n,
        "quantiles": {
            "q_95": float(q_val)
        },
        "empirical_coverage": float(empirical_coverage)
    }

    with open(data_dir / "conformal_stats.json", "w") as f:
        json.dump(stats, f, indent=2)

    return stats


if __name__ == "__main__":
    run_conformal()
