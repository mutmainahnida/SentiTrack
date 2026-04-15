# Sentiment API

## Base URL
```
/api/sentiment
```

## Authentication
All endpoints require JWT Bearer token.

```
Authorization: Bearer <accessToken>
```

---

## Endpoints

### GET /api/sentiment

Analyze sentiment via query parameters.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| q | string | — | Search query (alias: `query`) |
| query | string | — | Search query (alias: `q`) |
| product | string | `Top` | Sort: `Top` or `Latest` |
| limit | number \| string | 100 | Number of tweets (max 100) |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Sentiment analysis completed",
  "data": {
    "jobId": "sentiment_<timestamp>_<uuid>",
    "status": "completed",
    "createdAt": "2026-04-15T00:00:00.000Z",
    "result": {
      "query": "string",
      "total": 50,
      "summary": {
        "positive": 60,
        "negative": 20,
        "neutral": 20
      },
      "topInfluential": [
        {
          "tweetId": "string",
          "text": "string",
          "username": "string",
          "influenceScore": 95,
          "sentiment": "positive"
        }
      ],
      "tweets": [
        {
          "tweetId": "string",
          "text": "string",
          "username": "string",
          "views": 5000,
          "likes": 100,
          "retweets": 25,
          "replies": 10,
          "sentiment": "positive",
          "sentimentScore": 0.85,
          "influenceScore": 75
        }
      ],
      "completedAt": "2026-04-15T00:00:00.000Z"
    }
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | `query` is required |
| 401 | Missing or invalid JWT |
| 404 | User not found in database |
| 504 | Job processing timeout |
| 500 | Job processing failed |

---

### POST /api/sentiment

Analyze sentiment via JSON body.

**Request Body:**
```json
{
  "query": "string",
  "product": "Top | Latest",
  "limit": 100
}
```

| Field | Type | Required | Default | Description |
|-------|------|---------|---------|-------------|
| query | string | Yes | — | Search query |
| product | string | No | `Top` | Sort order |
| limit | number | No | 100 | Number of tweets |

**Response (200 OK):** Same structure as GET endpoint.

---

### GET /api/sentiment/history

Get sentiment analysis history for the authenticated user.

**Authorization:**
- Admin (`roleId = 1`): sees all users' history
- User (`roleId = 2`): sees own history only

**Response (200 OK):**
```json
{
  "success": true,
  "message": "History retrieved",
  "data": [
    {
      "id": "uuid",
      "jobId": "string",
      "query": "string",
      "product": "Top",
      "requestedLimit": 100,
      "total": 50,
      "attempts": 1,
      "positivePct": 60,
      "negativePct": 20,
      "neutralPct": 20,
      "status": "COMPLETED",
      "result": {
        "query": "string",
        "total": 50,
        "summary": { ... },
        "topInfluential": [ ... ],
        "tweets": [ ... ],
        "completedAt": "2026-04-15T00:00:00.000Z"
      },
      "createdAt": "2026-04-15T00:00:00.000Z",
      "updatedAt": "2026-04-15T00:00:00.000Z"
    }
  ]
}
```

**Notes:**
- Returns up to 50 most recent jobs, ordered by `createdAt` descending
- Only returns jobs with `status: COMPLETED` from the perspective query
- Full result (tweets, topInfluential, summary) is stored in the `result` JSON column

---

## Processing Pipeline

1. User submits query → job is queued with `userId`
2. Scraper fetches tweets from X.com
3. If 0 tweets → returns empty result (neutral: 100%)
4. Gemini analyzes each tweet → sentiment + influence score
5. Results stored in `SentimentJobHistory` table with `userId`

---

## Job Timeout
- Default: 60,000ms (60 seconds)
- On timeout → `504 Gateway Timeout` with `jobId`
- On failure → `500 Internal Server Error` with `jobId`