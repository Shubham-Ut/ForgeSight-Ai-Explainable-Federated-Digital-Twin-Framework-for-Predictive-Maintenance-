"""
ForgeSight AI — FastAPI Application Entry Point
Research Platform: Explainable Federated Digital Twin Predictive Maintenance
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api.v1.router import api_router

# ── Structured logging ────────────────────────────────────────────────────────
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    logger_factory=structlog.stdlib.LoggerFactory(),
)
logger = structlog.get_logger(__name__)


# ── Application Lifespan ──────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage startup/shutdown lifecycle."""
    logger.info("forgesight.startup", version=settings.APP_VERSION, env=settings.ENVIRONMENT)

    # TODO: initialise DB connection pool, Redis, model registry
    # await database.connect()
    # await redis_client.ping()
    # model_registry.load_all()

    yield  # Application runs here

    # TODO: teardown
    # await database.disconnect()
    logger.info("forgesight.shutdown")


# ── Application Instance ──────────────────────────────────────────────────────
app = FastAPI(
    title="ForgeSight AI API",
    description=(
        "Research-grade REST API for Explainable Federated Digital Twin "
        "Predictive Maintenance Platform.\n\n"
        "**Publication:** IEEE/Scopus — Industry 4.0"
    ),
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    openapi_url="/openapi.json" if settings.ENVIRONMENT != "production" else None,
    lifespan=lifespan,
)

# ── Middlewares ───────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1024)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    """Inject X-Request-ID into response headers."""
    import uuid
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


# ── Global exception handler ──────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("unhandled_exception", path=str(request.url), error=str(exc), exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "detail": str(exc) if settings.ENVIRONMENT == "development" else None,
            "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
        },
    )


# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "service": "forgesight-api",
    }


@app.get("/", tags=["System"])
async def root():
    return {
        "name": "ForgeSight AI API",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "openapi": "/openapi.json",
    }
