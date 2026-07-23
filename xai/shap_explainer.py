"""
ForgeSight AI — SHAP Explainer Service
TreeSHAP for tree-based models, KernelSHAP fallback for neural networks
"""
from __future__ import annotations
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd
import shap
import structlog

logger = structlog.get_logger(__name__)


SENSOR_LABELS = {
    "s2": "Fan Inlet Temp (T2)", "s3": "LPC Outlet Temp (T24)",
    "s4": "HPC Outlet Temp (T30)", "s7": "HPC Outlet Pressure (P30)",
    "s8": "Physical Fan Speed (Nf)", "s9": "Physical Core Speed (Nc)",
    "s11": "Bypass Ratio (BPR)", "s12": "Fuel Flow (Wf)",
    "s13": "Fan Outlet Velocity (Vs)", "s14": "Corrected Fan Speed",
    "s15": "Corrected Core Speed", "s17": "HPT Coolant Bleed",
    "s20": "LPT Coolant Bleed (W31)", "s21": "LPT Inlet Pressure",
}


class ShapExplainerService:
    """
    Multi-model SHAP explainer that supports:
    - TreeSHAP (XGBoost, LightGBM, CatBoost, RandomForest) — exact + fast
    - KernelSHAP (any model) — approximate, model-agnostic
    """

    def __init__(self, model: Any, feature_names: List[str], model_type: str = "tree"):
        self.model = model
        self.feature_names = feature_names
        self.model_type = model_type
        self._explainer: Optional[Any] = None
        self._background_data: Optional[np.ndarray] = None

    def fit(self, X_background: np.ndarray) -> None:
        """Fit the explainer on background data."""
        self._background_data = X_background
        if self.model_type in ("xgboost", "lightgbm", "catboost", "randomforest", "tree"):
            self._explainer = shap.TreeExplainer(self.model)
            logger.info("shap.explainer.fitted", type="TreeExplainer")
        else:
            # KernelSHAP with k-means background summarization
            background_summary = shap.kmeans(X_background, 50)
            self._explainer = shap.KernelExplainer(
                self.model.predict, background_summary
            )
            logger.info("shap.explainer.fitted", type="KernelExplainer")

    def explain(self, X: np.ndarray) -> Dict:
        """
        Compute SHAP values for input X.
        Returns structured explanation dict for API response.
        """
        if self._explainer is None:
            raise RuntimeError("Call .fit() before .explain()")

        shap_values = self._explainer.shap_values(X)
        # For tree regressors, shap_values is shape (n_samples, n_features)
        if isinstance(shap_values, list):
            shap_values = shap_values[1]  # For binary classifiers

        base_value = (
            self._explainer.expected_value[1]
            if isinstance(self._explainer.expected_value, np.ndarray)
            else self._explainer.expected_value
        )

        # Build structured output for first sample
        sv = shap_values[0] if X.ndim > 1 else shap_values
        features_out = []
        total_abs = np.abs(sv).sum() + 1e-10

        for i, fname in enumerate(self.feature_names):
            val = float(sv[i])
            features_out.append({
                "feature_name": SENSOR_LABELS.get(fname, fname),
                "shap_value": round(val, 4),
                "base_value": round(float(base_value), 4),
                "current_value": round(float(X[0, i]) if X.ndim > 1 else float(X[i]), 4),
                "percent_contribution": round(abs(val) / total_abs * 100, 2),
                "direction": "positive" if val > 0 else "negative",
            })

        # Sort by absolute SHAP value descending
        features_out.sort(key=lambda x: abs(x["shap_value"]), reverse=True)

        predicted = float(self.model.predict(X.reshape(1, -1) if X.ndim == 1 else X)[0])

        return {
            "baseline_rul": round(float(base_value), 2),
            "predicted_rul": round(predicted, 2),
            "shap_values": features_out,
            "global_importance": sorted(
                features_out, key=lambda x: abs(x["shap_value"]), reverse=True
            )[:10],
            "nlp_explanation": self._generate_nlp(features_out, predicted, base_value),
        }

    def _generate_nlp(
        self, features: List[Dict], predicted_rul: float, baseline: float
    ) -> str:
        """Generate natural language explanation from SHAP values."""
        top3 = features[:3]
        positive = [f for f in top3 if f["direction"] == "positive"]
        negative = [f for f in top3 if f["direction"] == "negative"]

        lines = [
            f"The model predicts a Remaining Useful Life of {predicted_rul:.0f} cycles "
            f"(baseline: {baseline:.0f} cycles).",
        ]

        if positive:
            names = ", ".join(f["feature_name"] for f in positive)
            lines.append(f"Factors increasing RUL: {names}.")

        if negative:
            names = ", ".join(f["feature_name"] for f in negative)
            lines.append(f"Factors reducing RUL: {names}.")

        degraded = [f for f in features if f["direction"] == "negative" and abs(f["shap_value"]) > 10]
        if degraded:
            lines.append(
                f"Elevated {degraded[0]['feature_name']} is the primary degradation driver "
                f"with a SHAP contribution of {degraded[0]['shap_value']:.1f} cycles."
            )

        return " ".join(lines)

    def get_global_importance(self, X: np.ndarray, n_top: int = 15) -> List[Dict]:
        """Compute mean absolute SHAP values across a dataset for global importance."""
        if self._explainer is None:
            raise RuntimeError("Call .fit() before get_global_importance()")

        shap_values = self._explainer.shap_values(X)
        if isinstance(shap_values, list):
            shap_values = shap_values[1]

        mean_abs = np.abs(shap_values).mean(axis=0)
        total = mean_abs.sum() + 1e-10
        ranked = np.argsort(mean_abs)[::-1]

        return [
            {
                "feature_name": SENSOR_LABELS.get(self.feature_names[i], self.feature_names[i]),
                "shap_value": round(float(mean_abs[i]), 4),
                "base_value": 0,
                "current_value": 0,
                "percent_contribution": round(float(mean_abs[i]) / total * 100, 2),
                "direction": "positive",
            }
            for i in ranked[:n_top]
        ]
