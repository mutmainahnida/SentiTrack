# Plan: Users CRUD + RBAC

## Scope

- Admin: CRUD all users (create, read, update, delete)
- User: Update own profile only (self-edit)
- JWT Bearer token auth on all endpoints
- Role guard: `admin` vs `user`

## Files to Create

### 1. `src/users/dto/create-user.dto.ts`
- name (string, required, min 2, max 100)
- email (string, required, email format)
- password (string, required, min 6, max 50)
- roleId (number, optional, default 1)

### 2. `src/users/dto/update-user.dto.ts`
- name (string, optional, min 2, max 100)
- email (string, optional, email format)
- password (string, optional, min 6, max 50)
- roleId (number, optional, admin-only for setting role)

### 3. `src/users/dto/update-profile.dto.ts`
- name (string, optional)
- password (string, optional, min 6)

### 4. `src/users/users.controller.ts`
- `GET /api/users` — admin only, list all users (paginated)
- `GET /api/users/:id` — admin or own user
- `POST /api/users` — admin only, create user
- `PATCH /api/users/:id` — admin or own user (update logic differs)
- `DELETE /api/users/:id` — admin only

### 5. `src/users/users.service.ts`
- `findAll()` — paginated
- `findById(id)` — with role
- `create(dto)` — hash password
- `update(id, dto)` — partial update, hash password if changed
- `delete(id)` — hard delete

### 6. `src/users/users.repository.ts`
- `findAll(params)` — skip, take, search
- `findById(id)`
- `create(data)`
- `update(id, data)`
- `delete(id)`

### 7. `src/users/guards/jwt-auth.guard.ts`
- Extract Bearer token from Authorization header
- Verify JWT using access secret
- Attach `user` + `sessionId` to request

### 8. `src/users/guards/roles.guard.ts`
- Check `user.role.title` against allowed roles
- Used on controller methods via `@Roles('admin')`

### 9. `src/users/decorators/roles.decorator.ts`
- `@Roles('admin')` — set required roles on handler

### 10. `src/users/decorators/current-user.decorator.ts`
- `@CurrentUser()` — extract user from request

### 11. `src/users/users.module.ts`
- Import PrismaModule, JwtModule
- Register controller + service + repository + guards

### 12. Update `src/app.module.ts`
- Import UsersModule

### 13. Update seed
- Add seed users with bcrypt (already done)

## Verification

1. `npx tsc --noEmit` — no type errors
2. `npm test` — all tests pass
3. Manual: login as admin → create user, list users, update, delete
4. Manual: login as user → update own profile, try update other user (403), try access other user (403)
5. Manual: try access endpoints without token (401)

## Notes

- Validation via `class-validator` (already installed)
- Password hashed with bcrypt (already installed)
- Use Prisma transaction for delete
- Soft-delete not implemented (hard delete for now)