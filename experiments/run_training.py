"""
ForgeSight AI — Full Training Pipeline
Trains XGBoost + Random Forest on NASA C-MAPSS FD001.
Saves: xgb_model.joblib, rf_model.joblib, scaler.joblib,
       feature_names.json, ml_metrics.json

Paper Table 1 results are reproducible from this script.
Usage: python experiments/run_training.py
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler
from xgboost import XGBRegressor

WORKSPACE_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(WORKSPACE_ROOT))

from ml.preprocessing.cmapss_loader import load_cmapss_fd
from ml.preprocessing.feature_engineering import build_feature_matrix

SENSOR_COLS = [
    "s2", "s3", "s4", "s7", "s8", "s9",
    "s11", "s12", "s13", "s14", "s15", "s17", "s20", "s21",
]

DATA_DIR = WORKSPACE_ROOT / "backend" / "app" / "data"


def train_and_evaluate(verbose: bool = True) -> dict:
    """
    Full training pipeline. Returns metrics dict.
    Paper Table 1 benchmark: XGBoost MAE ≈ 12.63, RMSE ≈ 16.92, R² ≈ 0.803
    """
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    if verbose:
        print("=" * 60)
        print("ForgeSight AI — Training Pipeline")
        print("Dataset: NASA C-MAPSS FD001")
        print("=" * 60)
        print("Loading data...")

    train_df, test_df = load_cmapss_fd("FD001", informative_only=True)

    if verbose:
        print(f"Train engines: {train_df['unit_id'].nunique()}, "
              f"rows: {len(train_df)}")
        print(f"Test engines:  {test_df['unit_id'].nunique()}, "
              f"rows: {len(test_df)}")
        print("Building feature matrix (rolling windows, lags, EMA, RoC)...")

    train_feat = build_feature_matrix(train_df, SENSOR_COLS)
    test_feat  = build_feature_matrix(test_df,  SENSOR_COLS)

    feature_cols = [
        c for c in train_feat.columns
        if c not in ("unit_id", "rul", "subset", "health_index", "cycle_ratio")
    ]

    X_train_raw = train_feat[feature_cols].values
    y_train     = train_feat["rul"].values.astype(float)
    X_test_raw  = test_feat[feature_cols].values
    y_test      = test_feat["rul"].values.astype(float)

    if verbose:
        print(f"Features: {len(feature_cols)}, "
              f"Train rows: {len(X_train_raw)}, Test rows: {len(X_test_raw)}")
        print("Fitting StandardScaler...")

    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train_raw)
    X_test  = scaler.transform(X_test_raw)

    results = {}

    # ── 1. Linear Regression (baseline) ───────────────────────────────────────
    if verbose:
        print("\n[1/4] Training Linear Regression baseline...")
    t0 = time.perf_counter()
    lr = LinearRegression()
    lr.fit(X_train, y_train)
    lr_time = time.perf_counter() - t0
    lr_preds = lr.predict(X_test)
    results["Linear Regression"] = _metrics(y_test, lr_preds, lr_time)

    # ── 2. Gradient Boosted Decision Trees (baseline) ─────────────────────────
    if verbose:
        print("[2/4] Training GBDT baseline...")
    t0 = time.perf_counter()
    gbdt = GradientBoostingRegressor(n_estimators=100, learning_rate=0.1, random_state=42)
    gbdt.fit(X_train, y_train)
    gbdt_time = time.perf_counter() - t0
    gbdt_preds = gbdt.predict(X_test)
    results["GBDT Regressor"] = _metrics(y_test, gbdt_preds, gbdt_time)

    # ── 3. Random Forest (saved to disk) ──────────────────────────────────────
    if verbose:
        print("[3/4] Training Random Forest (n=150, max_depth=12)...")
    t0 = time.perf_counter()
    rf = RandomForestRegressor(
        n_estimators=150, max_depth=12,
        random_state=42, n_jobs=-1,
    )
    rf.fit(X_train, y_train)
    rf_time = time.perf_counter() - t0

    t_infer = time.perf_counter()
    rf_preds = rf.predict(X_test)
    rf_infer_ms = (time.perf_counter() - t_infer) / len(X_test) * 1000
    results["Random Forest"] = _metrics(y_test, rf_preds, rf_time, rf_infer_ms)

    # ── 4. XGBoost — Proposed Model (saved to disk) ───────────────────────────
    if verbose:
        print("[4/4] Training XGBoost (n=200, max_depth=6, lr=0.05, subsample=0.8)...")
    t0 = time.perf_counter()
    xgb = XGBRegressor(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=42,
        n_jobs=-1,
        verbosity=0,
    )
    xgb.fit(X_train, y_train)
    xgb_time = time.perf_counter() - t0

    t_infer = time.perf_counter()
    xgb_preds = xgb.predict(X_test)
    xgb_infer_ms = (time.perf_counter() - t_infer) / len(X_test) * 1000
    results["XGBoost (Proposed)"] = _metrics(y_test, xgb_preds, xgb_time, xgb_infer_ms)

    # ── Save models ────────────────────────────────────────────────────────────
    if verbose:
        print("\nSaving model artifacts...")

    joblib.dump(xgb,    DATA_DIR / "xgb_model.joblib")
    joblib.dump(rf,     DATA_DIR / "rf_model.joblib")
    joblib.dump(scaler, DATA_DIR / "scaler.joblib")

    with open(DATA_DIR / "feature_names.json", "w") as f:
        json.dump(feature_cols, f, indent=2)

    # ── Build metrics output ──────────────────────────────────────────────────
    metrics_out = []
    for model_name, m in results.items():
        metrics_out.append({
            "name": model_name,
            "mae":  m["mae"],
            "rmse": m["rmse"],
            "r2":   m["r2"],
            "mape": m["mape"],
            "training_time": f"{m['train_time']:.2f}s",
            "inference_time_ms": round(m.get("infer_ms", 0.0), 3),
        })

    with open(DATA_DIR / "ml_metrics.json", "w") as f:
        json.dump(metrics_out, f, indent=2)

    if verbose:
        print("\n" + "=" * 60)
        print("RESULTS (NASA C-MAPSS FD001 Test Set)")
        print("=" * 60)
        header = f"{'Model':<25} {'MAE':>8} {'RMSE':>8} {'R²':>8} {'Time':>8}"
        print(header)
        print("-" * 60)
        for model_name, m in results.items():
            marker = " *" if model_name == "XGBoost (Proposed)" else ""
            print(
                f"{model_name:<25} {m['mae']:>8.2f} {m['rmse']:>8.2f} "
                f"{m['r2']:>8.3f} {m['train_time']:>6.1f}s{marker}"
            )
        print("=" * 60)
        print(f"\nArtifacts saved to: {DATA_DIR}")
        print("  - xgb_model.joblib")
        print("  - rf_model.joblib")
        print("  - scaler.joblib")
        print("  - feature_names.json")
        print("  - ml_metrics.json")

    return {
        "results": results,
        "feature_cols": feature_cols,
        "n_train": len(X_train),
        "n_test": len(X_test),
    }


def _metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    train_time: float,
    infer_ms: float = 0.0,
) -> dict:
    mae  = float(mean_absolute_error(y_true, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    r2   = float(r2_score(y_true, y_pred))
    mape = float(mae / np.mean(y_true) * 100)
    return {
        "mae":        round(mae, 3),
        "rmse":       round(rmse, 3),
        "r2":         round(r2, 4),
        "mape":       round(mape, 3),
        "train_time": round(train_time, 3),
        "infer_ms":   round(infer_ms, 4),
    }


if __name__ == "__main__":
    train_and_evaluate(verbose=True)
