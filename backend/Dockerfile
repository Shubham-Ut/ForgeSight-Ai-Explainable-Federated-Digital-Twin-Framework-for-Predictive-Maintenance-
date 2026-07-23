FROM python:3.11-slim

LABEL maintainer="ForgeSight AI Research Team"
LABEL description="Explainable Federated Digital Twin Predictive Maintenance Backend"

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directories
RUN mkdir -p ml/trained_models rag/vector_store reports/generated vision/models

# Non-root user for security
RUN addgroup --system forgesight && adduser --system --ingroup forgesight forgesight
RUN chown -R forgesight:forgesight /app
USER forgesight

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
