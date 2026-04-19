# syntax=docker/dockerfile:1

FROM python:3.11-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        gcc \
        git \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /root/.cache/huggingface

COPY requirements.txt* pyproject.toml* ./

RUN pip install --no-cache-dir --upgrade pip wheel setuptools

RUN pip install --no-cache-dir \
    torch \
    torchvision \
    --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir \
    transformers \
    huggingface_hub \
    pydantic \
    "bullmq>=2.0.0" \
    "redis>=4.0.0"

FROM python:3.11-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /root/.cache/huggingface

COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY app/ ./app/

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV TRANSFORMERS_CACHE=/root/.cache/huggingface
ENV HF_HOME=/root/.cache/huggingface

RUN printf '%s\n' \
    '#!/bin/bash' \
    'set -e' \
    '' \
    'MODEL_NAME="${MODEL_NAME:-Aardiiiiy/indobertweet-base-Indonesian-sentiment-analysis}"' \
    'CACHE_DIR="${HF_HOME:-/root/.cache/huggingface}"' \
    '' \
    'echo "[startup] Checking model cache at $CACHE_DIR..."' \
    '' \
    '# Check if model already cached' \
    'if [ -d "$CACHE_DIR/hub" ] && ls "$CACHE_DIR/hub/models--${MODEL_NAME//\//--}" 2>/dev/null | grep -q .; then' \
    '    echo "[startup] Model found in cache. Skipping download."' \
    'else' \
    '    echo "[startup] Model not cached. Downloading $MODEL_NAME..."' \
    '    echo "[startup] This may take a few minutes on first startup..."' \
    '    python -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='"'"'$MODEL_NAME'"'"', cache_dir='"'"'$CACHE_DIR'"'"')" || true' \
    'fi' \
    '' \
    'echo "[startup] Starting IndoBERT classifier worker..."' \
    'exec python -m app.main' \
    > /app/startup.sh && chmod +x /app/startup.sh

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8000/health || exit 1

CMD ["/app/startup.sh"]