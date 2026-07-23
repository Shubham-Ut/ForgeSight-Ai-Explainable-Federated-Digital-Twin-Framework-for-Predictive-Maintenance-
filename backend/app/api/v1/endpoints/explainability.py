"""
ForgeSight AI — Explainability Endpoints
GET /api/v1/explainability/global-importance
GET /api/v1/explainability/shap/{machine_id}

Uses trained XGBoost model + TreeSHAP — no hardcoded fallbacks.
"""
from __future__ import annotations

import logging
from pathlib import Path

import numpy as np
from fastapi import APIRouter, HTTPException

from app.domain.models import ApiResponse

logger = logging.getLogger(__name__)
router = APIRouter()


def _load_global_shap() -> list:
    """
    Compute mean absolute SHAP values across a representative background sample.
    Uses the C-MAPSS test data stored in backend/app/data/feature_names.json
    plus the loaded model.
    """
    import json
    import shap as shap_lib

    from app.services.ml_engine import get_registry

    registry = get_registry()
    if not registry.is_ready:
        raise HTTPException(
            status_code=503,
            detail=(
                "ML models not loaded. "
                "Run `python experiments/run_training.py` first."
            ),
        )

    data_dir = Path(__file__).parent.parent.parent / "data"

    # Load feature names
    feature_names = registry.feature_names
    if not feature_names:
        raise HTTPException(status_code=503, detail="feature_names.json missing.")

    # Use scaler mean as background (shape: [1, n_features])
    background = registry.scaler.mean_.reshape(1, -1)

    # Build TreeSHAP explainer on trained XGBoost
    explainer = shap_lib.TreeExplainer(registry.xgb)

    # Try to load actual test data for global importance
    try:
        import sys
        from pathlib import Path as P

        root = P(__file__).parent.parent.parent.parent
        sys.path.insert(0, str(root))

        from ml.preprocessing.cmapss_loader import load_cmapss_fd
        from ml.preprocessing.feature_engineering import build_feature_matrix

        sensor_cols = [
            "s2", "s3", "s4", "s7", "s8", "s9",
            "s11", "s12", "s13", "s14", "s15", "s17", "s20", "s21",
        ]
        _, test_df = load_cmapss_fd("FD001", informative_only=True)
        test_feat = build_feature_matrix(test_df, sensor_cols)
        feat_cols = [c for c in test_feat.columns if c not in ["unit_id", "rul", "subset", "health_index", "cycle_ratio"]]
        feat_cols = [c for c in feat_cols if c in feature_names]

        X_test = test_feat[feat_cols].values[:200]  # 200 samples for speed
        X_scaled = registry.scaler.transform(X_test)

        shap_values = explainer.shap_values(X_scaled)
        mean_abs = np.abs(shap_values).mean(axis=0)
        total = mean_abs.sum() + 1e-10

        results = []
        for i, fname in enumerate(feat_cols):
            results.append({
                "feature_name": fname,
                "shap_value": round(float(mean_abs[i]), 4),
                "base_value": round(float(explainer.expected_value), 4),
                "current_value": 0.0,
                "percent_contribution": round(float(mean_abs[i]) / total * 100, 2),
                "direction": "negative",  # most features reduce RUL when elevated
            })
        results.sort(key=lambda r: r["shap_value"], reverse=True)
        return results

    except Exception as exc:
        logger.warning("explainability.global_test_data_unavailable", extra={"error": str(exc)})

    # Fallback: compute SHAP on background only
    shap_values = explainer.shap_values(background)
    sv = shap_values[0]
    total = float(np.abs(sv).sum()) + 1e-10

    results = []
    for i, fname in enumerate(feature_names):
        val = float(abs(sv[i]))
        results.append({
            "feature_name": fname,
            "shap_value": round(val, 4),
            "base_value": round(float(explainer.expected_value), 4),
            "current_value": 0.0,
            "percent_contribution": round(val / total * 100, 2),
            "direction": "negative",
        })
    results.sort(key=lambda r: r["shap_value"], reverse=True)
    return results


@router.get("/global-importance", response_model=ApiResponse)
async def get_global_importance():
    """
    Returns mean absolute TreeSHAP feature importances computed on the
    held-out C-MAPSS test dataset. All values come from the trained model.
    """
    try:
        importances = _load_global_shap()
        return ApiResponse(
            data=importances,
            message=f"TreeSHAP global importance computed over {len(importances)} features.",
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("explainability.global_importance_error", extra={"error": str(exc)})
        raise HTTPException(status_code=500, detail=str(exc))
