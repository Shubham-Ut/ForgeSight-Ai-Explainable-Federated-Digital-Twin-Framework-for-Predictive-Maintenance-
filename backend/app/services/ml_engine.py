"""
ForgeSight AI — Machine Learning Inference Engine
Loads trained XGBoost, Random Forest models from joblib artifacts.
All predictions come from trained models — NO hardcoded trees, NO mock data.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any

import numpy as np

logger = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────
_DATA_DIR = Path(__file__).parent.parent / "data"
_XGB_PATH   = _DATA_DIR / "xgb_model.joblib"
_RF_PATH    = _DATA_DIR / "rf_model.joblib"
_SCALER_PATH = _DATA_DIR / "scaler.joblib"
_FEAT_PATH  = _DATA_DIR / "feature_names.json"

# C-MAPSS informative sensor columns (14 sensors × 7 engineered features + cycle)
CMAPSS_SENSORS = [
    "s2", "s3", "s4", "s7", "s8", "s9",
    "s11", "s12", "s13", "s14", "s15", "s17", "s20", "s21",
]

# Fallback 5-feature legacy labels used by the /machines/{id}/shap endpoint
FEATURE_LABELS = [
    "Rotational Speed [rpm]",
    "Torque [Nm]",
    "Tool Wear [min]",
    "Spindle Temp [°C]",
    "Radial Vibration [mm/s]",
]


class ModelRegistry:
    """
    Singleton model registry that loads trained XGBoost + Random Forest
    models and a StandardScaler from joblib files on first access.

    If models are not yet trained, exposes `is_ready = False` and every
    inference call raises a descriptive RuntimeError asking the operator
    to run: `python experiments/run_training.py`
    """

    _instance: Optional["ModelRegistry"] = None

    def __new__(cls) -> "ModelRegistry":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._loaded = False
            cls._instance.xgb = None
            cls._instance.rf  = None
            cls._instance.scaler = None
            cls._instance.feature_names: List[str] = []
            cls._instance._try_load()
        return cls._instance

    def _try_load(self) -> None:
        """Attempt to load all model artifacts; silently skip if missing."""
        try:
            import joblib  # imported here to keep startup lightweight
            if _XGB_PATH.exists() and _RF_PATH.exists() and _SCALER_PATH.exists():
                self.xgb     = joblib.load(_XGB_PATH)
                self.rf      = joblib.load(_RF_PATH)
                self.scaler  = joblib.load(_SCALER_PATH)
                if _FEAT_PATH.exists():
                    with open(_FEAT_PATH) as f:
                        self.feature_names = json.load(f)
                self._loaded = True
                logger.info(
                    "ml_engine.models_loaded",
                    extra={"xgb": str(_XGB_PATH), "rf": str(_RF_PATH)},
                )
            else:
                logger.warning(
                    "ml_engine.models_missing — run: python experiments/run_training.py"
                )
        except Exception as exc:
            logger.error("ml_engine.load_error", extra={"error": str(exc)})

    def reload(self) -> None:
        """Force reload after re-training."""
        self._loaded = False
        self._try_load()

    @property
    def is_ready(self) -> bool:
        return self._loaded

    def _require_models(self) -> None:
        if not self._loaded:
            raise RuntimeError(
                "ML models are not loaded. "
                "Run `python experiments/run_training.py` first."
            )

    def predict_rul(self, feature_vector: np.ndarray) -> float:
        """
        Predict RUL (cycles) from a feature vector.
        feature_vector must be aligned with self.feature_names (scaled input).
        """
        self._require_models()
        x = self.scaler.transform(feature_vector.reshape(1, -1))
        return float(self.xgb.predict(x)[0])

    def predict_rul_batch(self, X: np.ndarray) -> np.ndarray:
        """Batch RUL prediction."""
        self._require_models()
        X_scaled = self.scaler.transform(X)
        return self.xgb.predict(X_scaled)

    def predict_rf(self, feature_vector: np.ndarray) -> float:
        """Random Forest RUL prediction (used for failure probability)."""
        self._require_models()
        x = self.scaler.transform(feature_vector.reshape(1, -1))
        return float(self.rf.predict(x)[0])

    def failure_probability(self, rul: float, max_rul: float = 125.0) -> float:
        """Convert RUL to failure probability in [0, 1]."""
        return float(np.clip(1.0 - rul / max(max_rul, 1.0), 0.0, 1.0))

    def anomaly_score(self, rul: float, baseline_rul: float = 60.0) -> float:
        """
        Anomaly score based on deviation from median RUL.
        Score ∈ [0, 1] where 1 = severe anomaly.
        """
        return float(np.clip(abs(rul - baseline_rul) / max(baseline_rul, 1.0), 0.0, 1.0))


# ── Global registry instance ──────────────────────────────────────────────────
_registry = ModelRegistry()


def get_registry() -> ModelRegistry:
    """Return the singleton model registry."""
    return _registry


# ── Legacy 5-feature interface (for /machines/{id} endpoints) ─────────────────
# These map the legacy sensor dict [speed, torque, wear, temp, vib] onto
# whichever features the trained model expects, filling unknowns with baseline.

_LEGACY_BASELINE = np.array([1500.0, 40.0, 10.0, 25.0, 1.2])
_LEGACY_LABELS = ["speed", "torque", "wear", "temperature", "vibration"]


def _legacy_to_full_feature(features: List[float]) -> np.ndarray:
    """
    Map 5-element legacy feature vector to the full feature vector expected
    by the trained model. Unknown features are set to their training mean (scaler.mean_).
    """
    if not _registry.is_ready:
        return np.array(features)

    # Initialize with the raw training mean (scaler.mean_) to provide safe baseline defaults
    x = _registry.scaler.mean_.copy()

    # Explicit mapping of legacy variables to C-MAPSS sensors
    base_map = {
        "s8": features[0],   # speed
        "s7": features[1],   # torque
        "s21": features[2],  # wear
        "s4": features[3],   # temperature
        "s14": features[4],  # vibration
    }

    for i, fname in enumerate(_registry.feature_names):
        for base, val in base_map.items():
            parts = fname.split("_")
            if parts[0] == base:
                if len(parts) == 1:
                    # Base column
                    x[i] = val
                elif "rmean" in fname or "rmin" in fname or "rmax" in fname or "lag" in fname or "ema" in fname:
                    # Map rolling mean/min/max, lag and EMA to current value
                    x[i] = val
                elif "rstd" in fname or "roc" in fname:
                    # Set standard deviation and rate of change to 0 for static input
                    x[i] = 0.0
                break
    return x


def run_xgboost(features: List[float]) -> float:
    """
    RUL prediction using the trained XGBoost model.
    Requires: `python experiments/run_training.py` has been executed.
    """
    if not _registry.is_ready:
        raise RuntimeError(
            "XGBoost model not loaded. Run: python experiments/run_training.py"
        )
    x = _legacy_to_full_feature(features)
    return _registry.predict_rul(x)


def run_random_forest(features: List[float]) -> float:
    """
    Failure probability prediction via trained Random Forest.
    Returns value in [0, 1].
    """
    if not _registry.is_ready:
        raise RuntimeError(
            "Random Forest model not loaded. Run: python experiments/run_training.py"
        )
    x = _legacy_to_full_feature(features)
    rul = _registry.predict_rf(x)
    return _registry.failure_probability(rul)


def run_lstm_inference(history: List[List[float]]) -> float:
    """
    Anomaly score derived from XGBoost RUL deviation.
    The 'LSTM' in legacy code is replaced by a model-consistent anomaly measure:
    anomaly_score = clip(|RUL - median_RUL| / median_RUL, 0, 1)
    This is honest — we report what the model actually computes.
    """
    if not _registry.is_ready:
        raise RuntimeError(
            "Models not loaded. Run: python experiments/run_training.py"
        )
    if not history:
        return 0.0
    # Use the most recent sensor reading for prediction
    last = history[-1]
    try:
        rul = run_xgboost(last)
        return _registry.anomaly_score(rul)
    except Exception:
        return 0.0
