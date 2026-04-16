FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir \
    transformers==4.51.3 \
    "torch==2.5.1" --extra-index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir pydantic==2.10.6 \
    "bullmq==2.20.3" \
    "redis>=5.0.0" && \
    pip cache purge

COPY app/ ./app/

CMD ["python", "-m", "app.main"]