"""
ForgeSight AI — Application Configuration
Centralised settings using Pydantic BaseSettings for environment-based config
"""
from __future__ import annotations

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ── Application ───────────────────────────────────────────────────────────
    APP_NAME: str = "ForgeSight AI"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"   # development | staging | production
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    # ── API Server ────────────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 1

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
    ]

    # ── Authentication ────────────────────────────────────────────────────────
    SECRET_KEY: str = "change-this-in-production-use-strong-random-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://forgesight:forgesight@localhost:5432/forgesight"
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── Firebase ──────────────────────────────────────────────────────────────
    FIREBASE_CREDENTIALS_PATH: str = ""
    FIREBASE_PROJECT_ID: str = ""

    # ── Machine Learning ──────────────────────────────────────────────────────
    ML_MODELS_DIR: str = "./ml/trained_models"
    DEFAULT_MODEL: str = "xgboost"
    MODEL_INFERENCE_TIMEOUT_S: float = 5.0

    # ── Federated Learning ────────────────────────────────────────────────────
    FL_SERVER_ADDRESS: str = "0.0.0.0:8080"
    FL_NUM_CLIENTS: int = 4
    FL_LOCAL_EPOCHS: int = 3
    FL_ROUNDS: int = 50
    FL_NOISE_SIGMA: float = 0.5         # Differential Privacy σ
    FL_CLIPPING_NORM: float = 1.0       # L2 norm clipping C
    FL_DIRICHLET_ALPHA: float = 0.5     # Non-IID heterogeneity

    # ── Differential Privacy ──────────────────────────────────────────────────
    DP_TARGET_EPSILON: float = 2.8
    DP_TARGET_DELTA: float = 1e-5

    # ── RAG / LLM ─────────────────────────────────────────────────────────────
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_MODEL: str = "google/gemini-2.5-flash"
    GOOGLE_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-pro"
    VECTOR_STORE_PATH: str = "./rag/vector_store"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    RAG_TOP_K: int = 5
    RAG_CHUNK_SIZE: int = 512
    RAG_CHUNK_OVERLAP: int = 64

    # ── Computer Vision ───────────────────────────────────────────────────────
    YOLO_MODEL_PATH: str = "./vision/models/yolov8m.pt"
    YOLO_CONFIDENCE_THRESHOLD: float = 0.5
    YOLO_IOU_THRESHOLD: float = 0.45

    # ── MQTT ──────────────────────────────────────────────────────────────────
    MQTT_BROKER_HOST: str = "localhost"
    MQTT_BROKER_PORT: int = 1883
    MQTT_USERNAME: str = ""
    MQTT_PASSWORD: str = ""
    MQTT_SENSOR_TOPIC: str = "forgesight/sensors/#"

    # ── Reports ───────────────────────────────────────────────────────────────
    REPORTS_DIR: str = "./reports/generated"
    MAX_REPORT_AGE_DAYS: int = 30


settings = Settings()
