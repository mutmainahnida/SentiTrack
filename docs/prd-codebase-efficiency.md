# PRD: Codebase Efficiency and Backend Job Architecture

## Status

Draft

## Objective

Improve SentiTrack codebase efficiency by making backend request handling truly asynchronous, reducing duplicated responsibilities across layers, simplifying data flow between backend and scraper, and standardizing module structure for `search` and `sentiment`.

The main outcome is a backend that responds quickly, processes heavy work in workers, stores authoritative results in PostgreSQL, and exposes a consistent API shape that is easier to maintain and scale.

## Background

The current codebase already has a strong direction:

- NestJS modules are separated by domain.
- BullMQ is used for `search` and `sentiment`.
- PostgreSQL is available via Prisma.
- Scraper is already isolated as a separate service.

However, several patterns still reduce efficiency and maintainability:

- HTTP requests still wait for BullMQ jobs to finish instead of returning immediately with a `jobId`.
- Controller responsibilities are inconsistent across modules.
- Search routes mix "submit job", "get history", and "get job result" in one endpoint shape.
- Results are stored in both Redis and PostgreSQL without a clear source of truth.
- Some types and model responsibilities are duplicated across LLM services.
- Search history is not user-scoped, while sentiment history is user-scoped.

## Problem Statement

The backend is functionally working, but it is not yet optimized for clean asynchronous processing.

Current pain points:

- Slow request lifecycle: request latency depends on scraper and classifier completion.
- Mixed concerns: some controllers still talk directly to Prisma.
- Redundant persistence: Redis stores result payloads while PostgreSQL also stores job history.
- Inconsistent API semantics: the same endpoint handles submit, history listing, and single-job retrieval.
- Harder scalability: synchronous waiting limits concurrency and wastes API worker time.
- Testability gaps: module boundaries exist, but some responsibilities still leak across layers.

## Product Goals

1. Make heavy operations asynchronous by default.
2. Keep scraper as a dumb worker dependency that only fetches tweets.
3. Make PostgreSQL the source of truth for job history and results.
4. Standardize repository, service, controller, and processor patterns across `search` and `sentiment`.
5. Reduce response latency for job submission endpoints.
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

Both `search` and `sentiment` submission endpoints must:

- validate input,
- create a queued job record in PostgreSQL,
- enqueue a BullMQ job,
- return immediately with `jobId`, `status`, and `createdAt`.

They must not wait for worker completion inside the request lifecycle.

### 2. Scraper Must Stay Stateless From Business Perspective

The scraper service must remain responsible only for tweet retrieval.

It must not:

- decide whether the request is search or sentiment,
- know about users,
- know about job history,
- know about BullMQ,
- know about PostgreSQL.

Backend owns orchestration, persistence, retries, and job status.

### 3. PostgreSQL Must Be the Source of Truth

Job metadata and final results must be stored in PostgreSQL.

Redis should be used only for:

- BullMQ queue state,
- delayed retries,
- worker coordination.

Redis should not be required to retrieve completed historical results after a job is persisted in PostgreSQL.

### 4. Standardized Route Pattern

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

Search and sentiment history must both support user scoping.

Rules:

- regular users see only their own jobs,
- admin users may see all jobs,
- job history endpoints must be authenticated if they expose user-owned data.

### 6. Layering Must Be Consistent

Expected responsibility split:

- controller: HTTP parsing, auth context, response mapping
- service: orchestration and business rules
- repository: Prisma access only
- processor: worker execution only
- scraper service: HTTP client to scraper only
- classifier service: sentiment inference only

Controllers must not use `PrismaService` directly for domain logic.

### 7. Result Schema Must Be Stable

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

The backend must:

- close long-lived Redis resources cleanly on shutdown,
- avoid duplicate payload storage unless justified,
- avoid repeated user lookup logic in controllers,
- avoid unnecessary serialization and deserialization steps across layers.

### 9. Observability

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

### Request Flow

1. Client submits `POST /api/search` or `POST /api/sentiment`.
2. Controller validates request and resolves current user if needed.
3. Service creates a PostgreSQL job history row with status `QUEUED`.
4. Service enqueues BullMQ job and returns `jobId`.
5. Processor consumes the job.
6. Processor calls scraper service.
7. Sentiment processor additionally calls classifier service.
8. Repository updates PostgreSQL row to `PROCESSING`, then `COMPLETED` or `FAILED`.
9. Client polls `GET /jobs/:jobId` or reads `GET /history`.

### Data Ownership

- PostgreSQL owns job history and final result snapshots.
- Redis owns queue internals only.
- Scraper owns tweet extraction only.
- Classifier owns sentiment inference only.

## API Contract Changes

### Search Submit Response

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

- `search` and `sentiment` submission endpoints no longer call `enqueueAndWait`.
- Search and sentiment job detail endpoints are separate from history endpoints.
- Search history becomes authenticated and user-scoped, with admin override if required.
- Controllers do not directly use `PrismaService` for domain lookups.
- PostgreSQL can serve completed job results without reading Redis payload keys.
- Queue-related Redis resources are closed on application shutdown.
- Search and sentiment both have unit tests for controller, service, repository, and processor layers.
- Documentation reflects the new route and job lifecycle behavior.

## Rollout Plan

### Phase 1: API and Queue Contract Cleanup

- Change submit endpoints to return queued jobs immediately.
- Replace mixed GET behavior with explicit job and history routes.
- Keep existing worker logic but remove synchronous waiting.

### Phase 2: Persistence Simplification

- Remove Redis result payload as a required retrieval path.
- Use PostgreSQL as the only completed result source.
- Add missing indexes for history queries.

### Phase 3: Layer Consistency

- Move direct Prisma controller usage into services or repositories.
- Unify DTO and result interface ownership.
- Align search and sentiment module structures.

### Phase 4: Operational Hardening

- Add graceful Redis teardown.
- Add structured logging and timing metrics.
- Add tests for failure and retry scenarios.

## Risks

- Frontend may currently depend on immediate completed payloads and will need polling support.
- Existing docs describe job submission as completed synchronously and will need updates.
- Removing Redis result caching without adjusting retrieval flow may break current polling behavior if done halfway.

## Open Questions

- Should search history also be fully JWT-protected like sentiment history?
- Should admin be allowed to query all search history or only all sentiment history?
- Should search jobs also store `userId` now, or remain anonymous for public usage?
- Do we want to keep both Gemini and IndoBERT services, or standardize around one classifier contract?

## Recommended Decision

Adopt a fully asynchronous job model for both search and sentiment, make PostgreSQL the source of truth for result retrieval, and standardize all domain modules on the same layering and route pattern.

This change gives the best return for efficiency, readability, and future scalability without forcing a rewrite of scraper or queue infrastructure.
