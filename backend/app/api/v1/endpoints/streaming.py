"""
ForgeSight AI — WebSocket Streaming Endpoint
Real-time sensor telemetry replay from NASA C-MAPSS test engines.
Every RUL, anomaly_score, and SHAP value comes from the trained model.
NO random.gauss() synthetic data.
"""
from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)
router = APIRouter()


# ── C-MAPSS telemetry cache ───────────────────────────────────────────────────

class CmapssTelemetryReplay:
    """
    Loads the NASA C-MAPSS FD001 test dataset and replays engine cycles.
    Each call to `next_reading(engine_id)` returns the next sensor row
    for that engine, cycling back to the start when exhausted.
    """
    _instance: Optional["CmapssTelemetryReplay"] = None
    _loaded: bool = False
    _engines: Dict[str, List[Dict]] = {}

    @classmethod
    def get(cls) -> "CmapssTelemetryReplay":
        if cls._instance is None:
            cls._instance = cls()
            cls._instance._load()
        return cls._instance

    def _load(self) -> None:
        try:
            import sys
            root = Path(__file__).parent.parent.parent.parent.parent
            sys.path.insert(0, str(root))

            from ml.preprocessing.cmapss_loader import load_cmapss_fd
            from ml.preprocessing.feature_engineering import build_feature_matrix

            SENSOR_COLS = [
                "s2", "s3", "s4", "s7", "s8", "s9",
                "s11", "s12", "s13", "s14", "s15", "s17", "s20", "s21",
            ]
            _, test_df = load_cmapss_fd("FD001", informative_only=True)

            # Group by engine unit (map to machine IDs M-001 .. M-004)
            units = test_df["unit_id"].unique()
            machine_ids = ["M-001", "M-002", "M-003", "M-004"]

            for i, machine_id in enumerate(machine_ids):
                # Assign engines round-robin across 4 machines
                engine_units = units[i::4]
                rows = []
                for unit in engine_units[:3]:  # 3 engines per machine
                    unit_df = test_df[test_df["unit_id"] == unit].copy()
                    for _, row in unit_df.iterrows():
                        record = {col: float(row[col]) for col in SENSOR_COLS if col in unit_df.columns}
                        record["cycle"] = int(row["cycle"])
                        record["true_rul"] = float(row["rul"])
                        record["unit_id"] = int(unit)
                        rows.append(record)
                self._engines[machine_id] = rows

            self._pointers = {mid: 0 for mid in machine_ids}
            self._loaded = True
            logger.info("cmapss_replay.loaded", extra={"engines": len(self._engines)})

        except Exception as exc:
            logger.warning("cmapss_replay.load_failed", extra={"error": str(exc)})
            self._loaded = False

    def next_reading(self, machine_id: str) -> Optional[Dict]:
        if not self._loaded or machine_id not in self._engines:
            return None
        rows = self._engines[machine_id]
        if not rows:
            return None
        ptr = self._pointers.get(machine_id, 0)
        reading = rows[ptr % len(rows)]
        self._pointers[machine_id] = (ptr + 1) % len(rows)
        return reading

    @property
    def is_loaded(self) -> bool:
        return self._loaded


# ── Model inference helper ────────────────────────────────────────────────────

def _infer_from_sensor_row(
    sensor_row: Dict,
    machine_id: str,
) -> Dict:
    """
    Given a C-MAPSS sensor row dict, run XGBoost + TreeSHAP and return
    the enriched telemetry payload.
    """
    from app.services.ml_engine import get_registry

    registry = get_registry()
    timestamp = datetime.utcnow().isoformat()

    # Map sensor columns to full feature vector
    feature_names = registry.feature_names if registry.is_ready else []
    n = len(feature_names)
    x_raw = np.zeros(n)
    for i, fname in enumerate(feature_names):
        if fname in sensor_row:
            x_raw[i] = sensor_row[fname]

    if registry.is_ready:
        x_scaled = registry.scaler.transform(x_raw.reshape(1, -1))
        rul = float(registry.xgb.predict(x_scaled)[0])
        rf_rul = float(registry.rf.predict(x_scaled)[0])
        failure_prob = float(np.clip(1.0 - rul / 125.0, 0.0, 1.0))
        anomaly_score = registry.anomaly_score(rul)
        health_score = float(np.clip((rul / 125.0) * 100.0, 0.0, 100.0))

        # Local SHAP explanation (top 5 features)
        try:
            import shap as shap_lib
            explainer = shap_lib.TreeExplainer(registry.xgb)
            sv = explainer.shap_values(x_scaled)[0]
            top5_idx = np.argsort(np.abs(sv))[::-1][:5]
            shap_summary = [
                {
                    "feature": feature_names[j],
                    "shap_value": round(float(sv[j]), 4),
                    "direction": "positive" if sv[j] >= 0 else "negative",
                }
                for j in top5_idx
            ]
        except Exception:
            shap_summary = []

        return {
            "machine_id": machine_id,
            "timestamp": timestamp,
            "cycle": sensor_row.get("cycle", 0),
            "unit_id": sensor_row.get("unit_id", 0),
            "sensors": {
                k: round(v, 4)
                for k, v in sensor_row.items()
                if k not in ("cycle", "true_rul", "unit_id")
            },
            "predicted_rul": round(rul, 1),
            "rf_rul": round(rf_rul, 1),
            "true_rul": round(sensor_row.get("true_rul", -1), 1),
            "health_score": round(health_score, 2),
            "failure_probability": round(failure_prob * 100, 2),
            "anomaly_score": round(anomaly_score, 4),
            "shap_top5": shap_summary,
        }
    else:
        # Models not loaded — return raw telemetry with status warning
        return {
            "machine_id": machine_id,
            "timestamp": timestamp,
            "cycle": sensor_row.get("cycle", 0),
            "sensors": {
                k: round(v, 4)
                for k, v in sensor_row.items()
                if k not in ("cycle", "true_rul", "unit_id")
            },
            "predicted_rul": None,
            "health_score": None,
            "failure_probability": None,
            "anomaly_score": None,
            "model_status": "not_loaded — run: python experiments/run_training.py",
        }


# ── WebSocket endpoints ───────────────────────────────────────────────────────

@router.websocket("/sensors/{machine_id}")
async def sensor_stream(websocket: WebSocket, machine_id: str):
    """
    Stream live C-MAPSS sensor readings at 1 Hz with real XGBoost predictions.
    Each message contains: sensors, predicted_rul, health_score,
    failure_probability, anomaly_score, shap_top5.
    """
    await websocket.accept()
    logger.info("ws.sensor.connected", extra={"machine_id": machine_id})

    replay = CmapssTelemetryReplay.get()
    sequence_id = 0

    try:
        while True:
            sequence_id += 1
            sensor_row = replay.next_reading(machine_id)

            if sensor_row is not None:
                payload = _infer_from_sensor_row(sensor_row, machine_id)
            else:
                # C-MAPSS not available — send status message
                payload = {
                    "machine_id": machine_id,
                    "timestamp": datetime.utcnow().isoformat(),
                    "status": "cmapss_not_loaded",
                    "message": "Run: python experiments/run_training.py",
                }

            await websocket.send_text(json.dumps({
                "type": "sensor_update",
                "machine_id": machine_id,
                "payload": payload,
                "timestamp": datetime.utcnow().isoformat(),
                "sequence_id": sequence_id,
            }))
            await asyncio.sleep(1.0)  # 1 Hz

    except WebSocketDisconnect:
        logger.info("ws.sensor.disconnected", extra={"machine_id": machine_id})
    except Exception as exc:
        logger.error("ws.sensor.error", extra={"machine_id": machine_id, "error": str(exc)})


@router.websocket("/federated")
async def federated_stream(websocket: WebSocket):
    """
    Stream federated learning round progress from federated_history.json.
    Falls back to live simulation if no history file exists.
    """
    await websocket.accept()
    logger.info("ws.federated.connected")

    history_path = Path(__file__).parent.parent.parent / "data" / "federated_history.json"

    try:
        # Load real round history if available
        fl_rounds = []
        if history_path.exists():
            import json as _json
            with open(history_path) as f:
                fl_data = _json.load(f)
            fl_rounds = fl_data.get("rounds", [])

        round_ptr = 0
        while True:
            if fl_rounds:
                rnd = fl_rounds[round_ptr % len(fl_rounds)]
                payload = {
                    "round_id": rnd.get("round_id", round_ptr + 1),
                    "global_accuracy": rnd.get("global_accuracy", 0.0),
                    "global_loss": rnd.get("global_loss", 0.0),
                    "global_mae": rnd.get("global_mae", 0.0),
                    "privacy_budget_epsilon": rnd.get("privacy_budget_epsilon", 0.0),
                    "client_count": rnd.get("client_count", 4),
                    "timestamp": datetime.utcnow().isoformat(),
                    "source": "history",
                }
                round_ptr += 1
            else:
                payload = {
                    "round_id": round_ptr + 1,
                    "global_accuracy": None,
                    "global_loss": None,
                    "status": "no_federated_history",
                    "message": "Run: python experiments/run_federated.py",
                    "timestamp": datetime.utcnow().isoformat(),
                    "source": "pending",
                }

            await websocket.send_text(json.dumps({
                "type": "fl_round_update",
                "payload": payload,
                "timestamp": datetime.utcnow().isoformat(),
                "sequence_id": round_ptr,
            }))
            await asyncio.sleep(3.0)

    except WebSocketDisconnect:
        logger.info("ws.federated.disconnected")
    except Exception as exc:
        logger.error("ws.federated.error", extra={"error": str(exc)})
