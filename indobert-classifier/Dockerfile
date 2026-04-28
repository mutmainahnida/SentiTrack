# syntax=docker/dockerfile:1
# IndoBERT Classifier — FastAPI + PyTorch CPU + Transformers
# Total image: ~1.8GB (vs ~2.5GB with GPU build)

# ─────────────────────────────────────────────
# Stage 1: Builder
# ─────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /app

# Build deps
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./

# CPU-only PyTorch (~700MB vs ~2.5GB GPU build)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
        torch==2.5.1 \
        --index-url https://download.pytorch.org/whl/cpu

# Remaining deps (torch already present, pip skips it)
RUN sed '/^torch/d' requirements.txt > /tmp/req-notorch.txt && \
    pip install --no-cache-dir -r /tmp/req-notorch.txt

COPY app/ ./app/

# ─────────────────────────────────────────────
# Stage 2: Runtime — zero pip install
# Copy pre-built packages from builder
# ─────────────────────────────────────────────
FROM python:3.11-slim AS runner

WORKDIR /app

# Minimal runtime deps for PyTorch threading only
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Package copies are the image bulk (~800MB). No reinstall needed.
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin/uvicorn /usr/local/bin/uvicorn
COPY --from=builder /app/app ./app/

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/root/.cache/huggingface \
    TRANSFORMERS_CACHE=/root/.cache/huggingface

EXPOSE 5002

CMD ["python", "-m", "app.main"]
