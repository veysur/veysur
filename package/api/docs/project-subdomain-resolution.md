# Project Subdomain Resolution

## Overview

In the Veysur platform, each project has a unique subdomain (e.g., `project-1.veysur.com`). The API needs to identify which project is making a request to enforce proper data isolation and access control.

The system uses a **two-tier cache** (L1 in-memory + L2 Redis) to efficiently resolve subdomains to project IDs. This provides ultra-fast lookups while ensuring consistency across all API pods through shared Redis state and pub/sub invalidation.

## Architecture

### Nginx Layer
- Extracts the full subdomain from the HTTP Host header
- Sets `X-Project-Subdomain` header with the extracted value
- Forwards the request to the API

### API Layer
- Middleware resolves the subdomain to the internal project ID
- Uses a **two-tier cache system**:
  - **L1 Cache**: In-memory Map (2-minute TTL) - ultra-fast, no network
  - **L2 Cache**: Redis (10-minute TTL) - shared across all pods
- Sets `X-Project-Id` header for downstream processing

### Two-Tier Cache System
- **L1 (In-Memory)**: Per-pod, 2-minute TTL, ~0.01ms lookups
- **L2 (Redis)**: Shared, 10-minute TTL, ~1-2ms lookups
- **Pub/Sub**: Cluster-wide L1 invalidation via Redis channels
- **Graceful Degradation**: Falls back to L1-only if Redis unavailable

## Flow Diagram

```
Browser Request: https://project-1.veysur.com/api/survey
    ↓
Nginx: Extract subdomain → "project-1.veysur.com"
    ↓
Set Header: X-Project-Subdomain: project-1.veysur.com
    ↓
API Middleware: Check L1 cache (in-memory Map)
    ↓
    ├─ L1 Hit (< 2min old) → Use cached projectId (~0.01ms)
    ↓
    └─ L1 Miss → Check L2 cache (Redis)
        ↓
        ├─ L2 Hit → Populate L1 cache, return projectId (~1-2ms)
        ↓
        └─ L2 Miss → Query DB: SELECT * FROM project WHERE subdomain = '...'
            ↓
            Store in L1 (2min TTL) + L2 (10min TTL) (~5-20ms)
    ↓
Set Header: X-Project-Id: proj0001testid000001z
    ↓
Endpoint Handler: Read X-Project-Id from header
```

## Two-Tier Cache Architecture

```
┌─────────────────────────────────────────────────────┐
│                    API Pod 1                         │
│  ┌──────────────────────────────────────────┐       │
│  │  L1 Cache (In-Memory)                    │       │
│  │  - TTL: 2 minutes                        │       │
│  │  - ~0.01ms lookup                        │       │
│  │  - Invalidated via pub/sub               │       │
│  └──────────────────────────────────────────┘       │
│                      ↓ L1 miss                       │
└──────────────────────┼──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│                   Redis (L2 Cache)                   │
│  ┌──────────────────────────────────────────┐       │
│  │  Shared Cache + Pub/Sub                  │       │
│  │  - TTL: 10 minutes                       │       │
│  │  - ~1-2ms lookup                         │       │
│  │  - Channel: cache:invalidate:subdomain   │       │
│  │  - Key: subdomain:{subdomain}            │       │
│  └──────────────────────────────────────────┘       │
└──────────────────────┬──────────────────────────────┘
                       ↓ L2 miss
┌─────────────────────────────────────────────────────┐
│              Database (Account DB)                   │
│  - Query: SELECT * FROM project WHERE subdomain = .. │
│  - ~5-20ms                                           │
└─────────────────────────────────────────────────────┘

Cache Invalidation Flow:
1. Project updated → invalidate(subdomain)
2. Delete from local L1 cache
3. Delete from Redis L2 cache
4. Publish to Redis channel: cache:invalidate:subdomain
5. All pods receive pub/sub message
6. All pods delete from their L1 cache
```

## Cache Behaviour

### Cache Storage

**L1 Cache (In-Memory)**
- **Location**: Map in each API pod's memory
- **Key Pattern**: `subdomain:{subdomain}`
- **Value**: `{ projectId: string, timestamp: number }`
- **TTL**: 2 minutes (120 seconds)
- **Scope**: Per-pod (not shared)
- **Invalidation**: TTL expiry + Redis pub/sub messages

**L2 Cache (Redis)**
- **Location**: Shared Redis instance
- **Key Pattern**: `vs:subdomain:doc:{subdomain}` (see [Redis Key Structure](./project-databases.md#redis-key-structure))
- **Value**: `{ projectId: string }`
- **TTL**: 10 minutes (600 seconds)
- **Scope**: Shared across all pods
- **Invalidation**: TTL expiry + explicit DEL commands

### Cache TTL Strategy
- **L1 TTL (2 minutes)**: Short TTL for quick propagation of changes
- **L2 TTL (10 minutes)**: Longer TTL to reduce database load
- Rationale: Project subdomains rarely change, but dual TTL provides defence-in-depth
- L1 populates from L2, so effective caching lasts up to 10 minutes
- Entries automatically expire if invalidation fails

### Cache Invalidation

The cache is **automatically invalidated** on project lifecycle events using a two-tier approach:

#### Invalidation Process
When `cache.invalidate(subdomain)` is called:
1. **Delete from local L1 cache** (this pod's in-memory cache)
2. **Delete from L2 cache** (Redis)
3. **Publish to Redis pub/sub channel** `cache:invalidate:subdomain`
4. **All pods receive pub/sub message** and delete from their L1 caches
5. Result: Cache invalidated cluster-wide in milliseconds

#### Project Creation
```typescript
// When a new project is created
await cache.invalidate(project.subdomain)
```
- Ensures new project is immediately accessible across all pods
- Allows negative result caching (safe to cache "not found")
- All pods' L1 caches updated via pub/sub

#### Project Update (Subdomain Change)
```typescript
// When project subdomain is changed
await cache.invalidate(oldSubdomain)
await cache.invalidate(newSubdomain)
```
- Old subdomain no longer resolves to project (all pods)
- New subdomain immediately available (all pods)
- Pub/sub ensures cluster-wide consistency

#### Project Deletion
```typescript
// When project is deleted
await cache.invalidate(project.subdomain)
```
- Subdomain lookup returns "not found" immediately (all pods)
- L1 and L2 caches cleared cluster-wide

#### Manual Invalidation
```bash
# Via API helper function
import { invalidateSubdomainCache } from 'init/00-init/04-project-subdomain'
await invalidateSubdomainCache('project-1.veysur.com')

# Clear all caches
import { clearProjectSubdomainCache } from 'init/00-init/04-project-subdomain'
await clearProjectSubdomainCache()

# Redis CLI (L2 only - doesn't trigger pub/sub)
redis-cli DEL "vs:subdomain:doc:project-1.veysur.com"

# Clear all subdomain entries from Redis (L2 only)
redis-cli KEYS "vs:subdomain:doc:*" | xargs redis-cli DEL
```

**Note**: Using Redis CLI directly only clears L2 cache and doesn't trigger pub/sub invalidation. L1 caches on pods will remain until TTL expires (max 2 minutes). Always use API functions for proper cluster-wide invalidation.

### Negative Result Caching

**Current Status**: Negative results are **NOT cached**.

```typescript
// From 04-project-subdomain.ts
if (!project) {
  server.logger.warn(`No project found for subdomain: ${subdomain}`)
  // Don't cache negative results - newly created projects need to be found immediately
}
```

**Rationale**:
- Historically avoided to ensure newly created projects are immediately accessible
- With pub/sub invalidation, negative caching could be safely enabled
- Would prevent repeated database queries for invalid/malicious subdomains
- Consider enabling in future for better protection against enumeration attacks

### Performance Impact

**L1 Cache Hit (In-Memory)**
- Latency: ~0.01ms
- No network roundtrip
- Highest performance

**L2 Cache Hit (Redis)**
- Latency: ~1-2ms
- Single Redis GET operation
- Also populates L1 for subsequent requests

**Cache Miss (Database Query)**
- Latency: ~5-20ms
- Database query + L1 write + L2 write
- Infrequent (expected hit rate >99%)

**Expected Performance**
- L1 hit rate: ~90-95% (frequent repeated requests)
- L2 hit rate: ~4-9% (first request from each pod)
- Cache miss: <1% (new/updated projects only)
- Overall hit rate: >99%

### Testing Cache

#### Basic Two-Tier Cache Flow
```bash
# Request from Pod 1 - L1 miss, L2 miss, queries database
curl https://project-1.veysur.com/api/survey
# Result: Stored in Pod 1's L1 + Redis L2 (~5-20ms)

# Second request to Pod 1 - L1 hit (ultra-fast)
curl https://project-1.veysur.com/api/survey
# Result: L1 cache hit (~0.01ms)

# Request to Pod 2 (different pod) - L1 miss, L2 hit
curl https://project-1.veysur.com/api/survey
# Result: L2 cache hit, populates Pod 2's L1 (~1-2ms)

# Subsequent requests to Pod 2 - L1 hit
curl https://project-1.veysur.com/api/survey
# Result: L1 cache hit (~0.01ms)
```

#### Testing Cache Invalidation (Cluster-Wide)
```bash
# Create a new project via API
curl -X POST https://account.veysur.com/api/projects \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"subdomain": "newproject.veysur.com", ...}'

# Cache invalidation flow:
# 1. Delete from local L1 cache (pod that handled request)
# 2. Delete from Redis L2 cache
# 3. Publish to Redis pub/sub channel
# 4. All pods receive message and delete from their L1 caches

# Request to new project immediately works on ANY pod
curl https://newproject.veysur.com/api/survey
# Success - L1/L2 miss, queries DB, caches result

# Update project subdomain
curl -X PATCH https://account.veysur.com/api/projects/proj0001testid000001z \
  -H "Authorization: Bearer <token>" \
  -d '{"subdomain": "renamed.veysur.com"}'
# Invalidates both old and new subdomains cluster-wide via pub/sub

# Old subdomain now returns 404 on ALL pods (L1 invalidated via pub/sub)
curl https://project-1.veysur.com/api/survey
# Returns: "No project found for subdomain"

# New subdomain works immediately on ALL pods
curl https://renamed.veysur.com/api/survey
# Success
```

#### Manual Cache Management
```bash
# View L2 cache entry (Redis)
redis-cli GET "vs:subdomain:doc:project-1.veysur.com"
# Returns: {"_id":"project-1.veysur.com","data":{"found":true,"projectId":"proj0001testid000001z"}}

# Check L2 TTL
redis-cli TTL "vs:subdomain:doc:project-1.veysur.com"
# Returns: 573 (seconds remaining, max 600)

# View cache statistics via API
curl https://account.veysur.com/api/cache/stats
# Returns: { l1Size: 15, l1Hits: 1234, l2Hits: 56, misses: 7, hitRate: "99.46%" }

# Proper invalidation (triggers pub/sub to all pods)
curl -X POST https://account.veysur.com/api/cache/invalidate \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"subdomain": "project-1.veysur.com"}'
# Result: L1 deleted on all pods (via pub/sub) + L2 deleted from Redis

# Manually delete from Redis (L2 only - doesn't trigger pub/sub!)
redis-cli DEL "vs:subdomain:doc:project-1.veysur.com"
# Warning: L1 caches on pods remain until TTL expires (max 2 min)

# View all cached subdomains in L2
redis-cli KEYS "vs:subdomain:doc:*"

# Monitor pub/sub channel
redis-cli SUBSCRIBE "cache:invalidate:subdomain"
# Will show invalidation messages when projects are updated
```

## Benefits of Two-Tier Cache

### Ultra-Fast Performance
- **L1 in-memory lookups**: ~0.01ms (no network roundtrip)
- **L2 Redis lookups**: ~1-2ms (shared state)
- **90-95% L1 hit rate** for frequently accessed subdomains
- Dramatically faster than database queries (~5-20ms)

### Cluster-Wide Consistency
- **L2 (Redis) provides shared state** across all API pods
- **Pub/sub ensures L1 consistency** - invalidations propagate to all pods
- Predictable behaviour regardless of which pod handles the request
- No cache inconsistency across pods

### Immediate Availability
- New projects are accessible immediately after creation
- **Pub/sub invalidation** ensures all pods updated in milliseconds
- Cache invalidation ensures no stale data across cluster
- No waiting for TTL to expire

### Graceful Degradation
- Falls back to L1-only if Redis is unavailable
- System continues to function (with per-pod caching)
- Automatic reconnection when Redis comes back online

### Future-Ready
- Can enable negative result caching (currently disabled)
- Would prevent repeated queries for invalid subdomains
- Would protect against subdomain enumeration attacks
- Safe to enable with pub/sub invalidation

### Lower Database Load
- Expected >99% cache hit rate (L1 + L2 combined)
- Database only queried once per new/updated subdomain across cluster
- L1 eliminates Redis network traffic for repeated requests
- Better scalability for high-traffic scenarios

### Cache Observability
- Monitor L1 and L2 metrics separately
- View cache statistics via API endpoints
- Inspect Redis entries for debugging
- Monitor pub/sub channel for invalidation events
- Track hit rates, cache sizes, and performance

## Monitoring

### Metrics to Watch

**Cache Performance**
- **L1 hit rate**: Should be 90-95% (in-memory hits)
- **L2 hit rate**: Should be 4-9% (Redis hits)
- **Overall hit rate**: Should be >99% (L1 + L2 combined)
- **Cache miss rate**: Should be <1% (database queries)

**Latency**
- **L1 cache latency**: Should be <1ms
- **L2 cache latency**: Should be <5ms for GET operations
- **Database query latency**: 5-20ms on cache miss

**Invalidation**
- **Pub/sub latency**: Time for invalidation to propagate to all pods
- **Cache invalidation errors**: Failed DEL or pub/sub operations
- **L1 size per pod**: Number of entries in each pod's memory

### API Cache Statistics
```bash
# Get cache stats via API
curl https://account.veysur.com/api/cache/stats
# Response:
# {
#   "l1Size": 42,           // Entries in this pod's L1 cache
#   "l1Hits": 12845,        // L1 cache hits
#   "l2Hits": 1023,         // L2 (Redis) cache hits
#   "misses": 87,           // Database queries
#   "hitRate": "99.37%"     // Overall hit rate
# }

# Get stats from code
import { getSubdomainCacheStats } from 'init/00-init/04-project-subdomain'
const stats = getSubdomainCacheStats()
```

### Redis Metrics (L2 Cache)
```bash
# Monitor Redis cache stats (all cache types, not just subdomain)
redis-cli INFO stats | grep hits
redis-cli INFO stats | grep misses

# Monitor memory usage
redis-cli INFO memory | grep used_memory_human

# Count subdomain cache entries
redis-cli KEYS "vs:subdomain:doc:*" | wc -l

# Monitor specific key
redis-cli GET "vs:subdomain:doc:project-1.veysur.com"

# Monitor pub/sub channel for invalidations
redis-cli SUBSCRIBE "cache:invalidate:subdomain"
# Will show messages like: {"key":"project-1.veysur.com"}
```

### Log Messages
```
# L1 cache hit (in-memory)
[L1 cache hit] project-1.veysur.com

# L2 cache hit (Redis), populating L1
[L2 cache hit] project-1.veysur.com

# Cache miss - querying database
[Cache miss] project-1.veysur.com

# No project found
[WARN] No project found for subdomain: project-1.veysur.com

# Cache invalidation
[Cache invalidated] project-1.veysur.com

# Pub/sub invalidation received
[L1 cache invalidated via pub/sub] project-1.veysur.com

# Errors
[ERROR] Error resolving project subdomain: <error>
[ERROR] L2 cache error for key project-1.veysur.com: <error>
[ERROR] Error subscribing to invalidations: <error>
```

## Implementation Details

### Code Location
- **Middleware**: `package/api/src/init/00-init/04-project-subdomain.ts`
- **Two-Tier Cache**: `package/api/src/service/cache/RedisTwoTierCache.ts`
- **Subdomain Cache Wrapper**: `package/api/src/service/cache/RedisSubdomainCache.ts`
- **Service Layer**: `package/api/src/model/service/platform/ServiceProjectCache.ts` (cache invalidation)

### Architecture Components

**RedisTwoTierCache (Generic Implementation)**
- Generic L1+L2 cache implementation
- Used for both subdomain caching and data source lookup
- Handles pub/sub subscriptions and invalidations
- Provides cache statistics

**RedisSubdomainCache (Subdomain-Specific)**
- Wraps RedisTwoTierCache with subdomain-specific logic
- Key prefix: `subdomain:`
- Pub/sub channel: `cache:invalidate:subdomain`
- L1 TTL: 2 minutes, L2 TTL: 10 minutes

**Data Source Lookup (Project Database Caching)**
- Also uses RedisTwoTierCache
- Key prefix: `datasource:`
- Pub/sub channel: `cache:invalidate:datasource`
- Caches project database connection details

### Redis Client
- Uses the `redis` data source configured in `config/default.ts` (ioredis-backed)
- Shared Redis instance with other services
- Automatic reconnection on connection loss
- Graceful degradation to L1-only if Redis unavailable
- Pub/sub subscriber for cluster-wide invalidations

### Error Handling
- **L1 errors**: Logged but non-fatal (continues to L2)
- **L2 errors**: Logged but non-fatal (falls back to database)
- **Redis unavailable**: Falls back to L1-only mode
- **Pub/sub errors**: Logged, reconnects automatically
- **Cache write failures**: Logged but don't block requests
- **Cache invalidation failures**: Logged for investigation
- **Database errors**: Propagated to caller (request fails)
