# SentiTrack

X/Twitter sentiment analysis tracker.

## Tech Stack

| Service | Stack | Port |
|---------|-------|------|
| Frontend | Next.js 16 (React 19) | 3000 |
| Backend API | NestJS + BullMQ + Redis + Prisma | 5000 |
| Scraper | Express + Puppeteer | 3000 |
| Redis | Redis Alpine | 6380 → 6379 |
| PostgreSQL | PostgreSQL 16 Alpine | 5432 |

## Architecture

```
Frontend (Next.js)
    ↓ HTTP
Backend API (NestJS)
    ├── BullMQ → Redis (job queue)
    ├── Gemini AI (sentiment analysis)
    └── Prisma → PostgreSQL (data)
    ↓ HTTP
Scraper (Express + Puppeteer)
    └── Twitter/X (via cookies)
```

## Local Development

### Prerequisites

- Node.js 20+
- Redis (or Docker)
- PostgreSQL (or Docker)

### Setup

```bash
# Install dependencies
cd frontend && npm install && cd ..
cd backend-api && npm install && cd ..
cd scraper && npm install && cd ..
```

### Database

```bash
cd backend-api

# Create database (PostgreSQL)
# Ensure DATABASE_URL in .env points to your postgres instance

# Push schema (creates tables, resets data)
PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="<any value>" npx prisma db push --force-reset

# Seed with default roles and admin user
PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="<any value>" npx prisma db seed

# Or run migrations
PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="<any value>" npx prisma migrate deploy
```

### Run services manually

```bash
# Terminal 1 — Frontend
cd frontend && npm run dev

# Terminal 2 — Backend API
cd backend-api && npm run start:dev

# Terminal 3 — Scraper
cd scraper && npm start

# Terminal 4 — Redis (or use Docker)
redis-server

# Terminal 5 — PostgreSQL (or use Docker)
pg_start
```

### Run with Docker

```bash
# Build and start all services
docker compose up --build

# Start in background
docker compose up -d

# Stop all containers
docker compose down
```

All services reference `.env` at the project root. Copy and adjust values as needed:

```env
# Database
DATABASE_URL=postgresql://postgres:236ndntm@localhost:5432/sentitrack?schema=public

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Backend
PORT=5000
SCRAPER_BASE_URL=http://localhost:3000

# Auth
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRES_IN=7d

# LLM
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemma-3-27b-it

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Docker

```bash
# Build all images and start containers
docker compose up --build

# Start in background (uses existing images)
docker compose up -d

# Stop all containers
docker compose down

# Rebuild specific service
docker compose up --build <service-name>

# View logs
docker compose logs -f <service-name>
```

**Available services:** `postgres`, `redis`, `scraper`, `backend-api`, `frontend`

```bash
# Example — rebuild and run backend only
docker compose up --build backend-api

# Example — watch scraper logs
docker compose logs -f scraper
```

## API Documentation

Full API reference in `/docs/`:

| Document | Description |
|----------|-------------|
| [docs/README.md](docs/README.md) | Overview, response format, rate limiting |
| [docs/api-auth.md](docs/api-auth.md) | Authentication — register, login, refresh |
| [docs/api-users.md](docs/api-users.md) | User management — CRUD with RBAC |
| [docs/api-search.md](docs/api-search.md) | Tweet search (public, async) |
| [docs/api-sentiment.md](docs/api-sentiment.md) | Sentiment analysis + history (JWT protected) |

## Scripts

```bash
# Frontend
cd frontend
npm run dev      # Development server
npm run build    # Production build

# Backend
cd backend-api
npm run start:dev    # Watch mode (ts-node-dev)
npm run start:prod   # Production (node dist/main)
npm run build        # Compile TypeScript
npm run lint         # Lint
npm run test          # Test suite

# Database (backend-api)
npx prisma studio    # GUI for Prisma
npx prisma generate   # Generate Prisma client
npx prisma db push    # Push schema changes
npx prisma db seed    # Run seed script
```

## Project Structure

```
SentiTrack/
├── docs/              # API documentation
├── frontend/           # Next.js web app
├── backend-api/        # NestJS REST API
│   └── prisma/        # Database schema + migrations
├── scraper/            # Puppeteer scraper service
├── docker-compose.yml
└── .env               # Environment variables (not committed)
```

## Default Credentials

Seeded via `prisma/seed.ts`:

| Email | Password | Role |
|-------|----------|------|
| admin@gmail.com | admin123 | admin |
| user@gmail.com | user12345 | user |