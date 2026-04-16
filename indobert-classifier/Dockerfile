FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir \
        fastapi==0.128.0 \
        "uvicorn[standard]==0.34.0" \
        transformers==4.51.3 \
        "torch==2.5.1" --extra-index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir pydantic==2.10.6

COPY app/ ./app/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
