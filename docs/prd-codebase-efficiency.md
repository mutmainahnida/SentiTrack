# PRD: Codebase Efficiency and Backend Job Architecture

## Status

**Partially Implemented** — Sentiment pipeline is fully async via BullMQ workers. Search pipeline remains on the legacy `enqueueAndWait` pattern. Remaining work tracked in [Acceptance Criteria](#acceptance-criteria).

## Objective

Improve SentiTrack codebase efficiency by making backend request handling truly asynchronous, reducing duplicated responsibilities across layers, simplifying data flow between backend and scraper, and standardizing module structure for `search` and `sentiment`.

The main outcome is a backend that responds quickly, processes heavy work in workers, stores authoritative results in PostgreSQL, and exposes a consistent API shape that is easier to maintain and scale.

## Background

The codebase has a clear direction:

- NestJS modules are separated by domain.
- BullMQ is used for job queuing.
- PostgreSQL is available via Prisma.
- Scraper is isolated as a separate service.

The sentiment pipeline was fully refactored to async BullMQ workers (completed Q2 2026). The search pipeline still uses the legacy synchronous pattern.

Remaining inefficiencies:

- Search pipeline still waits for BullMQ jobs to finish instead of returning immediately with a `jobId`.
- Search routes mix "submit job", "get history", and "get job result" in one endpoint shape.
- Results are stored in both Redis and PostgreSQL without a clear source of truth for search.
- Search history is not user-scoped, while sentiment history is user-scoped.

## Problem Statement

The backend is functionally working, but not yet optimized for clean asynchronous processing.

Pain points resolved by sentiment pipeline refactor:

- ~~Slow request lifecycle: request latency depends on scraper and classifier completion.~~ — **Fixed**: sentiment submission returns immediately.
- ~~Redundant persistence: Redis stores result payloads while PostgreSQL also stores job history.~~ — **Fixed**: sentiment results stored in PostgreSQL via `markDone`.
- ~~Scraper and IndoBERT were HTTP services that waited for jobs.~~ — **Fixed**: both converted to BullMQ workers, no HTTP ports exposed.

Remaining pain points:

- Search pipeline still waits for BullMQ jobs to finish.
- Redis result payloads still used as retrieval path for search pipeline.
- Mixed concerns: some controllers still talk directly to Prisma.
- Inconsistent API semantics: search endpoint handles submit, history listing, and single-job retrieval.
- Harder scalability: synchronous waiting limits concurrency and wastes API worker time.

## Product Goals

1. **Done** — Make heavy operations asynchronous by default. (Sentiment pipeline complete; search pipeline pending)
2. **Done** — Keep scraper as a stateless BullMQ worker that only fetches tweets.
3. **Done** — Make PostgreSQL the source of truth for job history and results. (Sentiment pipeline; search pipeline pending)
4. **In Progress** — Standardize repository, service, controller, and processor patterns across `search` and `sentiment`.
5. **Done** — Reduce response latency for job submission endpoints. (Sentiment pipeline returns immediately; search pipeline pending)
6. Improve maintainability, readability, and test coverage.

## Non-Goals

- Rewriting scraper internals.
- Replacing BullMQ.
- Replacing Prisma with another ORM.
- Redesigning frontend flows beyond what is required to consume the new backend patterns.
- Building billing, credits, or quota logic in this phase.

## Users Affected

- End users submitting search and sentiment jobs.
- Frontend developers integrating polling and history views.
- Backend developers maintaining workers, persistence, and APIs.
- Operators debugging scraper, queue, and classifier failures.

## Success Metrics

- `POST /api/search` and `POST /api/sentiment` return in under 500 ms for p95 under normal load.
- No HTTP endpoint waits for full scraper/classifier completion.
- 100 percent of completed jobs are recoverable from PostgreSQL without Redis result payloads.
- Search and sentiment modules follow the same layer pattern:
  controller -> service -> repository and controller -> service -> queue -> processor -> repository.
- Unit test coverage exists for controller, service, repository, and processor in both modules.
- Failed jobs are visible in history with meaningful error messages.

## Product Requirements

### 1. Job Submission Must Be Asynchronous

**Status: Done for sentiment, pending for search.**

Both `search` and `sentiment` submission endpoints must:

- validate input,
- create a queued job record in PostgreSQL,
- enqueue a BullMQ job,
- return immediately with `jobId`, `status`, and `createdAt`.

They must not wait for worker completion inside the request lifecycle.

### 2. Scraper Must Stay Stateless From Business Perspective

**Status: Done.**

The scraper is now a pure BullMQ worker. It must remain responsible only for tweet retrieval.

It must not:

- decide whether the request is search or sentiment,
- know about users,
- know about job history,
- know about BullMQ orchestrator logic,
- know about PostgreSQL.

Backend owns orchestration, persistence, retries, and job status.

### 3. PostgreSQL Must Be the Source of Truth

**Status: Done for sentiment pipeline. Pending for search pipeline.**

Job metadata and final results must be stored in PostgreSQL.

Redis should be used only for:

- BullMQ queue state,
- delayed retries,
- worker coordination.

Redis should not be required to retrieve completed historical results after a job is persisted in PostgreSQL.

### 4. Standardized Route Pattern

**Status: Done for sentiment. Pending for search.**

The backend should adopt a consistent route pattern:

For search:

- `POST /api/search` -> submit search job
- `GET /api/search/jobs/:jobId` -> get one search job
- `GET /api/search/history` -> get search history

For sentiment:

- `POST /api/sentiment` -> submit sentiment job
- `GET /api/sentiment/jobs/:jobId` -> get one sentiment job
- `GET /api/sentiment/history` -> get sentiment history

This removes ambiguous endpoint behavior and makes frontend integration simpler.

### 5. History Must Be User-Scoped

**Status: Done for sentiment. Pending for search.**

Search and sentiment history must both support user scoping.

Rules:

- regular users see only their own jobs,
- admin users may see all jobs,
- job history endpoints must be authenticated if they expose user-owned data.

### 6. Layering Must Be Consistent

**Status: Done for sentiment pipeline.**

Expected responsibility split:

- controller: HTTP parsing, auth context, response mapping
- service: orchestration and business rules
- repository: Prisma access only
- processor: worker execution only
- scraper service: HTTP client to scraper only (sentiment pipeline uses BullMQ, not HTTP)
- classifier service: sentiment inference only (sentiment pipeline uses BullMQ worker)

Controllers must not use `PrismaService` directly for domain logic.

### 7. Result Schema Must Be Stable

**Status: Done for sentiment. Pending for search pipeline confirmation.**

Each job history record should include:

- `jobId`
- `userId` where relevant
- `query`
- `product`
- `requestedLimit`
- `status`
- `attempts`
- `errorMessage`
- `startedAt`
- `completedAt`
- `result`

For sentiment jobs, result should include:

- summary percentages
- top influential tweets
- analyzed tweets

For search jobs, result should include:

- tweet list
- count
- query metadata

### 8. Efficiency and Resource Management

**Status: Partially done. Connection cleanup needs verification.**

The backend must:

- close long-lived Redis resources cleanly on shutdown,
- avoid duplicate payload storage unless justified,
- avoid repeated user lookup logic in controllers,
- avoid unnecessary serialization and deserialization steps across layers.

### 9. Observability

**Status: Partially done. Structured logging in progress.**

Each job should emit structured logs at least for:

- queued
- processing
- completed
- failed

Logs should include:

- module name
- `jobId`
- query
- attempt count
- duration where available

## Non-Functional Requirements

### Performance

- Submission endpoints must be fast and non-blocking.
- Worker processing must tolerate slow scraper or classifier responses through retries and timeout handling.

### Reliability

- Failed jobs must be persisted with status `FAILED`.
- Worker retries must not create duplicate history rows.
- Reprocessing should update existing job records rather than creating new ones.

### Maintainability

- Shared interfaces must be centralized when they represent the same contract.
- Search and sentiment module structure should look symmetrical.
- All module-specific Prisma calls should live in repository classes.

### Security

- User-owned history endpoints must require JWT.
- Admin-only expanded access must be explicit and role-checked.

## Proposed Architecture

### Completed: Sentiment Pipeline (Q2 2026)

1. Client submits `POST /api/sentiment` with JWT.
2. `SentimentController` validates request and resolves current user.
3. `SentimentService` creates a PostgreSQL job history row with status `QUEUED`.
4. `PipelineOrchestrator` enqueues BullMQ jobs (`scrape` and `classify` queues) and returns immediately.
5. `SentimentService` marks row `PROCESSING`.
6. `ScraperWorker` (Node.js BullMQ worker) consumes `scrape` queue, fetches tweets, publishes result via Redis pub/sub.
7. `PipelineOrchestrator` listens for scrape result, chains to `classify` queue.
8. `IndoBERTClassifierWorker` (Python BullMQ worker) consumes `classify` queue, runs inference, publishes result via Redis pub/sub.
9. `PipelineOrchestrator` receives classify result, calls `SentimentRepository.markDone()` with full result.
10. Client polls `GET /api/sentiment/jobs/:jobId` or reads `GET /api/sentiment/history`.

### Pending: Search Pipeline

The search pipeline still uses the legacy `enqueueAndWait` pattern. Same flow should be applied.

### Data Ownership

- **PostgreSQL** owns job history and final result snapshots (both pipelines).
- **Redis** owns queue internals + pub/sub coordination.
- **Scraper** owns tweet extraction only.
- **IndoBERT** owns sentiment inference only.

## API Contract Changes

### Search Submit Response

**Pending async pattern** — currently still synchronous.

```json
{
  "success": true,
  "message": "Search job accepted",
  "data": {
    "jobId": "search_123",
    "status": "queued",
    "createdAt": "2026-04-16T00:00:00.000Z"
  }
}
```

### Sentiment Submit Response

**Done** — returns immediately without waiting for worker completion.

```json
{
  "success": true,
  "message": "Sentiment job accepted",
  "data": {
    "jobId": "sentiment_123",
    "status": "queued",
    "createdAt": "2026-04-16T00:00:00.000Z"
  }
}
```

### Job Detail Response

```json
{
  "success": true,
  "message": "Job retrieved",
  "data": {
    "jobId": "sentiment_123",
    "status": "completed",
    "createdAt": "2026-04-16T00:00:00.000Z",
    "completedAt": "2026-04-16T00:00:12.000Z",
    "result": {}
  }
}
```

## Acceptance Criteria

- ~~`search` and `sentiment` submission endpoints no longer call `enqueueAndWait`.~~ — **Sentiment done; search pending.**
- Search and sentiment job detail endpoints are separate from history endpoints.
- ~~Search history becomes authenticated and user-scoped, with admin override if required.~~ — **Sentiment done; search pending.**
- Controllers do not directly use `PrismaService` for domain lookups.
- ~~PostgreSQL can serve completed job results without reading Redis payload keys.~~ — **Sentiment done; search pending.**
- Queue-related Redis resources are closed on application shutdown. — **Partially done, needs verification.**
- Search and sentiment both have unit tests for controller, service, repository, and processor layers. — **Pending.**
- ~~Documentation reflects the new route and job lifecycle behavior.~~ — **Updated 2026-04-16.**

### Remaining Work

1. Refactor search pipeline to match sentiment async pattern (remove `enqueueAndWait`)
2. Make search history user-scoped
3. Add unit tests for both pipelines
4. Verify Redis connection cleanup on shutdown

## Rollout Plan

### Phase 1: API and Queue Contract Cleanup ✅ (Sentiment)

- Change submit endpoints to return queued jobs immediately. — **Sentiment done.**
- Replace mixed GET behavior with explicit job and history routes. — **Sentiment done.**
- Keep existing worker logic but remove synchronous waiting. — **Sentiment done; search pending.**

### Phase 2: Persistence Simplification ✅ (Sentiment)

- Remove Redis result payload as a required retrieval path. — **Sentiment done; search pending.**
- Use PostgreSQL as the only completed result source. — **Sentiment done; search pending.**
- Add missing indexes for history queries. — **Pending.**

### Phase 3: Layer Consistency

- Move direct Prisma controller usage into services or repositories.
- Unify DTO and result interface ownership.
- Align search and sentiment module structures. — **Sentiment done; search pending.**

### Phase 4: Operational Hardening

- Add graceful Redis teardown. — **Partially done; needs verification.**
- Add structured logging and timing metrics. — **Pending.**
- Add tests for failure and retry scenarios. — **Pending.**

## Risks

- Frontend may currently depend on immediate completed payloads and will need polling support.
- ~~Existing docs describe job submission as completed synchronously and will need updates.~~ — **Docs updated 2026-04-16.**
- Removing Redis result caching without adjusting retrieval flow may break current polling behavior if done halfway — **Only applies to search pipeline.**

## Open Questions

- Should search history also be fully JWT-protected like sentiment history? — **Pending decision.**
- Should admin be allowed to query all search history or only all sentiment history? — **Pending decision.**
- Should search jobs also store `userId` now, or remain anonymous for public usage? — **Pending decision.**
- ~~Do we want to keep both Gemini and IndoBERT services, or standardize around one classifier contract?~~ — **Resolved: Sentiment uses IndoBERT (Python BullMQ worker) via Redis pub/sub. Gemini is used for LLM features in the backend (not classification).**

## Recommended Decision (Already Adopted)

Sentiment pipeline adopts fully asynchronous job model via BullMQ workers, PostgreSQL is the source of truth for result retrieval, and the same pattern should be applied to search pipeline.

Remaining decisions needed for search pipeline: JWT protection, user scoping, and anonymous access policy.
