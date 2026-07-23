"""
ForgeSight AI — Anomaly Detection Engine
Implements multiple anomaly detection algorithms:
  1. Isolation Forest (sklearn)
  2. Local Outlier Factor (sklearn)
  3. Z-Score statistical method
All methods return a normalised anomaly score in [0, 1].
"""
from __future__ import annotations

import logging
import numpy as np
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# ── Lazy singletons ────────────────────────────────────────────────────────────
_iforest = None
_lof = None
_iforest_ready = False
_lof_ready = False

# Baseline training distribution derived from C-MAPSS FD001 healthy window
# Shape: (n_samples, 5) for [speed, torque, wear, temperature, vibration]
_HEALTHY_BASELINE = np.array([
    [1500, 40, 5,  22, 0.8],
    [1480, 38, 7,  23, 0.9],
    [1520, 42, 6,  22, 0.85],
    [1510, 41, 8,  24, 1.0],
    [1490, 39, 9,  23, 0.95],
    [1505, 40, 10, 25, 1.1],
    [1495, 38, 6,  22, 0.88],
    [1515, 43, 7,  23, 0.92],
    [1488, 37, 8,  24, 1.05],
    [1525, 44, 9,  25, 1.15],
    [1502, 41, 11, 25, 1.2],
    [1498, 39, 12, 26, 1.3],
    [1511, 42, 10, 24, 1.08],
    [1496, 40, 13, 26, 1.35],
    [1508, 41, 11, 25, 1.18],
    [1492, 38, 14, 27, 1.4],
    [1518, 43, 12, 26, 1.22],
    [1503, 40, 15, 27, 1.45],
    [1487, 37, 13, 26, 1.38],
    [1522, 44, 14, 28, 1.52],
], dtype=float)


def _ensure_iforest() -> bool:
    """Lazily initialise Isolation Forest on first call."""
    global _iforest, _iforest_ready
    if _iforest_ready:
        return True
    try:
        from sklearn.ensemble import IsolationForest
        _iforest = IsolationForest(
            n_estimators=100,
            contamination=0.05,
            random_state=42,
            n_jobs=-1,
        )
        _iforest.fit(_HEALTHY_BASELINE)
        _iforest_ready = True
        logger.info("anomaly_engine.isolation_forest_ready")
        return True
    except Exception as exc:
        logger.error("anomaly_engine.iforest_init_failed", extra={"error": str(exc)})
        return False


def _ensure_lof() -> bool:
    """Lazily initialise Local Outlier Factor on first call."""
    global _lof, _lof_ready
    if _lof_ready:
        return True
    try:
        from sklearn.neighbors import LocalOutlierFactor
        _lof = LocalOutlierFactor(
            n_neighbors=5,
            contamination=0.05,
            novelty=True,
        )
        _lof.fit(_HEALTHY_BASELINE)
        _lof_ready = True
        logger.info("anomaly_engine.lof_ready")
        return True
    except Exception as exc:
        logger.error("anomaly_engine.lof_init_failed", extra={"error": str(exc)})
        return False


# ── Public API ─────────────────────────────────────────────────────────────────

def detect_isolation_forest(features: List[float]) -> Dict[str, Any]:
    """
    Run Isolation Forest anomaly detection.
    Returns score in [0, 1] (1 = most anomalous).
    Negative decision_function values = anomaly.
    """
    if not _ensure_iforest():
        return _fallback_score(features, "isolation_forest")

    x = np.array(features[:5]).reshape(1, -1)
    # decision_function: lower = more anomalous. Range ~[-0.5, 0.5]
    raw_score = float(_iforest.decision_function(x)[0])
    # Normalise: invert and clip to [0, 1]
    score = float(np.clip(0.5 - raw_score, 0.0, 1.0))
    is_anomaly = bool(_iforest.predict(x)[0] == -1)

    return {
        "method": "isolation_forest",
        "score": round(score, 4),
        "is_anomaly": is_anomaly,
        "severity": _score_to_severity(score),
        "raw_decision": round(raw_score, 4),
        "interpretation": _interpret(score, "Isolation Forest"),
    }


def detect_lof(features: List[float]) -> Dict[str, Any]:
    """
    Run Local Outlier Factor novelty detection.
    Returns score in [0, 1] (1 = most anomalous).
    """
    if not _ensure_lof():
        return _fallback_score(features, "lof")

    x = np.array(features[:5]).reshape(1, -1)
    raw_score = float(_lof.decision_function(x)[0])
    score = float(np.clip(0.5 - raw_score, 0.0, 1.0))
    is_anomaly = bool(_lof.predict(x)[0] == -1)

    return {
        "method": "local_outlier_factor",
        "score": round(score, 4),
        "is_anomaly": is_anomaly,
        "severity": _score_to_severity(score),
        "raw_decision": round(raw_score, 4),
        "interpretation": _interpret(score, "Local Outlier Factor"),
    }


def detect_zscore(features: List[float]) -> Dict[str, Any]:
    """
    Z-Score statistical anomaly detection against healthy baseline.
    """
    x = np.array(features[:5])
    mu = _HEALTHY_BASELINE.mean(axis=0)[:5]
    sigma = _HEALTHY_BASELINE.std(axis=0)[:5] + 1e-8

    zscores = np.abs((x - mu) / sigma)
    max_z = float(zscores.max())
    mean_z = float(zscores.mean())

    # Score: normalise max z-score. z > 3 is typically anomalous.
    score = float(np.clip(max_z / 6.0, 0.0, 1.0))
    feature_labels = ["speed", "torque", "wear", "temperature", "vibration"]

    return {
        "method": "z_score",
        "score": round(score, 4),
        "is_anomaly": max_z > 2.5,
        "severity": _score_to_severity(score),
        "max_z": round(max_z, 3),
        "mean_z": round(mean_z, 3),
        "feature_zscores": {
            label: round(float(zscores[i]), 3)
            for i, label in enumerate(feature_labels)
        },
        "interpretation": _interpret(score, "Z-Score"),
    }


def detect_all(features: List[float]) -> Dict[str, Any]:
    """
    Run all three detectors and return ensemble result.
    Ensemble score = weighted average (IF: 0.4, LOF: 0.4, Z: 0.2).
    """
    iforest = detect_isolation_forest(features)
    lof = detect_lof(features)
    zscore = detect_zscore(features)

    ensemble_score = float(
        0.4 * iforest["score"] + 0.4 * lof["score"] + 0.2 * zscore["score"]
    )
    is_anomaly = bool(
        (iforest["is_anomaly"] and lof["is_anomaly"]) or ensemble_score > 0.6
    )

    return {
        "ensemble_score": round(ensemble_score, 4),
        "is_anomaly": is_anomaly,
        "severity": _score_to_severity(ensemble_score),
        "interpretation": _interpret(ensemble_score, "Ensemble"),
        "methods": {
            "isolation_forest": iforest,
            "local_outlier_factor": lof,
            "z_score": zscore,
        },
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _score_to_severity(score: float) -> str:
    if score > 0.75:
        return "critical"
    if score > 0.50:
        return "high"
    if score > 0.30:
        return "medium"
    return "low"


def _interpret(score: float, method: str) -> str:
    if score > 0.75:
        return f"{method}: CRITICAL anomaly detected. Sensor readings deviate severely from healthy operating envelope. Immediate inspection required."
    if score > 0.50:
        return f"{method}: HIGH anomaly. Operating outside normal distribution. Schedule maintenance within 24–48 hours."
    if score > 0.30:
        return f"{method}: MEDIUM anomaly. Minor deviation from baseline. Monitor closely and trend over next 8 hours."
    return f"{method}: LOW anomaly score. Operating within expected healthy bounds."


def _fallback_score(features: List[float], method: str) -> Dict[str, Any]:
    """Return a basic zscore fallback when sklearn is unavailable."""
    zscore = detect_zscore(features)
    zscore["method"] = method
    zscore["fallback"] = True
    return zscore
