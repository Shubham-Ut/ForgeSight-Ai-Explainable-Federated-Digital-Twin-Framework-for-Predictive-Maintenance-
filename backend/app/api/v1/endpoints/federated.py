"""
ForgeSight AI — Federated Learning Endpoints
GET/POST /api/v1/federated routes
"""
from fastapi import APIRouter
from app.domain.models import ApiResponse
from datetime import datetime

router = APIRouter()

# Simple global config store in-memory for demonstration
FL_CONFIG = {
    "strategy": "FedAvg",
    "num_clients": 4,
    "local_epochs": 3,
    "noise_sigma": 0.05,
    "target_accuracy": 0.95
}

FEDERATED_ROUNDS_HISTORY = [
    {
        "round_id": 1,
        "timestamp": datetime.utcnow().isoformat(),
        "global_accuracy": 0.654,
        "global_loss": 0.842,
        "global_mae": 15.4,
        "bandwidth_used": "45.2MB",
        "privacy_budget_epsilon": 0.056,
        "client_count": 4,
        "client_metrics": {},
        "aggregation_strategy": "FedAvg",
        "dp_noise_sigma": 0.05,
        "convergence_gap": 0.188,
        "duration_seconds": 12.4
    },
    {
        "round_id": 2,
        "timestamp": datetime.utcnow().isoformat(),
        "global_accuracy": 0.768,
        "global_loss": 0.534,
        "global_mae": 13.2,
        "bandwidth_used": "90.4MB",
        "privacy_budget_epsilon": 0.112,
        "client_count": 4,
        "client_metrics": {},
        "aggregation_strategy": "FedAvg",
        "dp_noise_sigma": 0.05,
        "convergence_gap": 0.104,
        "duration_seconds": 11.8
    },
    {
        "round_id": 3,
        "timestamp": datetime.utcnow().isoformat(),
        "global_accuracy": 0.865,
        "global_loss": 0.312,
        "global_mae": 11.8,
        "bandwidth_used": "135.6MB",
        "privacy_budget_epsilon": 0.168,
        "client_count": 4,
        "client_metrics": {},
        "aggregation_strategy": "FedAvg",
        "dp_noise_sigma": 0.05,
        "convergence_gap": 0.054,
        "duration_seconds": 12.1
    }
]

@router.get("/metrics", response_model=ApiResponse)
async def get_fl_metrics():
    import json
    from pathlib import Path
    
    data_file = Path(__file__).parent.parent.parent / "data" / "federated_history.json"
    if data_file.exists():
        try:
            with open(data_file, "r") as f:
                fl_data = json.load(f)
                return ApiResponse(data=fl_data)
        except Exception:
            pass

    # Return metrics mapping clients stats
    metrics = {
        "rounds": FEDERATED_ROUNDS_HISTORY,
        "clients": [
            {
                "id": "client-munich",
                "name": "Munich CNC Edge",
                "factory_id": "F-001",
                "status": "active",
                "data_samples": 1240,
                "skew_factor": 0.15,
                "local_loss": 0.28,
                "local_accuracy": 0.89,
                "bandwidth_used": 34.2,
                "privacy_budget_used": 0.168,
                "compute_time": 4.5,
                "last_synced_at": datetime.utcnow().isoformat()
            },
            {
                "id": "client-detroit",
                "name": "Detroit Press Edge",
                "factory_id": "F-001",
                "status": "active",
                "data_samples": 850,
                "skew_factor": 0.42,
                "local_loss": 0.45,
                "local_accuracy": 0.81,
                "bandwidth_used": 28.5,
                "privacy_budget_used": 0.168,
                "compute_time": 5.2,
                "last_synced_at": datetime.utcnow().isoformat()
            },
            {
                "id": "client-tokyo",
                "name": "Tokyo Spindle Edge",
                "factory_id": "F-002",
                "status": "active",
                "data_samples": 1420,
                "skew_factor": 0.08,
                "local_loss": 0.21,
                "local_accuracy": 0.92,
                "bandwidth_used": 39.8,
                "privacy_budget_used": 0.168,
                "compute_time": 4.1,
                "last_synced_at": datetime.utcnow().isoformat()
            },
            {
                "id": "client-shanghai",
                "name": "Shanghai Robotics Edge",
                "factory_id": "F-002",
                "status": "active",
                "data_samples": 620,
                "skew_factor": 0.55,
                "local_loss": 0.58,
                "local_accuracy": 0.74,
                "bandwidth_used": 22.1,
                "privacy_budget_used": 0.168,
                "compute_time": 6.8,
                "last_synced_at": datetime.utcnow().isoformat()
            }
        ]
    }
    return ApiResponse(data=metrics)

@router.get("/rounds", response_model=ApiResponse)
async def get_rounds():
    import json
    from pathlib import Path
    
    data_file = Path(__file__).parent.parent.parent / "data" / "federated_history.json"
    if data_file.exists():
        try:
            with open(data_file, "r") as f:
                fl_data = json.load(f)
                return ApiResponse(data=fl_data["rounds"])
        except Exception:
            pass
            
    return ApiResponse(data=FEDERATED_ROUNDS_HISTORY)

@router.post("/round/trigger", response_model=ApiResponse)
async def trigger_round():
    new_round_id = len(FEDERATED_ROUNDS_HISTORY) + 1
    accuracy = min(0.97, 0.865 + 0.03 + (new_round_id * 0.005))
    loss = max(0.02, 0.312 - 0.05)
    
    new_round = {
        "round_id": new_round_id,
        "timestamp": datetime.utcnow().isoformat(),
        "global_accuracy": round(accuracy, 4),
        "global_loss": round(loss, 4),
        "global_mae": round(11.8 - 0.6, 1),
        "bandwidth_used": f"{135.6 + 45.2:.1f}MB",
        "privacy_budget_epsilon": round(new_round_id * 0.056, 3),
        "client_count": 4,
        "client_metrics": {},
        "aggregation_strategy": FL_CONFIG["strategy"],
        "dp_noise_sigma": FL_CONFIG["noise_sigma"],
        "convergence_gap": round(0.054 - 0.015, 3),
        "duration_seconds": 12.0
    }
    
    FEDERATED_ROUNDS_HISTORY.append(new_round)
    return ApiResponse(data={"roundId": new_round_id, "status": "completed"})

@router.get("/config", response_model=ApiResponse)
async def get_config():
    return ApiResponse(data=FL_CONFIG)

@router.post("/config", response_model=ApiResponse)
async def update_config(body: dict):
    global FL_CONFIG
    for key, val in body.items():
        if key in FL_CONFIG:
            FL_CONFIG[key] = val
    return ApiResponse(data=FL_CONFIG)

@router.get("/privacy", response_model=ApiResponse)
async def get_privacy():
    ep = sum(r["privacy_budget_epsilon"] for r in FEDERATED_ROUNDS_HISTORY)
    return ApiResponse(data={"epsilon": round(ep, 3), "delta": 1e-5, "remaining": round(15.0 - ep, 3)})
