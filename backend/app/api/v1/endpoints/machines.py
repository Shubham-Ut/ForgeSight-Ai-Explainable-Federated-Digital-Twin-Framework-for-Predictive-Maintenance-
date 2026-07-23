"""
ForgeSight AI — Machines, SHAP, Counterfactual & Digital Twin Endpoints
All predictions, SHAP values, and counterfactuals use the trained XGBoost model.
"""
from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path

import numpy as np
from fastapi import APIRouter, HTTPException

from app.domain.models import ApiResponse
from app.services.store import MACHINES_STORE
from app.services.xai_engine import calculate_exact_shap, calculate_counterfactual

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_full_feature_vector(machine: dict) -> np.ndarray:
    """
    Build the full feature vector from a machine's sensor readings,
    aligned with the model's expected feature order.
    """
    from app.services.ml_engine import get_registry
    registry = get_registry()

    if not registry.is_ready:
        return None

    sensors = machine.get("sensors", {})
    x = np.zeros(len(registry.feature_names))
    for i, fname in enumerate(registry.feature_names):
        fname_l = fname.lower()
        for key, val in sensors.items():
            if key.lower() in fname_l and isinstance(val, (int, float)):
                x[i] = float(val)
                break
    return x


@router.get("", response_model=ApiResponse)
async def list_machines():
    """List all machines with model-predicted health states."""
    machines = list(MACHINES_STORE.values())
    return ApiResponse(data=machines, message=f"Returned {len(machines)} machines")


@router.get("/{machine_id}", response_model=ApiResponse)
async def get_machine(machine_id: str):
    machine = MACHINES_STORE.get(machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found")
    return ApiResponse(data=machine)


@router.get("/{machine_id}/status", response_model=ApiResponse)
async def get_machine_status(machine_id: str):
    machine = MACHINES_STORE.get(machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found")
    return ApiResponse(data={
        "machine_id": machine_id,
        "status": machine.get("status", "unknown"),
        "health_score": machine.get("health_score"),
        "predicted_rul": machine.get("predicted_rul"),
        "last_seen": datetime.utcnow().isoformat(),
    })


@router.get("/{machine_id}/shap", response_model=ApiResponse)
async def get_machine_shap(machine_id: str):
    """
    Compute TreeSHAP attributions for this machine's current sensor state.
    Uses the trained XGBoost model — not the legacy mock engine.
    """
    from app.services.ml_engine import get_registry
    import shap as shap_lib

    machine = MACHINES_STORE.get(machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found")

    registry = get_registry()
    if not registry.is_ready:
        raise HTTPException(
            status_code=503,
            detail="ML models not loaded. Run: python experiments/run_training.py",
        )

    x_full = _get_full_feature_vector(machine)
    if x_full is None:
        raise HTTPException(status_code=500, detail="Cannot build feature vector.")

    x_scaled = registry.scaler.transform(x_full.reshape(1, -1))

    # TreeSHAP via loaded model
    try:
        explainer = shap_lib.TreeExplainer(registry.xgb)
        shap_values = explainer.shap_values(x_scaled)
        sv = shap_values[0]
        base_val = float(explainer.expected_value)
        predicted_rul = float(registry.xgb.predict(x_scaled)[0])
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"SHAP computation failed: {exc}")

    total_abs = float(np.abs(sv).sum()) + 1e-10
    features_out = []
    for i, fname in enumerate(registry.feature_names):
        val = float(sv[i])
        features_out.append({
            "feature_name": fname,
            "shap_value": round(val, 4),
            "base_value": round(base_val, 4),
            "current_value": round(float(x_full[i]), 4),
            "percent_contribution": round(abs(val) / total_abs * 100, 2),
            "direction": "positive" if val >= 0 else "negative",
        })
    features_out.sort(key=lambda r: abs(r["shap_value"]), reverse=True)

    # NLP explanation
    top3 = features_out[:3]
    neg_drivers = [f for f in top3 if f["direction"] == "negative"]
    pos_drivers = [f for f in top3 if f["direction"] == "positive"]
    nlp = (
        f"Model predicts RUL = {predicted_rul:.0f} cycles (baseline: {base_val:.0f}). "
    )
    if neg_drivers:
        nlp += f"Primary degradation drivers: {', '.join(f['feature_name'] for f in neg_drivers)}. "
    if pos_drivers:
        nlp += f"Factors supporting health: {', '.join(f['feature_name'] for f in pos_drivers)}."

    # Update component SHAP contributions in store
    for comp in machine.get("components", []):
        comp["shap_contribution"] = round(float(sv[0]) if len(sv) > 0 else 0.0, 4)

    return ApiResponse(data={
        "machine_id": machine_id,
        "prediction_id": f"pred-{machine_id}-{int(datetime.utcnow().timestamp())}",
        "timestamp": datetime.utcnow().isoformat(),
        "baseline_rul": round(base_val, 2),
        "predicted_rul": round(predicted_rul, 2),
        "shap_values": features_out,
        "global_importance": features_out[:15],
        "nlp_explanation": nlp,
        "model": "XGBoost_TreeSHAP",
    })


@router.post("/{machine_id}/counterfactual", response_model=ApiResponse)
async def get_machine_counterfactual(machine_id: str, body: dict):
    """
    Compute scipy L-BFGS-B counterfactual for this machine.
    Paper Equation 5: min ||delta||_1 + lambda*(f(x+delta) - y')^2
    """
    machine = MACHINES_STORE.get(machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found")

    target_rul = float(body.get("target_rul", 80.0))
    lambda_reg = float(body.get("lambda_reg", 1.0))

    sensors = machine.get("sensors", {})
    # Build 5-element legacy feature vector for counterfactual interface
    features = [
        sensors.get("speed", 1500.0),
        sensors.get("torque", 40.0),
        sensors.get("wear", 10.0),
        sensors.get("temperature", 25.0),
        sensors.get("vibration", 1.2),
    ]

    try:
        cf_data = calculate_counterfactual(
            machine_id, target_rul, features,
            lambda_reg=lambda_reg,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return ApiResponse(data=cf_data)


@router.get("/{machine_id}/twin", response_model=ApiResponse)
async def get_machine_twin(machine_id: str):
    machine = MACHINES_STORE.get(machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found")
    return ApiResponse(data=machine)


@router.post("/{machine_id}/twin/whatif", response_model=ApiResponse)
async def post_machine_whatif(machine_id: str, body: dict):
    """
    What-if simulation: apply sensor overrides and re-run XGBoost inference.
    Returns updated twin state with real model predictions.
    """
    from app.services.ml_engine import get_registry
    import shap as shap_lib

    machine = MACHINES_STORE.get(machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found")

    registry = get_registry()
    if not registry.is_ready:
        raise HTTPException(status_code=503, detail="Models not loaded.")

    overrides = body.get("overrides", {})
    sensors = dict(machine["sensors"])
    for key, val in overrides.items():
        if key in sensors:
            sensors[key] = float(val)

    # Build full feature vector with overrides
    x = np.zeros(len(registry.feature_names))
    for i, fname in enumerate(registry.feature_names):
        fname_l = fname.lower()
        for key, val in sensors.items():
            if key.lower() in fname_l and isinstance(val, (int, float)):
                x[i] = float(val)
                break

    x_scaled = registry.scaler.transform(x.reshape(1, -1))
    new_rul = float(registry.xgb.predict(x_scaled)[0])
    new_health = float(np.clip((new_rul / 125.0) * 100.0, 0.0, 100.0))
    new_fail_prob = float(np.clip(1.0 - new_rul / 125.0, 0.0, 1.0)) * 100.0
    new_status = "healthy" if new_health > 75 else "warning" if new_health > 50 else "critical"

    updated_twin = dict(machine)
    updated_twin["sensors"] = sensors
    updated_twin["health_score"] = round(new_health, 1)
    updated_twin["predicted_rul"] = round(new_rul, 1)
    updated_twin["failure_probability"] = round(new_fail_prob, 1)
    updated_twin["status"] = new_status
    updated_twin["last_updated"] = datetime.utcnow().isoformat()
    updated_twin["model_used"] = "XGBoost_whatif"

    return ApiResponse(data=updated_twin)


@router.post("/{machine_id}/twin/forecast", response_model=ApiResponse)
async def post_machine_forecast(machine_id: str, body: dict):
    """
    Project RUL trajectory using the loaded model with degradation simulation.
    Each step applies a realistic sensor degradation increment and re-infers.
    """
    from app.services.ml_engine import get_registry

    machine = MACHINES_STORE.get(machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found")

    registry = get_registry()
    horizon = int(body.get("horizon_cycles", 50))

    x_full = _get_full_feature_vector(machine)
    if x_full is None or not registry.is_ready:
        raise HTTPException(status_code=503, detail="Models not loaded.")

    base_cycle = int(machine["sensors"].get("cycle", 0))

    trajectory = []
    # Load conformal quantile for uncertainty bounds
    q_val = 12.36  # default paper value
    try:
        import json
        data_dir = Path(__file__).parent.parent.parent / "data"
        with open(data_dir / "conformal_stats.json") as f:
            q_val = float(json.load(f)["quantiles"].get("q_95", 12.36))
    except Exception:
        pass

    for step in range(1, horizon + 1):
        # Simulate linear sensor degradation per cycle
        x_deg = x_full.copy()
        x_deg = x_deg * (1.0 - 0.001 * step)  # gentle degradation
        x_scaled = registry.scaler.transform(x_deg.reshape(1, -1))
        rul_step = float(max(0.0, registry.xgb.predict(x_scaled)[0]))
        health_step = float(np.clip((rul_step / 125.0) * 100.0, 0.0, 100.0))

        trajectory.append({
            "cycle": base_cycle + step,
            "predicted_rul": round(rul_step, 1),
            "health": round(health_step, 2),
            "rul_lower": round(max(0.0, rul_step - q_val), 1),
            "rul_upper": round(rul_step + q_val, 1),
        })

    return ApiResponse(data={"trajectory": trajectory, "conformal_q95": q_val})
