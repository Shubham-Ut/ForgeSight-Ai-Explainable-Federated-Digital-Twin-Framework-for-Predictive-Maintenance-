"""
ForgeSight AI — Pydantic Domain Models (API Schemas)
All request/response models with strict validation
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, model_validator


# ── Enums ─────────────────────────────────────────────────────────────────────

class MachineStatus(str, Enum):
    HEALTHY  = "healthy"
    WARNING  = "warning"
    CRITICAL = "critical"
    FAILED   = "failed"
    OFFLINE  = "offline"

class AlertSeverity(str, Enum):
    INFO      = "info"
    WARNING   = "warning"
    CRITICAL  = "critical"
    EMERGENCY = "emergency"

class MaintenancePriority(str, Enum):
    IMMEDIATE  = "immediate"
    SCHEDULED  = "scheduled"
    ROUTINE    = "routine"
    MONITOR    = "monitor"

class AggregationStrategy(str, Enum):
    FEDAVG   = "FedAvg"
    FEDPROX  = "FedProx"
    FEDNOVA  = "FedNova"
    SCAFFOLD = "SCAFFOLD"


# ── Generic Response Wrapper ──────────────────────────────────────────────────

class ApiResponse(BaseModel):
    """Standard API response envelope."""
    success: bool = True
    message: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    data: Any = None


# ── Sensor Models ─────────────────────────────────────────────────────────────

class SensorReading(BaseModel):
    """Raw sensor reading from a machine."""
    machine_id: str
    factory_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    # Standard sensors
    temperature: float = Field(..., ge=-50, le=2000, description="°C")
    pressure: float    = Field(..., ge=0, le=1000, description="bar")
    vibration: float   = Field(..., ge=0, description="mm/s")
    speed: float       = Field(..., ge=0, description="RPM")
    torque: float      = Field(..., ge=0, description="Nm")

    # NASA C-MAPSS style
    t24: Optional[float] = None
    t30: Optional[float] = None
    t50: Optional[float] = None
    p30: Optional[float] = None
    nf: Optional[float]  = None
    nc: Optional[float]  = None

    class Config:
        json_schema_extra = {
            "example": {
                "machine_id": "M-001",
                "factory_id": "F-001",
                "temperature": 75.3,
                "pressure": 8.5,
                "vibration": 2.1,
                "speed": 1450,
                "torque": 32.7,
            }
        }


# ── Component Health ──────────────────────────────────────────────────────────

class ComponentHealth(BaseModel):
    id: str
    name: str
    health_score: float = Field(..., ge=0, le=100)
    status: str
    shap_contribution: float
    description: str
    replacement_due_in: Optional[float] = None  # hours


# ── Machine & Factory ─────────────────────────────────────────────────────────

class MachineMetadata(BaseModel):
    id: str
    name: str
    type: str
    factory_id: str
    commissioned_date: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None


class DigitalTwinState(BaseModel):
    """Complete machine digital twin state."""
    metadata: MachineMetadata
    sensors: SensorReading
    health_score: float = Field(..., ge=0, le=100)
    predicted_rul: float = Field(..., ge=0)
    failure_probability: float = Field(..., ge=0, le=100)
    components: List[ComponentHealth]
    recommended_action: str
    estimated_downtime: float       # hours
    estimated_repair_cost: float    # USD
    status: MachineStatus
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    anomaly_score: Optional[float] = Field(None, ge=0, le=1)


# ── Prediction ────────────────────────────────────────────────────────────────

class PredictionResult(BaseModel):
    """RUL and health prediction result."""
    machine_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    model_name: str
    model_version: str
    rul: float               = Field(..., ge=0, description="Remaining Useful Life (cycles)")
    rul_lower: float         = Field(..., ge=0, description="Conformal prediction lower bound")
    rul_upper: float         = Field(..., ge=0, description="Conformal prediction upper bound")
    health_score: float      = Field(..., ge=0, le=100)
    failure_probability: float = Field(..., ge=0, le=100)
    anomaly_score: float     = Field(..., ge=0, le=1)
    confidence: float        = Field(..., ge=0, le=100)
    maintenance_priority: MaintenancePriority
    estimated_failure_date: Optional[str] = None

    @model_validator(mode="after")
    def validate_rul_bounds(self) -> "PredictionResult":
        if self.rul_lower > self.rul_upper:
            raise ValueError("rul_lower must be ≤ rul_upper")
        return self


# ── SHAP Explanation ──────────────────────────────────────────────────────────

class ShapValue(BaseModel):
    feature_name: str
    shap_value: float
    base_value: float
    current_value: float
    percent_contribution: float
    direction: str              # "positive" | "negative"


class ShapExplanation(BaseModel):
    machine_id: str
    prediction_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    baseline_rul: float
    predicted_rul: float
    shap_values: List[ShapValue]
    global_importance: List[ShapValue]
    nlp_explanation: str


class CounterfactualChange(BaseModel):
    feature: str
    original_value: float
    counterfactual_value: float
    delta: float
    unit: str
    feasible: bool


class CounterfactualExplanation(BaseModel):
    machine_id: str
    original_rul: float
    target_rul: float
    changes: List[CounterfactualChange]
    achieved_rul: float
    rul_improvement: float      # %
    maintenance_cost: float     # USD
    roi: float                  # %
    nlp_explanation: str


# ── Federated Learning ────────────────────────────────────────────────────────

class FederatedClient(BaseModel):
    id: str
    name: str
    factory_id: str
    status: str
    data_samples: int
    skew_factor: float
    local_loss: float
    local_accuracy: float
    bandwidth_used: float           # MB
    privacy_budget_used: float      # epsilon
    compute_time: float             # seconds
    last_synced_at: Optional[str] = None


class FederatedRound(BaseModel):
    round_id: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    global_accuracy: float
    global_loss: float
    global_mae: float
    bandwidth_used: str
    privacy_budget_epsilon: float
    client_count: int
    client_metrics: Dict[str, Dict[str, float]]
    aggregation_strategy: AggregationStrategy
    dp_noise_sigma: float
    convergence_gap: float
    duration_seconds: float


# ── RAG ───────────────────────────────────────────────────────────────────────

class RagQueryRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=2000)
    machine_id: Optional[str] = None
    max_tokens: int = Field(default=2048, ge=256, le=8192)


class RagSource(BaseModel):
    document_id: str
    title: str
    similarity: float = Field(..., ge=0, le=1)
    excerpt: str
    page: Optional[int] = None


class RagResponse(BaseModel):
    answer: str
    sources: List[RagSource]
    machine_context: Optional[Dict[str, Any]] = None
    confidence: float = Field(..., ge=0, le=1)
    generated_at: datetime = Field(default_factory=datetime.utcnow)


# ── Alert ─────────────────────────────────────────────────────────────────────

class Alert(BaseModel):
    id: str
    machine_id: str
    machine_name: str
    factory_id: str
    severity: AlertSeverity
    type: str
    title: str
    message: str
    triggered_at: datetime = Field(default_factory=datetime.utcnow)
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    actions: List[str] = []


# ── Report ────────────────────────────────────────────────────────────────────

class ReportRequest(BaseModel):
    machine_id: str
    report_type: str = "health"    # health | failure | maintenance | twin | shap | federated
    include_shap: bool = True
    include_recommendations: bool = True
    format: str = "pdf"            # pdf | excel | json
