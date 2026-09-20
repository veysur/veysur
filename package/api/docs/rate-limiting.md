<!-- cspell:ignore INCR -->
# Rate Limiting

IP-based fixed-window rate limiter protecting all API endpoints, backed by Redis with an in-process fallback.

## How it works

Middleware runs before routing and increments a per-IP counter in Redis for each request. When the counter exceeds the tier limit within the window, the request is rejected with HTTP 429.

Rules in `appConfig.rateLimit.rules` are evaluated in order — first match wins. Paths not matched by any rule fall through to the `default` tier.

## Rules and defaults

Configured in `config/default.ts`:

| Rule | Pattern | Action | Default limit | Window |
|---|---|---|---|---|
| Auth refresh | `^/auth/refresh$` | limit | 40 requests | 5 min (300 s) |
| Login / signup | `^/(auth-email-password\|signup)/` | limit | 30 requests | 15 min (900 s) |
| Geo country | `^/geo/detect-country$` | limit | 30 requests | 1 hour (3600 s) |
| Default tier | _(no match)_ | limit | 300 requests | 1 min (60 s) |

Auth refresh is split from login/signup because it fires before every authenticated request (multi-tab sessions, long-lived tabs, retry backoff) and is low-risk — unlike login/signup, which are brute-force-sensitive and share one tighter budget. `DELETE /auth/` (logout) matches none of these and falls through to the default tier, since it requires an existing valid session.

`OPTIONS` requests (CORS preflight) are always skipped regardless of rules.

## Request flow

```
Request
  ↓
OPTIONS? ──yes──→ skip (CORS preflight)
  ↓
Evaluate rules in order (first match wins)
  ↓
  skip rule matched? ──yes──→ skip
  ↓
  limit rule matched? ──yes──→ check tier limiter
  ↓
  no match → check default limiter
  ↓
┌────────────────┬───────────────────────────────┐
│ under limit    │ over limit                    │
│ set headers    │ set headers + Retry-After     │
│ next()         │ 429 JSON                      │
└────────────────┴───────────────────────────────┘
```

## Response headers

| Header | Present on | Value |
|---|---|---|
| `X-RateLimit-Limit` | every response | Configured limit for the matched tier |
| `X-RateLimit-Remaining` | every response | Requests left in current window |
| `Retry-After` | 429 only | Seconds until the window resets |

**429 response body:**
```json
{ "error": "Too many requests", "retryAfter": 47 }
```

## Configuration

### Environment variables

| Env var | Default | Description |
|---|---|---|
| `RATE_LIMIT_ENABLED` | `true` | Set to `false` to disable entirely |
| `RATE_LIMIT_AUTH_REFRESH_LIMIT` | `40` | Max requests per auth-refresh-tier window |
| `RATE_LIMIT_AUTH_REFRESH_WINDOW_SECONDS` | `300` | Auth-refresh-tier window duration in seconds |
| `RATE_LIMIT_AUTH_LIMIT` | `30` | Max requests per login/signup-tier window |
| `RATE_LIMIT_AUTH_WINDOW_SECONDS` | `900` | Login/signup-tier window duration in seconds |
| `RATE_LIMIT_GEO_COUNTRY_LIMIT` | `30` | Max requests per geo-country-tier window |
| `RATE_LIMIT_GEO_COUNTRY_WINDOW_SECONDS` | `3600` | Geo-country-tier window duration in seconds |
| `RATE_LIMIT_GENERAL_LIMIT` | `300` | Max requests per default-tier window |
| `RATE_LIMIT_GENERAL_WINDOW_SECONDS` | `60` | Default-tier window duration in seconds |

### Adding a path-specific rule

Edit `appConfig.rateLimit.rules` in `config/default.ts` — no middleware changes needed. Rules are evaluated in order; place more specific rules before broader ones.

Example — limit `/report/` to 50 req / 5 min:

```typescript
{
  pattern: '^/report/',
  tierKey: 'report',
  limit: 50,
  windowSeconds: 300,
},
```

Each rule supports:

| Field | Required | Description |
|---|---|---|
| `pattern` | yes | Regex string matched against `req.path` (case-insensitive) |
| `tierKey` | no | Short key used in the Redis counter; defaults to `r{index}` |
| `skip` | no | `true` to exclude matching paths from limiting entirely |
| `limit` | yes (if not skip) | Max requests per window |
| `windowSeconds` | yes (if not skip) | Window duration in seconds |

## Redis / fallback behaviour

- **Redis available:** An atomic Lua script executes `INCR` + conditional `EXPIRE` + `TTL` in a single round-trip. Counters are shared across all pods.
- **Redis unavailable:** Falls back to a per-process in-memory `Map` with timestamp-based expiry. Soft protection only — counters are not shared across pods.
- **Redis error mid-request:** Fails open — the request is allowed through.

## Key files

- [RedisRateLimiter.ts](../src/service/rate-limit/RedisRateLimiter.ts) — Core algorithm: fixed-window Lua script and in-memory fallback
- [07-rate-limit.ts](../src/init/00-init/07-rate-limit.ts) — Middleware registration and Redis wiring (stage 00-init / 01-model-initialised)
- [config/default.ts](../src/config/default.ts) — `app.rateLimit` config block with rules array
- [config/types.ts](../src/config/types.ts) — `RateLimitRule` and `AppConfig.rateLimit` types
