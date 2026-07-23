"""
ForgeSight AI — Digital Twin Endpoints (Full Implementation)
GET  /api/v1/twin              — get twin state for a machine
POST /api/v1/twin/whatif       — run what-if parameter simulation
POST /api/v1/twin/forecast     — project RUL trajectory
GET  /api/v1/twin/anomaly      — anomaly detection for a machine
"""
from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path

import numpy as np
from fastapi import APIRouter, HTTPException

from app.domain.models import ApiResponse
from app.services.store import MACHINES_STORE

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_registry():
    from app.services.ml_engine import get_registry
    return get_registry()


# ── GET /twin ─────────────────────────────────────────────────────────────────

@router.get("", response_model=ApiResponse)
async def get_twin(machine_id: str = "M-001"):
    """Return full digital twin state for a machine."""
    machine = MACHINES_STORE.get(machine_id)
    if not machine:
        # Try first available
        machine = next(iter(MACHINES_STORE.values()), None)
    if not machine:
        raise HTTPException(status_code=404, detail="No machines found in store.")

    registry = _get_registry()
    if registry.is_ready:
        sensors = machine.get("sensors", {})
        x = np.zeros(len(registry.feature_names))
        for i, fname in enumerate(registry.feature_names):
            fname_l = fname.lower()
            for key, val in sensors.items():
                if key.lower() in fname_l and isinstance(val, (int, float)):
                    x[i] = float(val)
                    break
        x_scaled = registry.scaler.transform(x.reshape(1, -1))
        rul = float(max(0.0, registry.xgb.predict(x_scaled)[0]))
        health = float(np.clip((rul / 125.0) * 100.0, 0.0, 100.0))
        fail_prob = float(np.clip(1.0 - rul / 125.0, 0.0, 1.0)) * 100.0
        status = "healthy" if health > 75 else "warning" if health > 50 else "critical"

        machine = dict(machine)
        machine["predicted_rul"] = round(rul, 1)
        machine["health_score"] = round(health, 1)
        machine["failure_probability"] = round(fail_prob, 1)
        machine["status"] = status
        machine["model_inference"] = True

    return ApiResponse(data=machine)


# ── POST /twin/whatif ─────────────────────────────────────────────────────────

@router.post("/whatif", response_model=ApiResponse)
async def run_whatif(body: dict):
    """
    What-if simulation: apply parameter overrides and re-infer RUL.
    Body: { machine_id: str, overrides: { speed?: float, temperature?: float, ... } }
    """
    machine_id = body.get("machine_id", "M-001")
    overrides = body.get("overrides", {})

    machine = MACHINES_STORE.get(machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found")

    registry = _get_registry()
    if not registry.is_ready:
        raise HTTPException(status_code=503, detail="ML models not loaded.")

    sensors = dict(machine.get("sensors", {}))
    for key, val in overrides.items():
        sensors[key] = float(val)

    x = np.zeros(len(registry.feature_names))
    for i, fname in enumerate(registry.feature_names):
        fname_l = fname.lower()
        for key, val in sensors.items():
            if key.lower() in fname_l and isinstance(val, (int, float)):
                x[i] = float(val)
                break

    x_scaled = registry.scaler.transform(x.reshape(1, -1))
    new_rul = float(max(0.0, registry.xgb.predict(x_scaled)[0]))
    original_rul = machine.get("predicted_rul", new_rul)

    new_health = float(np.clip((new_rul / 125.0) * 100.0, 0.0, 100.0))
    new_fail_prob = float(np.clip(1.0 - new_rul / 125.0, 0.0, 1.0)) * 100.0
    new_status = "healthy" if new_health > 75 else "warning" if new_health > 50 else "critical"

    rul_delta = new_rul - float(original_rul)
    health_delta = new_health - machine.get("health_score", 50.0)

    return ApiResponse(data={
        "machine_id": machine_id,
        "original_rul": round(float(original_rul), 1),
        "new_rul": round(new_rul, 1),
        "rul_delta": round(rul_delta, 1),
        "new_health": round(new_health, 1),
        "health_delta": round(health_delta, 1),
        "new_failure_probability": round(new_fail_prob, 1),
        "new_status": new_status,
        "overrides_applied": overrides,
        "sensors": sensors,
        "model_used": "XGBoost",
        "timestamp": datetime.utcnow().isoformat(),
    })


# ── POST /twin/forecast ───────────────────────────────────────────────────────

@router.post("/forecast", response_model=ApiResponse)
async def run_forecast(body: dict):
    """
    Forecast RUL trajectory over a specified horizon using degradation simulation.
    Body: { machine_id: str, horizon_cycles: int }
    """
    machine_id = body.get("machine_id", "M-001")
    horizon = int(body.get("horizon_cycles", 50))

    machine = MACHINES_STORE.get(machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found")

    registry = _get_registry()
    if not registry.is_ready:
        raise HTTPException(status_code=503, detail="ML models not loaded.")

    sensors = machine.get("sensors", {})
    x = np.zeros(len(registry.feature_names))
    for i, fname in enumerate(registry.feature_names):
        fname_l = fname.lower()
        for key, val in sensors.items():
            if key.lower() in fname_l and isinstance(val, (int, float)):
                x[i] = float(val)
                break

    # Load conformal quantile
    q_val = 12.36
    try:
        import json
        data_dir = Path(__file__).parent.parent.parent / "data"
        with open(data_dir / "conformal_stats.json") as f:
            q_val = float(json.load(f)["quantiles"].get("q_95", 12.36))
    except Exception:
        pass

    base_cycle = int(sensors.get("cycle", 0))
    trajectory = []
    for step in range(1, horizon + 1):
        x_deg = x * (1.0 - 0.0012 * step)
        x_scaled = registry.scaler.transform(x_deg.reshape(1, -1))
        rul_step = float(max(0.0, registry.xgb.predict(x_scaled)[0]))
        health_step = float(np.clip((rul_step / 125.0) * 100.0, 0.0, 100.0))
        fail_prob = float(np.clip(1.0 - rul_step / 125.0, 0.0, 1.0)) * 100.0

        trajectory.append({
            "cycle": base_cycle + step,
            "predicted_rul": round(rul_step, 1),
            "health": round(health_step, 2),
            "failure_probability": round(fail_prob, 1),
            "rul_lower": round(max(0.0, rul_step - q_val), 1),
            "rul_upper": round(rul_step + q_val, 1),
        })

    # Predict failure cycle
    failure_cycle = next(
        (t["cycle"] for t in trajectory if t["predicted_rul"] < 10), None
    )

    return ApiResponse(data={
        "machine_id": machine_id,
        "trajectory": trajectory,
        "conformal_q95": q_val,
        "failure_cycle": failure_cycle,
        "horizon_cycles": horizon,
    })


# ── GET /twin/anomaly ─────────────────────────────────────────────────────────

@router.get("/anomaly", response_model=ApiResponse)
async def get_anomaly(machine_id: str = "M-001"):
    """Run ensemble anomaly detection for a machine's current sensor state."""
    from app.services.anomaly_engine import detect_all

    machine = MACHINES_STORE.get(machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found")

    sensors = machine.get("sensors", {})
    features = [
        sensors.get("speed", 1500.0),
        sensors.get("torque", 40.0),
        sensors.get("wear", 10.0),
        sensors.get("temperature", 25.0),
        sensors.get("vibration", 1.2),
    ]

    result = detect_all(features)
    result["machine_id"] = machine_id
    result["sensor_snapshot"] = {k: v for k, v in sensors.items() if isinstance(v, (int, float))}
    result["timestamp"] = datetime.utcnow().isoformat()

    return ApiResponse(data=result)


# ── GET /twin/compare ─────────────────────────────────────────────────────────

@router.get("/compare", response_model=ApiResponse)
async def compare_machines():
    """Return all machines with real-time health comparison."""
    registry = _get_registry()
    machines_out = []

    for mid, machine in MACHINES_STORE.items():
        m = dict(machine)
        if registry.is_ready:
            sensors = machine.get("sensors", {})
            x = np.zeros(len(registry.feature_names))
            for i, fname in enumerate(registry.feature_names):
                fname_l = fname.lower()
                for key, val in sensors.items():
                    if key.lower() in fname_l and isinstance(val, (int, float)):
                        x[i] = float(val)
                        break
            try:
                x_scaled = registry.scaler.transform(x.reshape(1, -1))
                rul = float(max(0.0, registry.xgb.predict(x_scaled)[0]))
                m["predicted_rul"] = round(rul, 1)
                m["health_score"] = round(float(np.clip((rul / 125.0) * 100.0, 0.0, 100.0)), 1)
            except Exception:
                pass
        machines_out.append(m)

    return ApiResponse(data=machines_out, message=f"Comparison for {len(machines_out)} machines")
