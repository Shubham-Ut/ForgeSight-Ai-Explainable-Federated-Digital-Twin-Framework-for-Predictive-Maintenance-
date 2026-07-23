"""
ForgeSight AI — Digital Twin Engine
Real-time machine state management with physics-based degradation
"""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional
import numpy as np


# Component color map: health score → hex color
def health_to_color(score: float) -> str:
    """Map health score [0-100] to hex color."""
    if score >= 75: return "#10b981"   # emerald — healthy
    if score >= 50: return "#f59e0b"   # amber   — warning
    if score >= 25: return "#f97316"   # orange  — degraded
    return "#f43f5e"                   # rose    — critical


@dataclass
class ComponentState:
    id: str
    name: str
    health_score: float       # 0–100
    degradation_rate: float   # health lost per cycle
    shap_contribution: float  # SHAP attribution
    last_maintenance: Optional[str] = None
    replacement_threshold: float = 15.0

    @property
    def status(self) -> str:
        if self.health_score >= 75: return "healthy"
        if self.health_score >= 50: return "warning"
        if self.health_score >= 25: return "critical"
        return "failed"

    @property
    def color(self) -> str:
        return health_to_color(self.health_score)

    @property
    def cycles_to_replacement(self) -> float:
        if self.degradation_rate <= 0:
            return float("inf")
        return max(0, (self.health_score - self.replacement_threshold) / self.degradation_rate)

    def step(self, sensor_stress: float = 1.0) -> None:
        """Advance one cycle with optional stress factor."""
        delta = self.degradation_rate * sensor_stress
        self.health_score = max(0, self.health_score - delta)


@dataclass
class DigitalTwinEngine:
    """
    Physics-based Digital Twin for a single machine.
    Maintains component state, degradation model, and generates 3D visual state.
    """
    machine_id: str
    factory_id: str
    machine_type: str
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    components: Dict[str, ComponentState] = field(default_factory=dict)
    sensor_history: List[Dict] = field(default_factory=list)
    cycle: int = 0

    # ML predictions (updated externally)
    predicted_rul: float = 300.0
    failure_probability: float = 0.05
    health_score: float = 90.0

    def initialize_components(self) -> None:
        """Initialize standard machine components."""
        component_configs = [
            ("spindle",      "High-Speed Spindle",     88.0, 0.04),
            ("bearing",      "Bearing Assembly",        82.0, 0.06),
            ("servo",        "Servo Motor",             91.0, 0.03),
            ("coolant",      "Coolant System",          95.0, 0.02),
            ("tool_changer", "Tool Changer",            87.0, 0.04),
            ("control",      "Control Board",           99.0, 0.01),
            ("hydraulic",    "Hydraulic Unit",          79.0, 0.07),
            ("guides",       "Linear Guides",           84.0, 0.05),
        ]
        for cid, cname, h, dr in component_configs:
            self.components[cid] = ComponentState(
                id=cid, name=cname, health_score=h, degradation_rate=dr,
                shap_contribution=0.0,
            )

    def update_from_sensors(self, sensors: Dict[str, float]) -> None:
        """Update component states based on sensor readings."""
        # Compute stress factor from key sensors
        temp_stress = max(1.0, sensors.get("temperature", 70) / 70)
        vib_stress  = max(1.0, sensors.get("vibration", 1.0) / 1.0)
        stress = (temp_stress + vib_stress) / 2

        # Advance each component
        for component in self.components.values():
            component.step(sensor_stress=stress)

        # Recompute global health
        all_scores = [c.health_score for c in self.components.values()]
        # Weighted min — lowest component drags overall health down
        self.health_score = float(np.percentile(all_scores, 20) * 0.5 + np.mean(all_scores) * 0.5)
        self.cycle += 1

        # Archive sensor reading
        self.sensor_history.append({**sensors, "cycle": self.cycle, "timestamp": datetime.utcnow().isoformat()})
        if len(self.sensor_history) > 200:  # Circular buffer
            self.sensor_history.pop(0)

    def get_state(self) -> Dict:
        """Return complete twin state for API / WebSocket push."""
        return {
            "machine_id": self.machine_id,
            "factory_id": self.factory_id,
            "timestamp": datetime.utcnow().isoformat(),
            "cycle": self.cycle,
            "health_score": round(self.health_score, 2),
            "predicted_rul": round(self.predicted_rul, 1),
            "failure_probability": round(self.failure_probability * 100, 2),
            "component_health": {
                cid: round(c.health_score, 2)
                for cid, c in self.components.items()
            },
            "component_colors": {
                cid: c.color for cid, c in self.components.items()
            },
            "component_status": {
                cid: c.status for cid, c in self.components.items()
            },
            "active_alerts": self._get_active_alerts(),
            "simulation_mode": "live",
        }

    def _get_active_alerts(self) -> List[Dict]:
        alerts = []
        for cid, comp in self.components.items():
            if comp.health_score < 50:
                severity = "critical" if comp.health_score < 25 else "warning"
                alerts.append({
                    "component_id": cid,
                    "component_name": comp.name,
                    "severity": severity,
                    "message": f"{comp.name} health at {comp.health_score:.0f}% — {'Immediate replacement required' if severity == 'critical' else 'Schedule maintenance'}",
                    "detected_at": datetime.utcnow().isoformat(),
                    "shap_contribution": comp.shap_contribution,
                })
        return alerts

    def project_future(self, horizon_cycles: int = 50) -> List[Dict]:
        """Project future degradation trajectory."""
        trajectory = []
        health = self.health_score
        avg_rate = np.mean([c.degradation_rate for c in self.components.values()])

        for i in range(1, horizon_cycles + 1):
            health = max(0, health - avg_rate)
            rul = max(0, self.predicted_rul - i)
            trajectory.append({
                "cycle": self.cycle + i,
                "predicted_health": round(health, 2),
                "predicted_rul": round(rul, 1),
                "confidence_lower": round(max(0, health - 8), 2),
                "confidence_upper": round(min(100, health + 8), 2),
            })
        return trajectory
