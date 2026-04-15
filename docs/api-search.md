# Search API

## Base URL
```
/api/search
```

## Authentication
Public — no authentication required.

---

## Endpoints

### GET /api/search

Search tweets with query parameters.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| q | string | — | Search query (alias: `query`) |
| query | string | — | Search query (alias: `q`) |
| product | string | `Top` | Sort: `Top` or `Latest` |
| limit | number \| string | 20 | Number of tweets (max 100) |

**Response (200 OK):**
```json
{
  "jobId": "string",
  "status": "completed",
  "createdAt": "2026-04-15T00:00:00.000Z",
  "result": {
    "query": "string",
    "total": 50,
    "tweets": [
      {
        "id": "string",
        "text": "string",
        "username": "string",
        "name": "string",
        "timestamp": 1234567890,
        "likes": 100,
        "retweets": 25,
        "replies": 10,
        "views": 5000,
        "permanentUrl": "https://x.com/username/status/id"
      }
    ],
    "completedAt": "2026-04-15T00:00:00.000Z"
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | `query` is required and cannot be blank |

---

### POST /api/search

Search tweets with JSON body.

**Request Body:**
```json
{
  "query": "string",
  "product": "Top | Latest",
  "limit": 20
}
```

| Field | Type | Required | Default | Description |
|-------|------|---------|---------|-------------|
| query | string | Yes | — | Search query |
| product | string | No | `Top` | Sort order |
| limit | number | No | 20 | Number of tweets |

**Response (200 OK):** Same as GET endpoint.

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | `query` is required |

---

## Job Processing

Search requests are processed asynchronously via BullMQ queue:

1. Request is queued immediately
2. Scraped tweets are returned with `status: completed`
3. On timeout (60s default), returns `504 Gateway Timeout`
4. On scraper failure, returns `500 Internal Server Error`

---

## Notes

- Both GET and POST produce identical responses
- GET uses query string params; POST uses JSON body
- `q` and `query` are aliases — use either one
- Result is persisted in `SearchJobHistory` table