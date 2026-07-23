"""
ForgeSight AI — Alerts Management Endpoints (Full Implementation)
GET  /api/v1/alerts                          — list all alerts (with optional machine_id filter)
POST /api/v1/alerts/generate                 — auto-generate alerts from current machine states
POST /api/v1/alerts/{alert_id}/acknowledge   — acknowledge an alert
POST /api/v1/alerts/{alert_id}/resolve       — resolve an alert
DELETE /api/v1/alerts/{alert_id}             — delete an alert
GET  /api/v1/alerts/stats                    — summary statistics
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from app.domain.models import ApiResponse
from app.services.store import ALERTS_STORE, MACHINES_STORE

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Threshold Config ──────────────────────────────────────────────────────────
_RUL_THRESHOLDS = {
    "critical": 30,   # cycles
    "high":     60,
    "medium":   100,
}
_HEALTH_THRESHOLDS = {
    "critical": 40,   # %
    "high":     60,
    "medium":   75,
}
_FAIL_PROB_THRESHOLDS = {
    "critical": 70,   # %
    "high":     50,
    "medium":   30,
}


def _determine_severity(rul: float, health: float, fail_prob: float) -> str:
    if rul < _RUL_THRESHOLDS["critical"] or health < _HEALTH_THRESHOLDS["critical"] or fail_prob > _FAIL_PROB_THRESHOLDS["critical"]:
        return "critical"
    if rul < _RUL_THRESHOLDS["high"] or health < _HEALTH_THRESHOLDS["high"] or fail_prob > _FAIL_PROB_THRESHOLDS["high"]:
        return "high"
    if rul < _RUL_THRESHOLDS["medium"] or health < _HEALTH_THRESHOLDS["medium"] or fail_prob > _FAIL_PROB_THRESHOLDS["medium"]:
        return "medium"
    return "low"


def _build_alert_message(machine: dict, severity: str) -> tuple[str, str]:
    """Build (type, message) for an alert based on machine state."""
    name = machine.get("metadata", {}).get("name", machine.get("name", "Machine"))
    rul = machine.get("predictedRUL", machine.get("predicted_rul", 0))
    health = machine.get("healthScore", machine.get("health_score", 0))
    fail_prob = machine.get("failureProbability", machine.get("failure_probability", 0))

    sensors = machine.get("sensors", {})
    temp = sensors.get("temperature", 25)
    vib = sensors.get("vibration", 1.0)
    wear = sensors.get("wear", 0)

    # Determine dominant fault indicator
    if vib > 5.0:
        alert_type = "Bearing Vibration Anomaly"
        message = f"{name}: Vibration RMS {vib:.2f} mm/s exceeds threshold. Likely bearing degradation."
    elif temp > 80:
        alert_type = "Thermal Overload Detected"
        message = f"{name}: Spindle temperature {temp:.1f}°C above safe limit. Check coolant flow."
    elif wear > 200:
        alert_type = "Tool Wear Critical"
        message = f"{name}: Tool wear index {wear:.0f} min — approaching replacement threshold."
    elif rul < _RUL_THRESHOLDS["critical"]:
        alert_type = "Critical RUL Warning"
        message = f"{name}: Remaining Useful Life = {round(rul, 0)} cycles. Immediate maintenance required."
    elif health < _HEALTH_THRESHOLDS["critical"]:
        alert_type = "Machine Health Critical"
        message = f"{name}: Health score dropped to {round(health, 1)}%. Schedule inspection."
    else:
        alert_type = "Predictive Maintenance Alert"
        message = f"{name}: Failure probability {round(fail_prob, 1)}%. Preventive action recommended."

    return alert_type, message


def _recommended_action(severity: str, alert_type: str) -> str:
    if "critical" in severity.lower() or "Critical" in alert_type:
        return "Schedule emergency maintenance within 8 hours. Do not defer."
    if severity == "high":
        return "Plan preventive maintenance within 48 hours. Monitor continuously."
    if severity == "medium":
        return "Monitor closely. Schedule maintenance within 7 days."
    return "Log for review. Continue normal monitoring schedule."


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=ApiResponse)
async def get_alerts(
    machine_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    acknowledged: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=200),
):
    """List all alerts with optional filters."""
    alerts = [a for a in ALERTS_STORE if not a.get("resolved", False)]

    if machine_id:
        alerts = [a for a in alerts if a.get("machine_id") == machine_id]
    if severity:
        alerts = [a for a in alerts if a.get("severity") == severity]
    if acknowledged is not None:
        alerts = [a for a in alerts if a.get("acknowledged", False) == acknowledged]

    # Sort: critical first, then by timestamp desc
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    alerts.sort(key=lambda a: (severity_order.get(a.get("severity", "low"), 9),
                               a.get("created_at", ""), ))
    return ApiResponse(data=alerts[:limit], message=f"{len(alerts)} active alerts")


@router.post("/generate", response_model=ApiResponse)
async def generate_alerts():
    """
    Auto-generate alerts by inspecting all machines' current health state.
    Deduplicates: one active alert per machine per severity level.
    """
    new_alerts = []
    active_machine_severity = {
        a["machine_id"]: a["severity"]
        for a in ALERTS_STORE
        if not a.get("resolved", False) and not a.get("acknowledged", False)
    }

    for mid, machine in MACHINES_STORE.items():
        rul = float(machine.get("predictedRUL", machine.get("predicted_rul", 999)))
        health = float(machine.get("healthScore", machine.get("health_score", 100)))
        fail_prob = float(machine.get("failureProbability", machine.get("failure_probability", 0)))

        severity = _determine_severity(rul, health, fail_prob)

        # Only generate alert if severity is medium or higher and no same/higher alert exists
        if severity == "low":
            continue
        existing = active_machine_severity.get(mid)
        sev_rank = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        if existing and sev_rank.get(existing, 3) <= sev_rank.get(severity, 3):
            continue  # Already have equal or worse alert

        alert_type, message = _build_alert_message(machine, severity)
        name = machine.get("metadata", {}).get("name", machine.get("name", mid))
        factory = machine.get("metadata", {}).get("factoryId", machine.get("factory_id", ""))

        alert = {
            "id": f"ALT-{uuid.uuid4().hex[:8].upper()}",
            "machine_id": mid,
            "machine_name": name,
            "factory_id": factory,
            "type": alert_type,
            "message": message,
            "severity": severity,
            "recommended_action": _recommended_action(severity, alert_type),
            "created_at": datetime.utcnow().isoformat(),
            "acknowledged": False,
            "resolved": False,
            "acknowledged_by": None,
            "acknowledged_at": None,
            "metrics_snapshot": {
                "rul": round(rul, 1),
                "health_score": round(health, 1),
                "failure_probability": round(fail_prob, 1),
            },
        }
        ALERTS_STORE.append(alert)
        new_alerts.append(alert)

    return ApiResponse(
        data={"generated": len(new_alerts), "alerts": new_alerts},
        message=f"Generated {len(new_alerts)} new alerts from {len(MACHINES_STORE)} machines.",
    )


@router.get("/stats", response_model=ApiResponse)
async def get_alert_stats():
    """Summary statistics for active alerts."""
    active = [a for a in ALERTS_STORE if not a.get("resolved", False)]
    return ApiResponse(data={
        "total_active": len(active),
        "critical": sum(1 for a in active if a.get("severity") == "critical"),
        "high": sum(1 for a in active if a.get("severity") == "high"),
        "medium": sum(1 for a in active if a.get("severity") == "medium"),
        "low": sum(1 for a in active if a.get("severity") == "low"),
        "acknowledged": sum(1 for a in active if a.get("acknowledged", False)),
        "unacknowledged": sum(1 for a in active if not a.get("acknowledged", False)),
        "total_all_time": len(ALERTS_STORE),
    })


@router.post("/{alert_id}/acknowledge", response_model=ApiResponse)
async def acknowledge_alert(alert_id: str, body: dict = {}):
    for alert in ALERTS_STORE:
        if alert["id"] == alert_id:
            if alert.get("resolved"):
                raise HTTPException(status_code=400, detail="Alert already resolved.")
            alert["acknowledged"] = True
            alert["acknowledged_by"] = body.get("operator", "Operator-Alpha")
            alert["acknowledged_at"] = datetime.utcnow().isoformat()
            return ApiResponse(data=alert, message="Alert acknowledged successfully")
    raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")


@router.post("/{alert_id}/resolve", response_model=ApiResponse)
async def resolve_alert(alert_id: str, body: dict = {}):
    for alert in ALERTS_STORE:
        if alert["id"] == alert_id:
            alert["resolved"] = True
            alert["resolved_at"] = datetime.utcnow().isoformat()
            alert["resolution_notes"] = body.get("notes", "Resolved by operator.")
            alert["resolved_by"] = body.get("operator", "Operator-Alpha")
            return ApiResponse(data=alert, message="Alert resolved successfully")
    raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")


@router.delete("/{alert_id}", response_model=ApiResponse)
async def delete_alert(alert_id: str):
    global ALERTS_STORE
    original_len = len(ALERTS_STORE)
    ALERTS_STORE[:] = [a for a in ALERTS_STORE if a["id"] != alert_id]
    if len(ALERTS_STORE) == original_len:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    return ApiResponse(data={"deleted_id": alert_id}, message="Alert deleted")
