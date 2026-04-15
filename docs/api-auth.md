# Auth API

## Base URL
```
/api/auth
```

## Authentication
Public — no authentication required.

---

## Endpoints

### POST /api/auth/register

Create a new user account.

**Request Body:**
```json
{
  "name": "string",
  "email": "string",
  "password": "string"
}
```

| Field | Type | Validation |
|-------|------|-----------|
| name | string | 2–100 characters |
| email | string | Valid email format |
| password | string | 8–72 characters |

**Response (201 Created):**
```json
{
  "success": true,
  "message": "successfully register",
  "data": null
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Invalid input (validation fails) |
| 409 | Email already registered |

---

### POST /api/auth/login

Authenticate user and receive tokens.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "successfully login",
  "data": {
    "accessToken": "string",
    "refreshToken": "string"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| accessToken | string | JWT access token (expires in 7 days) |
| refreshToken | string | JWT refresh token |

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Invalid input |
| 401 | Invalid email or password |

---

### POST /api/auth/refresh

Refresh expired access token.

**Request Body:**
```json
{
  "refreshToken": "string"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "successfully refreshToken",
  "data": {
    "accessToken": "string",
    "refreshToken": "string"
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Invalid input |
| 401 | Invalid or expired refresh token |