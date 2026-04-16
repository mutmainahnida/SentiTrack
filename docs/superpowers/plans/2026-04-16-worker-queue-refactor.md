# Worker Queue Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Scraper and IndoBERT from REST API workers to BullMQ pub/sub workers. Backend keeps REST API only.

**Architecture:** Scraper and IndoBERT become BullMQ workers subscribed to Redis queues. Backend orchestrates via queues + subscribes to result channels. Pipeline state in Redis, final result persisted to Postgres.

**Tech Stack:** BullMQ, ioredis, NestJS, Express.js, FastAPI, Python

---

## File Map

### Backend-API
- Create: `src/queue/queue-publisher.service.ts`
- Create: `src/queue/pipeline-orchestrator.service.ts`
- Modify: `src/sentiment/sentiment.service.ts`
- Modify: `src/sentiment/sentiment.controller.ts`
- Modify: `src/queue/queue.module.ts`
- Modify: `src/app.module.ts`
- Modify: `src/llm/indobert-classifier.service.ts`
- Delete: `src/scraper/scraper.service.ts`

### Scraper
- Create: `scraper/src/worker.js`
- Modify: `scraper/src/main.js`
- Modify: `scraper/package.json`
- Modify: `scraper/Dockerfile`
- Delete: `scraper/src/routes/` (all job-processing routes)

### IndoBERT
- Modify: `indobert-classifier/app/main.py`
- Modify: `indobert-classifier/requirements.txt`
- Modify: `indobert-classifier/Dockerfile`

### Docker
- Modify: `docker-compose.yml`

---

## Shared Types

### Task 0: Shared interfaces for queue job data

**Files:**
- Create: `backend-api/src/queue/interfaces/scraper-job.interface.ts`
- Create: `backend-api/src/queue/interfaces/classify-job.interface.ts`

- [ ] **Step 1: Create scraper job interface**

```typescript
// backend-api/src/queue/interfaces/scraper-job.interface.ts
export interface ScraperJobData {
  sentimentId: string;
  query: string;
  product: 'Top' | 'Latest';
  limit: number;
}
```

- [ ] **Step 2: Create classify job interface**

```typescript
// backend-api/src/queue/interfaces/classify-job.interface.ts
export interface ClassifyJobData {
  sentimentId: string;
  tweets: Array<{
    id: string;
    text: string;
    username: string;
    views: number;
    likes: number;
    retweets: number;
    replies: number;
  }>;
}
```

- [ ] **Step 3: Create Redis channel payload interfaces**

```typescript
// backend-api/src/queue/interfaces/channel-payloads.interface.ts
export interface ScrapeResultPayload {
  sentimentId: string;
  tweets: Array<{
    id: string;
    text: string;
    username: string;
    views: number;
    likes: number;
    retweets: number;
    replies: number;
  }>;
}

export interface ClassifyResultPayload {
  sentimentId: string;
  result: {
    summary: { positive: number; negative: number; neutral: number };
    topInfluential: Array<Record<string, unknown>>;
    tweets: Array<Record<string, unknown>>;
    completedAt: string;
  };
}

export interface PipelineErrorPayload {
  sentimentId: string;
  error: true;
  message: string;
  stage: 'scrape' | 'classify';
}
```

- [ ] **Step 4: Create pipeline state interface**

```typescript
// backend-api/src/queue/interfaces/pipeline-state.interface.ts
export type PipelineStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface PipelineState {
  status: PipelineStatus;
  query?: string;
  tweets?: Array<Record<string, unknown>>;
  result?: Record<string, unknown>;
  errorMessage?: string;
}
```

- [ ] **Step 5: Commit**

```bash
git add backend-api/src/queue/interfaces/
git commit -m "feat(queue): add shared interfaces for queue job data and pipeline state"
```

---

## Task 1: QueuePublisher service

**Files:**
- Create: `backend-api/src/queue/queue-publisher.service.ts`
- Modify: `backend-api/src/queue/queue.module.ts`

- [ ] **Step 1: Create QueuePublisherService**

```typescript
// backend-api/src/queue/queue-publisher.service.ts
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ScraperJobData } from './interfaces/scraper-job.interface';
import { ClassifyJobData } from './interfaces/classify-job.interface';

@Injectable()
export class QueuePublisher {
  constructor(
    @InjectQueue('scrape') private readonly scrapeQueue: Queue,
    @InjectQueue('classify') private readonly classifyQueue: Queue,
  ) {}

  async enqueueScrape(data: ScraperJobData): Promise<void> {
    await this.scrapeQueue.add('scrape', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
    });
  }

  async enqueueClassify(data: ClassifyJobData): Promise<void> {
    await this.classifyQueue.add('classify', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
    });
  }
}
```

- [ ] **Step 2: Update QueueModule exports**

```typescript
// In backend-api/src/queue/queue.module.ts — add QueuePublisher to providers and exports
```

- [ ] **Step 3: Commit**

```bash
git add backend-api/src/queue/
git commit -m "feat(queue): add QueuePublisher service for enqueuing jobs"
```

---

## Task 2: PipelineOrchestrator service

**Files:**
- Create: `backend-api/src/queue/pipeline-orchestrator.service.ts`
- Modify: `backend-api/src/queue/queue.module.ts`
- Modify: `backend-api/src/sentiment/sentiment.module.ts`

- [ ] **Step 1: Create PipelineOrchestratorService**

```typescript
// backend-api/src/queue/pipeline-orchestrator.service.ts
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { QueuePublisher } from './queue-publisher.service';
import { SentimentRepository } from '../sentiment/repositories/sentiment.repository';
import {
  PipelineState,
  PipelineErrorPayload,
} from './interfaces/pipeline-state.interface';
import {
  ScrapeResultPayload,
  ClassifyResultPayload,
} from './interfaces/channel-payloads.interface';

@Injectable()
export class PipelineOrchestrator implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PipelineOrchestrator.name);
  private readonly redis: Redis;
  private readonly subscriber: Redis;
  private pendingRequests = new Map<
    string,
    {
      resolve: (result: unknown) => void;
      reject: (err: unknown) => void;
      timeout: ReturnType<typeof setTimeout>;
    }
  >();
  private readonly REQUEST_TIMEOUT_MS = 300_000; // 5 minutes

  constructor(
    private readonly config: ConfigService,
    private readonly queuePublisher: QueuePublisher,
    private readonly sentimentRepo: SentimentRepository,
  ) {
    const host = this.config.get<string>('REDIS_HOST') ?? 'localhost';
    const port = this.config.get<number>('REDIS_PORT') ?? 6379;
    const redisUrl = `redis://${host}:${port}`;

    this.redis = new Redis(redisUrl);
    this.subscriber = new Redis(redisUrl);
  }

  async onModuleInit(): Promise<void> {
    // Subscribe to scrape result channel pattern
    await this.subscriber.psubscribe('ch:scrape:*');
    this.subscriber.on('pmessage', this.handleScrapeMessage.bind(this));

    // Subscribe to classify result channel pattern
    await this.subscriber.psubscribe('ch:classify:*');
    this.subscriber.on('pmessage', this.handleClassifyMessage.bind(this));
  }

  async onModuleDestroy(): Promise<void> {
    await this.subscriber.quit();
    await this.redis.quit();
    for (const { reject, timeout } of this.pendingRequests.values()) {
      clearTimeout(timeout);
      reject(new Error('Pipeline shutting down'));
    }
  }

  async startPipeline(params: {
    sentimentId: string;
    query: string;
    product: string;
    limit: number;
  }): Promise<unknown> {
    const { sentimentId, query, product, limit } = params;

    // Set initial pipeline state
    await this.redis.setex(
      `sentiment:${sentimentId}`,
      3600,
      JSON.stringify({ status: 'pending', query }),
    );

    // Enqueue scrape job
    await this.queuePublisher.enqueueScrape({ sentimentId, query, product, limit });

    // Wait for scrape result via pub/sub
    const scrapeResult = await this.waitForChannel(`ch:scrape:${sentimentId}`);

    if ((scrapeResult as PipelineErrorPayload).error) {
      const err = scrapeResult as PipelineErrorPayload;
      await this.redis.setex(
        `sentiment:${sentimentId}`,
        3600,
        JSON.stringify({ status: 'failed', errorMessage: err.message }),
      );
      throw new Error(`Scrape failed: ${err.message}`);
    }

    const scrape = scrapeResult as ScrapeResultPayload;

    // Enqueue classify job
    await this.queuePublisher.enqueueClassify({ sentimentId, tweets: scrape.tweets });

    // Wait for classify result via pub/sub
    const classifyResult = await this.waitForChannel(`ch:classify:${sentimentId}`);

    if ((classifyResult as PipelineErrorPayload).error) {
      const err = classifyResult as PipelineErrorPayload;
      await this.redis.setex(
        `sentiment:${sentimentId}`,
        3600,
        JSON.stringify({ status: 'failed', errorMessage: err.message }),
      );
      throw new Error(`Classify failed: ${err.message}`);
    }

    const classify = classifyResult as ClassifyResultPayload;

    // Persist final result to Postgres
    // Note: SentimentRepository uses jobId (same as sentimentId here)
    // markCompleted(jobId, result, attempts)
    await this.sentimentRepo.markCompleted(sentimentId, classify.result as SentimentResult, 1);

    // Cleanup Redis state
    await this.redis.del(`sentiment:${sentimentId}`);

    return classify.result;
  }

  private waitForChannel(channel: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const sentimentId = channel.split(':')[2];
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(sentimentId);
        reject(new Error(`Pipeline timeout for ${sentimentId}`));
      }, this.REQUEST_TIMEOUT_MS);
      this.pendingRequests.set(sentimentId, { resolve, reject, timeout });
    });
  }

  private handleScrapeMessage(_pattern: string, _channel: string, message: string): void {
    try {
      const payload = JSON.parse(message) as ScrapeResultPayload | PipelineErrorPayload;
      const { sentimentId } = payload;
      const pending = this.pendingRequests.get(sentimentId);
      if (pending) {
        clearTimeout(pending.timeout);
        pending.resolve(payload);
        this.pendingRequests.delete(sentimentId);
      }
    } catch {
      // Ignore malformed messages
    }
  }

  private handleClassifyMessage(_pattern: string, _channel: string, message: string): void {
    try {
      const payload = JSON.parse(message) as ClassifyResultPayload | PipelineErrorPayload;
      const { sentimentId } = payload;
      const pending = this.pendingRequests.get(sentimentId);
      if (pending) {
        clearTimeout(pending.timeout);
        pending.resolve(payload);
        this.pendingRequests.delete(sentimentId);
      }
    } catch {
      // Ignore malformed messages
    }
  }
}
```

- [ ] **Step 2: Update QueueModule — add QueuePublisher and PipelineOrchestrator**

```typescript
// backend-api/src/queue/queue.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { SentimentModule } from '../sentiment/sentiment.module';
import { QueuePublisher } from './queue-publisher.service';
import { PipelineOrchestrator } from './pipeline-orchestrator.service';

@Module({
  imports: [
    ConfigModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      },
    }),
    BullModule.registerQueue(
      { name: 'scrape' },
      { name: 'classify' },
    ),
    forwardRef(() => SentimentModule),
  ],
  providers: [QueuePublisher, PipelineOrchestrator],
  exports: [QueuePublisher],
})
export class QueueModule {}
```

- [ ] **Step 3: Update SentimentModule — import QueueModule**

In `backend-api/src/sentiment/sentiment.module.ts`, add `QueueModule` to imports.

- [ ] **Step 4: Commit**

```bash
git add backend-api/src/queue/pipeline-orchestrator.service.ts
git add backend-api/src/queue/queue.module.ts
git add backend-api/src/sentiment/sentiment.module.ts
git commit -m "feat(queue): add PipelineOrchestrator for pub/sub pipeline control"
```

---

## Task 3: Update SentimentService and Controller

**Files:**
- Modify: `backend-api/src/sentiment/sentiment.service.ts`
- Modify: `backend-api/src/sentiment/sentiment.controller.ts`

- [ ] **Step 1: Update SentimentService — replace processJob with pipeline call**

```typescript
// backend-api/src/sentiment/sentiment.service.ts — replace processJob method
// Keep: requestSentiment (generates sentimentId), getById, getHistory
// Replace the entire processJob method body with:
async processJob(params: {
  sentimentId: string;
  query: string;
  product: string;
  limit: number;
}): Promise<unknown> {
  return this.pipelineOrchestrator.startPipeline({
    sentimentId: params.sentimentId,
    query: params.query,
    product: params.product,
    limit: params.limit,
  });
}
```

Inject `PipelineOrchestrator` into the constructor.

- [ ] **Step 2: Update SentimentController — remove jobId from response**

The current controller returns `SentimentResult` which includes `jobId`. Update the response DTO to remove `jobId` from the top-level response. The `jobId` should still be used internally (via BullMQ) but not exposed.

In `backend-api/src/sentiment/dto/`, check for a response DTO. If one exists, update it. If not, the response mapping is done in `sentiment.controller.ts` — strip `jobId` from the returned object before sending to client.

- [ ] **Step 3: Commit**

```bash
git add backend-api/src/sentiment/sentiment.service.ts
git add backend-api/src/sentiment/sentiment.controller.ts
git commit -m "refactor(sentiment): wire up PipelineOrchestrator, remove jobId from response"
```

---

## Task 4: Remove HTTP service dependencies

**Files:**
- Delete: `backend-api/src/scraper/scraper.service.ts`
- Delete: `backend-api/src/scraper/scraper.module.ts`
- Modify: `backend-api/src/llm/indobert-classifier.service.ts`

- [ ] **Step 1: Check which files import ScraperService**

```bash
grep -r "ScraperService" backend-api/src
```

Remove ScraperModule from `app.module.ts` imports if present. Remove all imports of `scraper.service.ts`.

- [ ] **Step 2: Simplify IndoBERTClassifierService**

The `analyzeTweets` method is no longer called from within the backend (it's called by the IndoBERT worker now). Remove or deprecate this method. The `SentimentResult` structure it returns stays — it's used by the worker, but the worker re-implements the same logic.

Actually: since IndoBERT worker re-implements the analysis logic (reading from queue, computing summary, topInfluential), the `analyzeTweets` method in the backend service can be removed entirely.

- [ ] **Step 3: Commit**

```bash
git add backend-api/src/scraper/
git add backend-api/src/llm/indobert-classifier.service.ts
git commit -m "refactor: remove HTTP client services for scraper and IndoBERT"
```

---

## Task 5: Scraper BullMQ Worker

**Files:**
- Create: `scraper/src/worker.js`
- Modify: `scraper/src/main.js`
- Modify: `scraper/package.json`
- Modify: `scraper/Dockerfile`

- [ ] **Step 1: Add bullmq and ioredis to scraper dependencies**

```bash
cd scraper && npm install bullmq ioredis
```

Or manually add to `scraper/package.json`:
```json
"bullmq": "^5.0.0",
"ioredis": "^5.0.0"
```

- [ ] **Step 2: Create worker.js**

```javascript
// scraper/src/worker.js
const { Worker } = require('bullmq');
const Redis = require('ioredis');
const scraper = require('./scraper');

const worker = new Worker(
  'scrape',
  async (job) => {
    const { sentimentId, query, product, limit } = job.data;

    const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
    const pubsub = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

    try {
      // Scrape tweets
      const result = await scraper.search({ q: query, product, limit });
      const tweets = result.tweets;

      // Store intermediate state
      await redis.setex(
        `sentiment:${sentimentId}`,
        3600,
        JSON.stringify({ status: 'processing', tweets })
      );

      // Publish result to channel
      await pubsub.publish(
        `ch:scrape:${sentimentId}`,
        JSON.stringify({ sentimentId, tweets })
      );

      await redis.quit();
      await pubsub.quit();
    } catch (err) {
      await redis.setex(
        `sentiment:${sentimentId}`,
        3600,
        JSON.stringify({ status: 'failed', errorMessage: err.message })
      );
      await pubsub.publish(
        `ch:scrape:${sentimentId}`,
        JSON.stringify({ sentimentId, error: true, message: err.message })
      );
      await redis.quit();
      await pubsub.quit();
      throw err;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    },
    concurrency: 1,
  }
);

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

worker.on('ready', () => {
  console.log('Scraper worker ready, listening on queue: scrape');
});
```

- [ ] **Step 3: Update main.js — start worker alongside Express**

```javascript
// scraper/src/main.js — at the end of the file, start the worker
// Keep existing Express app and routes (especially /health)
// Add worker initialization at the bottom:
require('./worker');
```

- [ ] **Step 4: Update Dockerfile — install npm deps, no port expose**

```dockerfile
# scraper/Dockerfile — replace current content
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ ./src/
COPY cookies.json ./

EXPOSE 3001

CMD ["node", "src/main.js"]
```

- [ ] **Step 5: Add .dockerignore to scraper**

```
node_modules
npm-debug.log
```

- [ ] **Step 6: Commit**

```bash
git add scraper/
git commit -m "feat(scraper): convert to BullMQ worker with Redis pub/sub"
```

---

## Task 6: IndoBERT BullMQ Worker

**Files:**
- Modify: `indobert-classifier/app/main.py`
- Modify: `indobert-classifier/requirements.txt`
- Modify: `indobert-classifier/Dockerfile`

- [ ] **Step 1: Add bullmq and ioredis to IndoBERT dependencies**

```bash
# indobert-classifier/requirements.txt — add:
bullmq>=5.0.0
ioredis>=5.0.0
```

- [ ] **Step 2: Update main.py — replace FastAPI with BullMQ worker**

Replace the FastAPI app with a BullMQ worker + minimal HTTP health endpoint:

```python
# indobert-classifier/app/main.py — replace entirely
import asyncio
import json
import os
from contextlib import asynccontextmanager
from http.server import HTTPServer, BaseHTTPRequestHandler

from bullmq import Worker
import redis.asyncio as aioredis

from app.classifier import get_classifier
from app.config import DEVICE

redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
redis_host = os.environ.get("REDIS_HOST", "localhost")
redis_port = int(os.environ.get("REDIS_PORT", "6379"))

classifier = None


async def start_worker():
    global classifier
    classifier = get_classifier()

    worker = Worker(
        "classify",
        process_job,
        {
            "connection": {"host": redis_host, "port": redis_port},
            "concurrency": 1,
        },
    )

    def on_ready(_):
        print("IndoBERT worker ready, listening on queue: classify")

    worker.on("ready", on_ready)
    return worker


async def process_job(job):
    sentiment_id = job.data["sentimentId"]
    tweets = job.data["tweets"]

    redis_conn = aioredis.from_url(redis_url)
    pubsub_conn = aioredis.from_url(redis_url)

    try:
        texts = [t["text"] for t in tweets]
        results = classifier.classify_batch(texts)

        tweets_with_sentiment = []
        for t, (sentiment, score) in zip(tweets, results):
            influence_score = (
                t.get("views", 0)
                + t.get("likes", 0) * 10
                + t.get("retweets", 0) * 20
                + t.get("replies", 0) * 15
            )
            tweets_with_sentiment.append({**t, "sentiment": sentiment, "sentimentScore": score, "influenceScore": influence_score})

        total = len(tweets_with_sentiment)
        positive = round(sum(1 for t in tweets_with_sentiment if t["sentiment"] == "positive") / total * 100)
        negative = round(sum(1 for t in tweets_with_sentiment if t["sentiment"] == "negative") / total * 100)
        neutral = 100 - positive - negative

        top_influential = sorted(tweets_with_sentiment, key=lambda x: x["influenceScore"], reverse=True)[:10]

        result = {
            "summary": {"positive": positive, "negative": negative, "neutral": neutral},
            "topInfluential": top_influential,
            "tweets": tweets_with_sentiment,
            "completedAt": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        }

        await redis_conn.setex(f"sentiment:{sentiment_id}", 3600, json.dumps({"status": "done", "result": result}))
        await pubsub_conn.publish(f"ch:classify:{sentiment_id}", json.dumps({"sentimentId": sentiment_id, "result": result}))

        return result

    except Exception as e:
        await redis_conn.setex(f"sentiment:{sentiment_id}", 3600, json.dumps({"status": "failed", "errorMessage": str(e)}))
        await pubsub_conn.publish(
            f"ch:classify:{sentiment_id}",
            json.dumps({"sentimentId": sentiment_id, "error": True, "message": str(e)}),
        )
        raise

    finally:
        await redis_conn.aclose()
        await pubsub_conn.aclose()


# Minimal health server (runs on port 8000 for Docker healthcheck)
class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"status":"ok"}')
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass  # Suppress request logs


async def run_health_server():
    server = HTTPServer(("0.0.0.0", 8000), HealthHandler)
    server.serve_forever()


async def main():
    worker = await start_worker()
    await asyncio.Event().wait()  # Keep running


if __name__ == "__main__":
    asyncio.run(main())
```

Note: The health server runs in the main thread. The BullMQ worker runs via `asyncio.run()` but we need to run both. Use threading to run health server alongside worker:

```python
import threading

def run_health():
    server = HTTPServer(("0.0.0.0", 8000), HealthHandler)
    server.serve_forever()

if __name__ == "__main__":
    t = threading.Thread(target=run_health, daemon=True)
    t.start()
    asyncio.run(main())
```

- [ ] **Step 3: Update Dockerfile — install deps, no GPU settings, no port**

```dockerfile
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
    pip install --no-cache-dir \
        pydantic==2.10.6 \
        bullmq>=5.0.0 \
        ioredis>=5.0.0

COPY app/ ./app/

# No EXPOSE — internal-only
# No CMD — worker is the entrypoint
CMD ["python", "-m", "app.main"]
```

Update Dockerfile `WORKDIR` references in COPY to match new structure (app/main.py instead of `uvicorn app.main:app`).

- [ ] **Step 4: Commit**

```bash
git add indobert-classifier/
git commit -m "feat(indobert): convert to BullMQ worker with Redis pub/sub"
```

---

## Task 7: Docker Compose update

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Update scraper service**

```yaml
scraper:
  build:
    context: ./scraper
  container_name: sentitrack-scraper
  env_file:
    - .env
  environment:
    - REDIS_HOST=sentitrack-redis
    - REDIS_PORT=6379
  volumes:
    - ./scraper/results:/app/results
    - ./scraper/cookies.json:/app/cookies.json
  depends_on:
    redis:
      condition: service_healthy
```

Remove: `ports`, `SCRAPER_BASE_URL` env, `healthcheck` (Redis is healthcheck).

- [ ] **Step 2: Update indobert-classifier service**

```yaml
indobert-classifier:
  build:
    context: ./indobert-classifier
  container_name: sentitrack-indobert
  env_file:
    - .env
  environment:
    - DEVICE=${DEVICE:-cpu}
    - BATCH_SIZE=${BATCH_SIZE:-32}
    - MAX_LENGTH=${MAX_LENGTH:-128}
    - REDIS_HOST=sentitrack-redis
    - REDIS_PORT=6379
  depends_on:
    redis:
      condition: service_healthy
```

Remove: `ports`, NVIDIA GPU deploy settings.

- [ ] **Step 3: Update backend-api service**

Remove `SCRAPER_BASE_URL` and `INDOBERT_BASE_URL` from environment. Keep `REDIS_HOST` and `REDIS_PORT`.

- [ ] **Step 4: Update .env — remove unused vars**

In `backend-api/.env`, remove `SCRAPER_BASE_URL` and `INDOBERT_BASE_URL`. Add `REDIS_HOST=sentitrack-redis` and `REDIS_PORT=6379`.

In root `.env`, keep `SCRAPER_PORT` (for scraper health) and `INDOBERT_PORT` only if needed for reference. The compose services don't need these port vars anymore.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml
git add backend-api/.env
git add .env
git commit -m "refactor(docker): update services for queue worker architecture"
```

---

## Task 8: Verify and test

- [ ] **Step 1: Rebuild all services**

```bash
cd D:/Codingan/projects/SentiTrack
docker compose build --no-cache
```

- [ ] **Step 2: Restart all services**

```bash
docker compose up -d
```

Wait for all services to be healthy (especially IndoBERT model loading — ~3 minutes).

- [ ] **Step 3: Test the pipeline end-to-end**

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"admin123"}'

# Analyze sentiment (use token from login response)
curl -X POST http://localhost:5000/api/sentiment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"query":"indihome","product":"Top","limit":10}'

# Verify response does NOT contain jobId at top level
# Verify summary has positive/negative/neutral distribution (not 100% neutral)
```

Expected: Full sentiment result with proper positive/negative/neutral distribution, no jobId in response.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "test: verify worker queue pipeline end-to-end"
```

---

## Spec Coverage Check

- [x] Scraper → BullMQ worker with Redis pub/sub
- [x] IndoBERT → BullMQ worker with Redis pub/sub
- [x] Backend → REST only, queue producer + channel subscriber
- [x] Pipeline state in Redis only (pending → processing → done/failed)
- [x] Final result to Postgres only
- [x] jobId removed from API response (kept internally in BullMQ)
- [x] Docker compose updated (ports removed, Redis env added)
- [x] Healthcheck via Redis (worker connected to queue)
- [x] Error handling (BullMQ retries + error pub/sub)

## Dependencies Added

| Service | Package |
|---------|---------|
| backend-api | `ioredis` |
| scraper | `bullmq`, `ioredis` |
| indobert | `bullmq`, `ioredis` |
