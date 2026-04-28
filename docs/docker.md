# Docker Setup Guide

## TL;DR

```bash
# 1. Copy env
cp .env.example .env
# 2. Fill in secrets in .env (POSTGRES_PASSWORD, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET)
# 3. Start
docker compose up -d
# 4. Watch logs
docker compose logs -f
```

## Services

| Service             | Internal Port | External Port | Notes                                         |
| ------------------- | ------------- | ------------- | --------------------------------------------- |
| frontend            | 3000          | 3000          | Next.js standalone                            |
| backend-api         | 5000          | 5000          | NestJS — migrations run automatically on boot |
| scraper             | 5001          | 5001          | Puppeteer/X scraper                           |
| indobert-classifier | —             | —             | Queue worker, no HTTP port. Health on 8000    |
| postgres            | 5432          | 5433          | Default PG port shifted to avoid clash        |
| redis               | 6379          | 6380          | Default Redis port shifted                    |

## Port Conflict Prevention

Local Postgres/Rredis already running? External ports auto-shifted:
- Postgres: `5432` (internal) → `5433` (host) via `POSTGRES_EXTERNAL_PORT`
- Redis: `6379` (internal) → `6380` (host) via `REDIS_EXTERNAL_PORT`

Set `POSTGRES_EXTERNAL_PORT=5432` in `.env` if you want the old behaviour.

## Environment Variables

Never hardcode secrets. Copy `.env.example` → `.env`:

```bash
cp .env.example .env
```

Edit these **required** values before first run:
```env
POSTGRES_PASSWORD=your_secure_password
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

Optional overrides:
```env
# Use local Gemini API
GEMINI_API_KEY=your_key

# HuggingFace token for gated models (if any)
HF_TOKEN=your_token
```

## Resource Limits

Total cluster: **2.3 CPU cores / ~2.6 GB RAM**

| Service     | CPU | Memory |
| ----------- | --- | ------ |
| redis       | 0.2 | 128 MB |
| postgres    | 0.3 | 256 MB |
| backend-api | 0.5 | 512 MB |
| scraper     | 0.5 | 512 MB |
| indobert    | 0.5 | 896 MB |
| frontend    | 0.3 | 384 MB |

> **WSL disk space tip:** Image layers are shared. `docker system prune` periodically frees space. First build pulls ~1.5 GB for torch CPU + model cache.

## Troubleshooting

### "Model not cached" on first IndoBERT startup
Normal. First run downloads the IndoBERT model (~400 MB). Health check fails until download finishes. Give it 2-3 minutes on first boot.

### Scraper returns blank results
Ensure `scraper/cookies.json` is populated with valid Twitter session cookies. See `scraper/src/puppeteer-auth.js`.

### Backend health check fails after migration
```bash
docker compose logs backend-api
```
If migration failed, check `DATABASE_URL` and `POSTGRES_PASSWORD` match.

### Postgres port conflict
```env
# In .env — change to match your local Postgres
POSTGRES_EXTERNAL_PORT=5432
```
Backend always connects via `postgres:5432` (internal Docker network), so only the **external** host port needs adjusting.

### Restart a specific service
```bash
docker compose restart backend-api
```

### Full rebuild
```bash
docker compose down -v   # removes volumes (loses DB data & model cache)
docker compose build --no-cache
docker compose up -d
```
