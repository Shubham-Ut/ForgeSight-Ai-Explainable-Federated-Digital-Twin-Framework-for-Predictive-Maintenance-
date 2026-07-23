"""
ForgeSight AI — Mock Data Service
Provides realistic demo data for Phase 2 scaffold.
Phase 4 replaces all functions with real ML pipeline calls.
"""
from __future__ import annotations
import random
from datetime import datetime, timedelta
from typing import Optional


def get_mock_machines() -> list:
    """Return 4 demo machines across 2 factories."""
    machines = []
    configs = [
        ("M-001", "CNC Machining Center Alpha", "cnc_milling", "F-001", 82.4, 1248, 7.3),
        ("M-002", "Hydraulic Press Delta",       "hydraulic_press", "F-001", 67.1, 612, 28.4),
        ("M-003", "Rotary Compressor Gamma",     "compressor", "F-002", 91.2, 2145, 2.1),
        ("M-004", "Rolling Mill Beta",           "rolling_mill", "F-002", 44.7, 287, 61.2),
    ]
    for mid, name, mtype, fid, health, rul, fail_prob in configs:
        machines.append({
            "metadata": {
                "id": mid, "name": name, "type": mtype, "factory_id": fid,
                "commissioned_date": "2021-03-15", "manufacturer": "Siemens AG",
                "model": "SINUMERIK 840D", "serial_number": f"SN-{mid}-2021",
            },
            "sensors": _mock_sensors(mid),
            "health_score": health + random.gauss(0, 0.5),
            "predicted_rul": rul + random.randint(-10, 10),
            "failure_probability": fail_prob,
            "components": _mock_components(health),
            "recommended_action": _recommend(health),
            "estimated_downtime": max(0.5, (100 - health) * 0.15),
            "estimated_repair_cost": int((100 - health) * 320),
            "status": _status(health),
            "last_updated": datetime.utcnow().isoformat(),
            "anomaly_score": max(0, min(1, (100 - health) / 100 + random.gauss(0, 0.03))),
        })
    return machines


def get_mock_machine(machine_id: str) -> Optional[dict]:
    machines = {m["metadata"]["id"]: m for m in get_mock_machines()}
    return machines.get(machine_id)


def get_mock_prediction(machine_id: str) -> dict:
    m = get_mock_machine(machine_id)
    rul = m["predicted_rul"] if m else 1000
    health = m["health_score"] if m else 80
    return {
        "machine_id": machine_id,
        "timestamp": datetime.utcnow().isoformat(),
        "model_name": "XGBoost",
        "model_version": "3.1.0",
        "rul": rul,
        "rul_lower": max(0, rul - 85),
        "rul_upper": rul + 92,
        "health_score": health,
        "failure_probability": m["failure_probability"] if m else 10.0,
        "anomaly_score": m["anomaly_score"] if m else 0.05,
        "confidence": 94.3,
        "maintenance_priority": _priority(health),
        "estimated_failure_date": (datetime.utcnow() + timedelta(hours=rul * 0.5)).isoformat(),
    }


# ── Helpers ──────────────────────────────────────────────────────────────────

def _mock_sensors(machine_id: str) -> dict:
    seed = sum(ord(c) for c in machine_id)
    rng = random.Random(seed)
    return {
        "machine_id": machine_id, "factory_id": "F-001",
        "timestamp": datetime.utcnow().isoformat(),
        "temperature": rng.uniform(60, 95),
        "pressure": rng.uniform(6, 12),
        "vibration": rng.uniform(0.5, 4.5),
        "speed": rng.uniform(1200, 1600),
        "torque": rng.uniform(25, 55),
        "power_consumption": rng.uniform(12, 22),
        "motor_current": rng.uniform(10, 18),
    }


def _mock_components(health: float) -> list:
    names = ["High-Speed Spindle", "Bearing Assembly", "Servo Motor", "Coolant Pump",
             "Tool Changer", "Control Board", "Hydraulic Unit", "Linear Guides"]
    components = []
    for i, name in enumerate(names):
        h = max(5, health + random.gauss(0, 12))
        components.append({
            "id": f"comp-{i+1}", "name": name,
            "health_score": round(h, 1), "status": _status(h),
            "shap_contribution": round(random.uniform(-0.2, 0.4), 3),
            "description": f"{name} health at {h:.0f}%",
            "replacement_due_in": max(1, (h / 100) * 2000),
        })
    return components


def _status(health: float) -> str:
    if health >= 75: return "healthy"
    if health >= 50: return "warning"
    if health >= 25: return "critical"
    return "failed"


def _recommend(health: float) -> str:
    if health >= 75: return "Continue normal operations — next scheduled check in 7 days"
    if health >= 50: return "Schedule preventive maintenance within 48 hours"
    if health >= 25: return "Immediate inspection required — high failure risk"
    return "EMERGENCY: Take offline immediately and initiate repair"


def _priority(health: float) -> str:
    if health >= 75: return "routine"
    if health >= 60: return "monitor"
    if health >= 40: return "scheduled"
    return "immediate"
