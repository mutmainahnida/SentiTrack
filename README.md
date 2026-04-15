# SentiTrack

X/Twitter sentiment analysis tracker.

## Tech Stack

| Service      | Stack                      | Port  |
| ------------ | -------------------------- | ----- |
| Frontend     | Next.js 16 (React 19)       | 3000  |
| Backend API  | NestJS + BullMQ + Redis     | 5000  |
| Scraper      | Express + Puppeteer + Twint | 3001  |
| Redis        | Redis Alpine               | 6379  |

## Local Development

### Prerequisites

- Node.js 20+
- Redis (or Docker)

### Setup

```bash
# Install dependencies
cd frontend && npm install && cd ..
cd backend-api && npm install && cd ..
cd scraper && npm install && cd ..
```

### Run each service manually

```bash
# Terminal 1 — Frontend
cd frontend && npm run dev

# Terminal 2 — Backend API
cd backend-api && npm run start:dev

# Terminal 3 — Scraper
cd scraper && npm run start

# Terminal 4 — Redis (or install locally)
redis-server
```

### Run with Docker

```bash
# Build and start all services
docker compose up --build

# Start in background
docker compose up -d
```

**Note:** All services reference `.env` at the project root. Copy and adjust values as needed:

```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Backend
PORT=5000
SCRAPER_BASE_URL=http://localhost:3001

# Frontend
PORT=3000
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

**Available services:** `redis`, `scraper`, `backend-api`, `frontend`

```bash
# Example — rebuild and run frontend only
docker compose up --build frontend

# Example — watch backend logs
docker compose logs -f backend-api
```

## Scripts

```bash
# Frontend
cd frontend
npm run dev      # Development server
npm run build    # Production build

# Backend
cd backend-api
npm run start:dev    # Watch mode
npm run start:prod   # Production (after build)
npm run lint         # Lint
npm run test          # Tests
```

## Project Structure

```
SentiTrack/
├── frontend/        # Next.js web app
├── backend-api/     # NestJS REST API
├── scraper/         # Twitter/X scraper service
├── docker-compose.yml
└── .env             # Environment variables (not committed)
```
