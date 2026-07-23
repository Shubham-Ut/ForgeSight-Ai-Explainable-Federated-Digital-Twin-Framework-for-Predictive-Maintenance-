"""
ForgeSight AI — API v1 Router
Aggregates all endpoint routers under /api/v1
"""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    predictions,
    machines,
    explainability,
    federated,
    digital_twin,
    rag,
    vision,
    reports,
    alerts,
    streaming,
)

api_router = APIRouter()

# ── Register all endpoint modules ─────────────────────────────────────────────
api_router.include_router(machines.router,       prefix="/machines",       tags=["Machines"])
api_router.include_router(predictions.router,    prefix="/predictions",    tags=["Predictions"])
api_router.include_router(explainability.router, prefix="/explainability", tags=["Explainability (XAI)"])
api_router.include_router(federated.router,      prefix="/federated",      tags=["Federated Learning"])
api_router.include_router(digital_twin.router,   prefix="/twin",           tags=["Digital Twin"])
api_router.include_router(rag.router,            prefix="/rag",            tags=["RAG Assistant"])
api_router.include_router(vision.router,         prefix="/vision",         tags=["Computer Vision"])
api_router.include_router(reports.router,        prefix="/reports",        tags=["Reports"])
api_router.include_router(alerts.router,         prefix="/alerts",         tags=["Alerts"])
api_router.include_router(streaming.router,      prefix="/ws",             tags=["WebSocket Streaming"])
