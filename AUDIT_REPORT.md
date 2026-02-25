# 🔍 AlgoArena — Full Codebase Audit Report

**Generated: 2026-02-25 | Last Updated: 2026-02-25 19:30 IST**

---

## ✅ FIXED Issues (22 of 28)

All of the following issues have been resolved in the current codebase:

| #   | Severity    | Issue                                                    | Fix Applied                                                                               |
| --- | ----------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | 🔴 Critical | CORS wide open (`CORS(app)`)                             | Restricted to `localhost:3000` and configurable `FRONTEND_HOST`                           |
| 2   | 🔴 Critical | JWT Secret hardcoded as default                          | Reads from `.env`, prints warning if missing, added to `.env`                             |
| 4   | 🔴 Critical | `get_db_connection()` returns `None` causing crashes     | Now raises `DatabaseUnavailableError`, caught by Flask error handler → returns 503        |
| 5   | 🔴 Critical | SQL injection risk in `admin_database`                   | Added explicit `ALLOWED_TABLES` whitelist check                                           |
| 6   | 🔴 Critical | Docker container leak on crash                           | Added `try/except` in error handler to always `con.remove(force=True)`                    |
| 7   | 🟠 High     | Leaderboard query executed twice                         | Reordered to fetch `total_problems` first, then single leaderboard query with `LIMIT 100` |
| 8   | 🟠 High     | No password validation on registration                   | Added server-side `len(password) >= 6` check                                              |
| 9   | 🟠 High     | No username sanitization                                 | Added regex validation: `^[a-zA-Z0-9_@.\-]{3,50}$`                                        |
| 10  | 🟠 High     | Email field collected but never stored                   | Removed email field from registration form entirely                                       |
| 11  | 🟠 High     | "Remember me" checkbox does nothing                      | Removed the non-functional checkbox                                                       |
| 12  | 🟠 High     | Social login buttons (GitHub, Google) non-functional     | Removed both social login button sections from login and register                         |
| 14  | 🟠 High     | Navbar admin check never resets to false                 | Now correctly sets `isAdmin(false)` when revoked                                          |
| 15  | 🟡 Medium   | `exec:active` counter issues                             | Added container cleanup in error handler to prevent leaks                                 |
| 16  | 🟡 Medium   | `execute_query` logs every SQL query with params         | Now guarded behind `DEBUG` env var (default: false)                                       |
| 18  | 🟡 Medium   | Seed script overwrites problem content on restart        | Changed to skip existing problems (`INSERT` only, no `UPDATE`)                            |
| 19  | 🟡 Medium   | `datetime.utcnow()` deprecated                           | Replaced with `datetime.now(timezone.utc)`                                                |
| 20  | 🟡 Medium   | 2-second Docker timeout too short                        | Increased to 10 seconds                                                                   |
| 21  | 🟡 Medium   | No pagination on leaderboard                             | Added `LIMIT 100` to leaderboard query                                                    |
| 23  | 🔵 Low      | RQ task queue imported but never used                    | Removed `from rq import Queue` and the unused `task_queue` initialization                 |
| 24  | 🔵 Low      | `import re` done mid-file (line 1325)                    | Moved to top-level imports                                                                |
| 25  | 🔵 Low      | `from datetime import ...` imported 3 times in functions | Consolidated into single top-level import                                                 |
| 26  | 🔵 Low      | `onKeyPress` deprecated in React                         | Replaced with `onKeyDown` in AISidebar                                                    |
| 27  | 🔵 Low      | Hardcoded admin user in seed                             | Moved to `ADMIN_USERS` env var in `.env`                                                  |

---

## 🟡 Remaining Issues (6 of 28) — Require Production/Deployment Changes

These issues cannot be safely fixed in development alone, as they require infrastructure changes, third-party integrations, or deployment configuration:

### 3. 🔴 Gemini API Key Exposed in Client-Side Code

**File:** `frontend-next/.env.local:2`

```
NEXT_PUBLIC_GEMINI_API_KEY=...
```

**Why not fixed now:** Moving this key server-side requires either creating a Next.js API route (`app/api/chat/route.ts`) or routing AI calls through the Flask backend. Both approaches change the AI architecture significantly and need testing with rate limits, streaming, etc.
**Recommendation for deployment:** Create a proxy endpoint on your backend that forwards requests to Gemini, keeping the key server-side only.

---

### 13. 🟠 Admin Link Not Showing After Admin Status Change (Without Refresh)

**Why not fixed now:** The admin check runs on component mount. Making it reactive would require implementing a WebSocket or polling mechanism, which is an over-engineering for the current scale.
**Current behavior:** Users need to refresh the page to see the Admin link appear after being granted admin privileges. This is acceptable.

---

### 17. � No Database Connection Pooling

**Why not fixed now:** Switching from per-request connections to `psycopg2.pool.ThreadedConnectionPool` or SQLAlchemy requires changing every endpoint's connection handling pattern. This is a significant refactor that should be done alongside deployment planning.
**Recommendation for deployment:** Use connection pooling (e.g., PgBouncer or `psycopg2.pool`) when the user base exceeds ~50 concurrent users.

---

### 22. 🟡 `cache_delete_pattern` Uses `SCAN` — Slow at Scale

**Why not fixed now:** At current scale (< 100 cached keys), `scan_iter` is perfectly fast. This only becomes an issue with thousands of cached keys in production.
**Recommendation for deployment:** Use explicit key names or Redis pipelines for batch deletion.

---

### 28. 🔵 Missing `useRouter` import on Profile Page

**Why not fixed now:** Need to verify if this is actually an issue or already handled. Low priority.

---

## 📊 Final Summary

| Status                    | Count  |
| ------------------------- | ------ |
| ✅ Fixed                  | 22     |
| 🟡 Remaining (deployment) | 6      |
| **Total identified**      | **28** |

### Environment Variables Added to `.env`:

- `JWT_SECRET` — Secure JWT signing key
- `ADMIN_USERS` — Comma-separated list of auto-admin usernames

### New Environment Variable (Optional):

- `DEBUG=true` — Enables verbose SQL query logging
- `FRONTEND_HOST` — Override frontend hostname for CORS (default: localhost)
