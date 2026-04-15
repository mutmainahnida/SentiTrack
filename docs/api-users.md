# Users API

## Base URL
```
/api/users
```

## Authentication
All endpoints require JWT Bearer token in `Authorization` header.

```
Authorization: Bearer <accessToken>
```

## Roles
| Role ID | Title | Permissions |
|---------|-------|-------------|
| 1 | admin | All operations |
| 2 | user | Read self, update self |

---

## Endpoints

### GET /api/users

Get all users (admin only).

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| skip | number | 0 | Pagination offset |
| take | number | 20 | Number of records (max 100) |
| search | string | — | Filter by name or email |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "successfully get all users",
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "roleId": 2,
      "role": { "id": 2, "title": "user" },
      "createdAt": "2026-04-15T00:00:00.000Z"
    }
  ]
}
```

---

### GET /api/users/me

Get current authenticated user.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "successfully get user",
  "data": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "roleId": 2,
    "role": { "id": 2, "title": "user" },
    "createdAt": "2026-04-15T00:00:00.000Z",
    "updatedAt": "2026-04-15T00:00:00.000Z"
  }
}
```

---

### GET /api/users/:id

Get user by ID.

**Authorization:**
- Admin: can view any user
- User: can only view own profile

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | UUID | User ID |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "successfully get user",
  "data": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "roleId": 2,
    "role": { "id": 2, "title": "user" },
    "createdAt": "2026-04-15T00:00:00.000Z"
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 404 | User not found |
| 403 | Not authorized to view this user |

---

### POST /api/users

Create a new user (admin only).

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
| email | string | Valid email format, lowercase, trimmed |
| password | string | 8–50 chars, must contain uppercase + lowercase + number |

**Response (201 Created):**
```json
{
  "success": true,
  "message": "successfully create user",
  "data": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "roleId": 2,
    "createdAt": "2026-04-15T00:00:00.000Z"
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Validation failed |
| 409 | Email already taken |
| 403 | Not admin |

---

### PATCH /api/users/:id

Update user. Admin can update any user. Regular user can only update own profile.

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | UUID | User ID |

**Request Body (all optional):**
```json
{
  "name": "string",
  "email": "string",
  "password": "string"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "successfully update user",
  "data": { ... }
}
```

---

### DELETE /api/users/:id

Delete user (admin only).

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | UUID | User ID |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "successfully delete user",
  "data": null
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 404 | User not found |
| 403 | Not admin |

---

## Notes

- Passwords are hashed with bcrypt before storage
- Users cannot delete their own account
- `roleId` defaults to `2` (user) on creation