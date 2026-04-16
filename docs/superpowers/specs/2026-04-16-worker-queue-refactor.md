# Worker Queue Refactor Design

> **Goal:** Convert Scraper and IndoBERT from REST API workers to BullMQ pub/sub workers. Backend keeps REST API only.

**Architecture:** Scraper and IndoBERT become BullMQ workers subscribed to Redis queues. Backend orchestrates via queues + subscribes to result channels. Pipeline state lives in Redis, final result persisted to Postgres.

---

## Components

### Backend-API (NestJS REST)
- **Responsibility:** REST API entry point, queue producer, result subscriber
- **Changes:**
  - Remove co-located BullMQ worker (move to separate workers)
  - Remove `ScraperService` (HTTP calls to scraper)
  - Remove `IndoBERTClassifierService` (HTTP calls to IndoBERT)
  - Add `QueuePublisher` — publishes jobs to `scrape` and `classify` queues
  - Add `PipelineOrchestrator` — subscribes to `ch:scrape:{id}` and `ch:classify:{id}` channels, orchestrates pipeline
  - Keep `SentimentController` and `SentimentRepository` (write final result to Postgres)
  - Pipeline state in Redis only (key: `sentiment:{id}`, TTL 1 hour)

### Scraper (Express.js → BullMQ Worker)
- **Responsibility:** Scrape tweets from Twitter
- **Changes:**
  - Replace Express REST endpoints (except `/health`) with BullMQ worker
  - Worker subscribes to `scrape` queue
  - On job: scrape tweets, store intermediate result in Redis (`sentiment:{id}` with status `processing`), publish to `ch:scrape:{id}`
- **Env vars added:** `REDIS_HOST`, `REDIS_PORT`

### IndoBERT (FastAPI → BullMQ Worker)
- **Responsibility:** Classify tweet sentiment
- **Changes:**
  - Replace FastAPI `/classify` endpoint with BullMQ worker
  - Worker subscribes to `classify` queue
  - On job: classify tweets, store final result in Redis (`sentiment:{id}` with status `done` + result), publish to `ch:classify:{id}`
- **Env vars added:** `REDIS_HOST`, `REDIS_PORT`

---

## Redis Data Structures

| Key | Type | TTL | Description |
|-----|------|-----|-------------|
| `queue:scrape` | BullMQ queue | — | Jobs for scraper worker |
| `queue:classify` | BullMQ queue | — | Jobs for IndoBERT worker |
| `ch:scrape:{id}` | Pub/Sub channel | — | Scraper result notifications |
| `ch:classify:{id}` | Pub/Sub channel | — | IndoBERT result notifications |
| `sentiment:{id}` | Hash/JSON | 1h | Pipeline state: `{ status: 'pending'|'processing'|'done', tweets?, result? }` |

---

## Pipeline Flow

```
POST /api/sentiment { query, product, limit }
  │
  ├─ Generate UUID as sentimentId
  ├─ Redis SET sentiment:{id} { status: 'pending' }
  ├─ BullMQ addJob('scrape', { sentimentId, query, product, limit })
  └─ Subscribe ch:scrape:{id}
        │
        ▼ Scraper Worker (consumes 'scrape' queue)
        ├─ Scrape tweets from Twitter
        ├─ Redis SET sentiment:{id} { status: 'processing', tweets: [...] }
        └─ Redis PUBLISH ch:scrape:{id} { sentimentId, tweets }
              │
              ▼ Backend subscriber
              ├─ BullMQ addJob('classify', { sentimentId, tweets })
              └─ Subscribe ch:classify:{id}
                    │
                    ▼ IndoBERT Worker (consumes 'classify' queue)
                    ├─ Classify all tweets
                    ├─ Redis SET sentiment:{id} { status: 'done', result: {...} }
                    └─ Redis PUBLISH ch:classify:{id} { sentimentId, result }
                          │
                          ▼ Backend subscriber
                          ├─ Postgres INSERT sentiment result
                          ├─ Redis DEL sentiment:{id}
                          └─ Return SentimentResult to frontend
```

---

## API Changes

### POST /api/sentiment
**Request:** unchanged
```json
{ "query": "indihome", "product": "Top", "limit": 20 }
```

**Response:** jobId removed from top-level, embedded in result
```json
{
  "id": "uuid",
  "query": "indihome",
  "status": "completed",
  "summary": { "positive": 40, "negative": 35, "neutral": 25 },
  "topInfluential": [...],
  "tweets": [...],
  "completedAt": "2026-04-16T12:00:00Z"
}
```

---

## Docker Compose Changes

### Scraper service
- Remove port mapping (internal-only communication via Redis)
- Add `env_file: .env`
- Add environment: `REDIS_HOST`, `REDIS_PORT`
- Healthcheck via Redis (BullMQ queue `scrape` consumer count > 0) instead of HTTP

### IndoBERT service
- Remove port mapping (internal-only communication via Redis)
- Add `env_file: .env`
- Add environment: `REDIS_HOST`, `REDIS_PORT`
- Healthcheck via Redis (BullMQ queue `classify` consumer count > 0) instead of HTTP

### Backend-API service
- Remove `env_file: .env` (backend reads `.env` directly via `ConfigModule`)
- Add environment: `REDIS_HOST`, `REDIS_PORT`

---

## Queue Configuration

### Scrape job
```typescript
{
  name: 'scrape',
  data: { sentimentId: string, query: string, product: string, limit: number },
  opts: { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: true }
}
```

### Classify job
```typescript
{
  name: 'classify',
  data: { sentimentId: string, tweets: ScrapedTweet[] },
  opts: { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: true }
}
```

---

## Dependencies Added

### Backend-API
- `bullmq` (already present via queue module)
- `ioredis` (Redis pub/sub client, separate from BullMQ connection)

### Scraper
- `bullmq`
- `ioredis`

### IndoBERT
- `bullmq`
- `ioredis`

---

## Env Vars Required in .env

```bash
# Redis (already exists)
REDIS_HOST=localhost
REDIS_PORT=6379

# Remove (no longer needed)
# SCRAPER_BASE_URL      → not needed, communicate via queue
# INDOBERT_BASE_URL     → not needed, communicate via queue
```

---

## Error Handling

- **Scraper fails:** BullMQ retry (3x exponential backoff). After max retries, publish error to `ch:scrape:{id}` with `{ error: true, message }`. Backend subscriber updates Redis status to `failed`, returns error to frontend.
- **IndoBERT fails:** Same retry logic. Publish error to `ch:classify:{id}`.
- **Worker down:** BullMQ job stays in queue until worker recovers.
- **Backend subscriber crashes mid-pipeline:** Job still in queue, worker completes, result in Redis. Frontend request times out → user retries.
- **Redis connection lost:** All services fail health check → Docker restarts them.
