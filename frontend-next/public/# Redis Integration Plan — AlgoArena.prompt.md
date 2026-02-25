# Redis Integration Plan — AlgoArena

## Phase 1: Dependencies & Connection

- Add `redis`, `PyJWT`, `flask-limiter`, `rq` to `backend/requirements.txt`
- Create Redis client connection with startup ping check in `backend/server.py`
- Configure RQ task queue and Flask-Limiter with Redis storage backend
- Environment variables: `REDIS_HOST` (default: localhost), `REDIS_PORT` (default: 6379), `JWT_SECRET`, `JWT_EXPIRY_HOURS`

## Phase 2: JWT Authentication

### Backend
- Add `generate_token(user_id, username, is_admin)` — creates JWT, stores in Redis with TTL
- Add `decode_token(token)` — validates JWT signature + checks Redis for revocation
- Create `@require_auth` decorator — extracts Bearer token, sets `g.user_id`, `g.username`, `g.is_admin`
- Create `@require_admin` decorator — requires auth + admin flag
- Update `POST /api/v1/login` — return JWT token in response
- Update `POST /api/v1/register` — return JWT token (auto-login on register)
- Add `POST /api/v1/logout` — delete token from Redis (revocation)
- Protect endpoints: `check-admin`, `set-admin`, `stats`, `submissions`, `execute`, `submit` with `@require_auth`
- Protect admin endpoints: `admin/stats`, `admin/problems` CRUD with `@require_admin`
- Remove `user_id` from request query params/body — use `g.user_id` from JWT instead

### Frontend
- Add `getToken()`, `authHeaders()` helpers to `frontend-next/src/lib/api.ts`
- Update `fetchJSON()` to automatically inject `Authorization: Bearer <token>` header
- Update `login/page.tsx` — store token in `localStorage` on login and register
- Update `Navbar.tsx` — remove token on logout, call `/api/v1/logout`
- Update `admin/page.tsx` — use JWT for admin verification
- Update `admin/dashboard/page.tsx` — use JWT for admin verification
- Update `profile/page.tsx` — remove `?user_id=` from stats/submissions calls
- Update `problems/page.tsx` — remove `?user_id=` from stats/submissions calls
- Update `problems/[slug]/page.tsx` — use `authHeaders()` for execute/submit
- Update `AISidebar.tsx` — use `authHeaders()` for chat save, remove `user_id` from body

## Phase 3: Rate Limiting

- Initialize Flask-Limiter with Redis storage URI
- Default limit: `60/minute` for all endpoints
- Custom limits:
  - `POST /api/v1/login` — 5/minute
  - `POST /api/v1/register` — 3/minute
  - `POST /api/v1/execute` — 10/minute
  - `POST /api/v1/submit` — 5/minute
  - `GET /api/v1/chat/<id>` — 20/minute
  - `POST /api/v1/chat/save` — 20/minute

## Phase 4: Response Caching

### Cache Helpers
- `cache_get(key)` — get JSON from Redis
- `cache_set(key, value, ttl)` — store JSON with TTL
- `cache_delete_pattern(pattern)` — delete keys by glob pattern

### Cached Endpoints
| Endpoint | Cache Key | TTL |
|---|---|---|
| `GET /api/v1/problems` | `problems:list` | 5 minutes |
| `GET /api/v1/problems/:slug` | `problem:{slug}` | 10 minutes |
| `GET /api/v1/admin/stats` | `admin:stats` | 30 seconds |
| `GET /api/v1/stats` | `stats:user:{user_id}` | 2 minutes |
| `GET /api/v1/chat/:problem_id` | `chat:{user_id}:{problem_id}` | 30 minutes |

### Cache Invalidation
- On problem create/update/delete: invalidate `problems:*`, `problem:{slug}`, `admin:stats`
- On new submission: invalidate `stats:user:{user_id}`, `admin:stats`
- On chat save: update `chat:{user_id}:{problem_id}`

## Phase 5: Execution Queue Tracking

- Track active executions: `exec:active` (incr on start, decr on finish)
- Track total executions: `exec:total` (incr only)
- Track execution times: `exec:times` (Redis list, last 100 runs)
- Decrement `exec:active` on all exit paths (success, TLE, error)

## Phase 6: AI Chat Endpoints (NEW)

These endpoints are called by `AISidebar.tsx` but were **missing** from the backend.

### `GET /api/v1/chat/<problem_id>`
- Auth: `@require_auth`
- Rate limit: 20/minute
- Logic: Check Redis cache → fallback to PostgreSQL `chat_sessions` table → return `[]` if none
- Cache: Store result in Redis with 30min TTL

### `POST /api/v1/chat/save`
- Auth: `@require_auth`
- Rate limit: 20/minute
- Body: `{ problem_id, history }` (user_id from JWT)
- Logic: Update Redis cache immediately → upsert into PostgreSQL (`ON CONFLICT DO UPDATE`)

## Phase 7: Admin Dashboard Update

- Add "Redis Cache" card to tech STACK array with items: JWT Token Store, Response Caching, Rate Limiting Backend, Chat State Management
- Update API_ROUTES to list all 17 endpoints with accurate descriptions and auth levels
- Update FEATURES to highlight JWT Authentication, Redis Caching, and Rate Limiting
- Import `IconShield` for the Redis card icon

## Files Modified

### Backend
- `backend/requirements.txt` — added 4 packages
- `backend/server.py` — imports, Redis connection, JWT helpers, auth decorators, cache helpers, rate limits, cached endpoints, chat endpoints, execution tracking

### Frontend
- `frontend-next/src/lib/api.ts` — `getToken()`, `authHeaders()`, auto-inject Bearer token in `fetchJSON()`
- `frontend-next/src/app/login/page.tsx` — store JWT token on login/register
- `frontend-next/src/components/Navbar.tsx` — call logout endpoint, clear token
- `frontend-next/src/app/admin/page.tsx` — JWT-based admin check, `authHeaders()` on all fetches
- `frontend-next/src/app/admin/dashboard/page.tsx` — JWT-based admin check, updated STACK/FEATURES/API_ROUTES
- `frontend-next/src/app/profile/page.tsx` — remove user_id query params
- `frontend-next/src/app/problems/page.tsx` — remove user_id query params
- `frontend-next/src/app/problems/[slug]/page.tsx` — `authHeaders()` on execute/submit
- `frontend-next/src/components/AISidebar.tsx` — `authHeaders()` on chat save, remove user_id from calls

### Infrastructure
- `docker-compose.yml` — already has Redis 7-alpine on port 6379 (no changes needed)
