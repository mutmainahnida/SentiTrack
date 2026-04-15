# SentiTrack API Documentation

Complete API reference for all backend endpoints.

## Modules

| Module | Base URL | Auth | Description |
|--------|----------|------|-------------|
| [Auth](api-auth.md) | `/api/auth` | None | User registration, login, token refresh |
| [Users](api-users.md) | `/api/users` | JWT | User management (CRUD), role-based access |
| [Search](api-search.md) | `/api/search` | None | Tweet search (raw data) |
| [Sentiment](api-sentiment.md) | `/api/sentiment` | JWT | Sentiment analysis with Gemini AI |

## Base Response Format

All endpoints return a consistent JSON envelope:

```json
{
  "success": true,
  "message": "successfully login",
  "data": { ... }
}
```

| Field | Type | Description |
|-------|------|-------------|
| success | boolean | `true` on success, `false` on error |
| message | string | Human-readable status message |
| data | object \| null | Response payload or `null` on errors |

## Error Responses

```json
{
  "success": false,
  "message": "error description",
  "data": null
}
```

HTTP status codes indicate error type:
| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient role) |
| 404 | Not Found |
| 409 | Conflict (duplicate resource) |
| 500 | Internal Server Error |
| 502 | Bad Gateway |
| 504 | Gateway Timeout |

## Authentication

JWT Bearer token required for protected endpoints:

```
Authorization: Bearer <accessToken>
```

Tokens are obtained via `/api/auth/login` or `/api/auth/refresh`.

| Token | Expiry | Use |
|--------|--------|-----|
| accessToken | 7 days | API authentication |
| refreshToken | 7 days | Get new accessToken |

## Environment

| Service | Port | Description |
|---------|------|-------------|
| backend-api | 5000 | NestJS application |
| postgres | 5432 | PostgreSQL database |
| redis | 6379 | BullMQ job queue |
| scraper | 3000 | Puppeteer tweet scraper |
| frontend | 3000 | Next.js web app |

## Rate Limiting

API endpoints are rate-limited to **100 requests per minute** per IP using `@nestjs/throttler`.

---

Generated: 2026-04-15