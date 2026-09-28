# Per-Project Databases

## Dynamic DataSource Documentation

This document covers VeySur's specific implementation of project databases. For detailed information about the dynamic datasource system:

- **[Dynamic DataSource Basics](../../../external/mzen/package/mzen-om/docs/dynamic-datasource.md)** - Core concepts, API, context creation, lookup interface
- **[Multiple Dynamic DataSources](../../../external/mzen/package/mzen-om/docs/dynamic-datasource-multiple.md)** - Using multiple datasources simultaneously
- **[Advanced Infrastructure](../../../external/mzen/package/mzen-om/docs/dynamic-datasource-advanced.md)** - BaseDataSourceLookup, DataSourceRegistry, caching strategies

## Overview

Each project in VeySur has its own isolated database. When a project is created, a dedicated MySQL database is automatically provisioned with the naming convention `veysurProject_{projectId}`.

## Architecture

### Account Database
- **Database**: `veysurAccount` (configured in `dataSources`)
- **Purpose**: Stores account-level data (users, projects)
- **Repos**: `user`, `project`

### Project Databases
- **Databases**: `veysurProject_{projectId}` (dynamically created)
- **Purpose**: Store project-specific data (surveys, responses, files)
- **Repos**: All repos with `dataSource: 'project'`

## How It Works

### Project Creation
When a project is created, the system:
1. Creates a project record in the account database
2. Creates a new database: `veysurProject_{projectId}`
3. Initializes all project-scoped repo tables and indexes in the new database

#### Step 3 — Automatic table and index initialisation

`ServiceProject.create()` calls (`ServiceProject.ts:62-67`):

```typescript
await this.modelManager.initDynamicReposForDataSource('project', context)
```

This triggers the following chain:

- `DataSourceManager.initDynamicReposForDataSource()` (`data-source-manager.ts:292-311`) — collects every repo where `dataSource === 'project'`
- For each repo, `DataSourceManager.initDynamicRepo()` (`data-source-manager.ts:249-283`) resolves the actual datasource connection for the new project database, then calls `actualDS.createIndex()` for every entry in `repo.config.indexes`
- With a MySQL datasource, `createIndex()` implicitly creates the table if it does not already exist — so a single call both creates the table and adds the index

All tables and indexes are created inline during project creation. No separate migration run is required for initial setup.

> **Migration script vs. initial setup**: The migration script (`script/migrate.ts`) uses the same `createIndexes()` path but targets *existing* project databases. It is used on deployment to apply new schema changes — not for bootstrapping new projects.

### Request Routing
Each request flows through multiple layers to resolve the correct project database:

1. **Nginx Layer**: Extracts subdomain from HTTP Host header
   - Client request: `https://project-1.veysur.com/api/survey`
   - Nginx sets header: `X-Project-Subdomain: project-1.veysur.com`
   - Forwards request to API

2. **API Middleware** (`04-project-subdomain.ts`): Resolves subdomain to project ID
   - Reads `X-Project-Subdomain` header
   - Checks two-tier cache (L1 in-memory 2min, L2 Redis 10min)
   - On cache miss: queries account database (`SELECT * FROM project WHERE subdomain = '...'`)
   - Caches result in L1 (2min TTL) and L2 (10min TTL)
   - Cache is automatically invalidated cluster-wide via pub/sub on project create/update/delete
   - Sets header: `X-Project-Id: <projectId>`

3. **API Handlers/Services**: Extract projectId and create datasource context
   - Read `X-Project-Id` from request headers
   - Create `DataSourceContext` with projectId as lookup key
   - Pass context to all repo operations

4. **Dynamic DataSource Lookup**: Resolve project database connection
   - `DataSourceLookupProjectRedis` (or `DataSourceLookupProject` fallback) receives projectId from context
   - Checks two-tier cache (L1 in-memory 2min, L2 Redis 10min); on miss queries account database for project config
   - Returns connection config for `veysurProject_{projectId}`
   - DataSourceRegistry creates or reuses connection pool
   - Repo operations execute against the correct project database

## Project-Scoped Repositories

The following VeySur repos use project-specific databases (configured with `dataSource: 'project'`):

- `survey`
- `surveyQuestion`
- `surveyQuestionGroup`
- `surveyParticipant`
- `surveyResponse`
- `surveySnapshot`
- `surveySnapshotData`
- `surveyPublication`
- `settingSurvey`
- `file`
- `emailTemplate`

## Database Lookup

VeySur implements `DataSourceLookupProjectRedis` (implements mzen-om's `DataSourceLookup` interface), with automatic fallback to `DataSourceLookupProject` when Redis is unavailable.

**Location**: `package/api/src/data-source/lookup/DataSourceLookupProjectRedis.ts`

**Registration**: `package/api/src/model/init/99-final/30-datasource-lookup.ts`

**Implementation**:
1. Receives projectId from context
2. Checks two-tier cache (L1 in-memory 2min TTL, L2 Redis 10min TTL); on miss queries account database
3. Returns connection details for `veysurProject_{projectId}`
4. Registry creates or reuses connection pool
5. Cluster-wide cache invalidation via Redis pub/sub (`cache:invalidate:datasource`)

**Registration**:
```typescript
const lookup = redis
  ? new DataSourceLookupProjectRedis({ defaultDataSource, redis, l1TtlMs: 2 * 60 * 1000, l2TtlSeconds: 10 * 60 })
  : new DataSourceLookupProject({ defaultDataSource })
server.modelManager.setDataSourceLookup('project', lookup)
```

## Redis Key Structure

Cache keys are composed from two layers:

```
{redis keyPrefix} + {collectionName}:doc: + {lookup key}
└─ DataSourceRedis ┘ └── DataSourceRedis ──┘ └─ cache key ┘
```

| Layer | Source | Value |
|---|---|---|
| Redis key prefix | `config/default.ts` → `keyPrefix` | `vs:` |
| Collection + doc separator | `DataSourceRedis.docKey()` | `{collectionName}:doc:` |
| Lookup key | the key passed to cache `get`/`set` | e.g. `project:{projectId}` |

**Datasource cache** (`DataSourceLookupProjectRedis`, `collectionName: 'datasource'`):
```
vs:datasource:doc:project:{projectId}
```

**Subdomain cache** (`RedisSubdomainCache`, `collectionName: 'subdomain'`):
```
vs:subdomain:doc:{subdomain}
```

The `collectionName` for each cache instance is configured in its constructor — `DataSourceLookupProjectRedis.ts` and `RedisSubdomainCache.ts`.

## VeySur Service Patterns

### Service Layer
All service methods that interact with project-scoped repos must create and pass a context:

```typescript
import { DataSourceContext } from 'mzen-om'

async getAll({ projectId, ...params }) {
  // Create context from projectId
  const context = DataSourceContext.fromDataSources({
    project: { lookupKey: projectId }
  })

  const repo = this.getRepo('survey')
  const surveys = await repo.find(query, { context, ...options })

  return { surveys }
}
```

### Creating Records
```typescript
async create({ projectId, data, aclContext }) {
  const context = DataSourceContext.fromDataSources({
    project: { lookupKey: projectId }
  })
  const repo = this.getRepo('survey')

  data.createdById = aclContext.jwt._id

  await repo.insertOne(data, { context })
  return data
}
```

### Querying with Relations
```typescript
async getOne({ projectId, surveyId }) {
  const context = DataSourceContext.fromDataSources({
    project: { lookupKey: projectId }
  })
  const repo = this.getRepo('survey')

  const survey = await repo.findOne(
    { _id: surveyId },
    { context, populate: { questions: true } }
  )

  return survey
}
```

Note: `core/` documents (survey, question, group, participant, response, etc.) do not store a `projectId` field — every row in a project's database already belongs to that project by construction, so the field would be redundant. `context.projectId` above is only used to select which project database to connect to.

## Configuration

### ModelManager Setup
**Location**: `package/api/src/config/default.ts`

```typescript
export const server = {
  model: {
    dataSources: [
      { name: 'account', type: 'mysql', config: { /* ... */ } },
      { name: 'project', type: 'dynamic', config: {} },
      // Included when REDIS_HOST and REDIS_PORT env vars are set
      { name: 'cacheDb', type: 'redis', config: { host, port, password, db: 0, keyPrefix: 'vs:', trackIds: false } },
    ],

    // Dynamic datasources configuration
    dynamicDataSource: {
      enable: true,
      registry: {
        maxSize: 20,                    // Max project databases in pool
        idleTimeout: 30 * 60 * 1000,   // 30 minutes
      },
    },
  }
}
```

### Datasource Lookup Registration
**Location**: `package/api/src/model/init/99-final/30-datasource-lookup.ts`

```typescript
const redis = server.modelManager.dataSources['cacheDb'] ?? null
const lookup = redis
  ? new DataSourceLookupProjectRedis({ defaultDataSource, redis, l1TtlMs: 2 * 60 * 1000, l2TtlSeconds: 10 * 60 })
  : new DataSourceLookupProject({ defaultDataSource })
server.modelManager.setDataSourceLookup('project', lookup)
```

## Connection Pooling

### Registry-Level Pooling
- Manages pool of DataSource instances
- One DataSource per unique projectId
- LRU eviction when pool reaches capacity (default: 20, `registry.maxSize`)
- Idle timeout: 30 minutes
- Eviction and idle-close skip any DataSource with an active transaction lease (`hasActiveLeases()`)
- Concurrent `getOrCreate()` calls for a key with no cached entry yet (first access, or right
  after an eviction) are deduplicated onto a single in-flight creation — only one connection pool
  is opened per key even under a burst of simultaneous requests for the same project

### Connection-Level Pooling
- Each DataSource maintains its own MySQL connection pool
- Configured via mysql2/promise `createPool()`
- `connectionLimit: 5` per project pool (`DataSourceLookupProject.ts` / `DataSourceLookupProjectRedis.ts`)
- A second pool with the same `connectionLimit` is created lazily per project the first time it calls `bulkWrite()` (`DataSourceMysql.getBulkPool()`)
- Connections are NOT shared across projects

### Connection budget vs. `max_connections`

Each API pod's theoretical worst-case MySQL connection ceiling is
`registry.maxSize × connectionLimit × 2` (the `×2` accounts for the bulk-write
pool once a project has used `bulkWrite()`), plus the two fixed pools
(`account`, `ipLocation`). At `maxSize: 20` / `connectionLimit: 5` that's
`20 × 5 × 2 + 2 × 5 ≈ 210` connections per pod — well down from the previous
`maxSize: 50` / `connectionLimit: 10` setting's ~1020/pod ceiling, but still
capable of exceeding the MySQL server's `max_connections` (200 in
`deploy/mysql/custom.cnf`) if more than one API instance runs and a meaningful
fraction of each pod's cached projects are simultaneously transaction-heavy.

This is a soft, probabilistic constraint, not a guarantee: `mysql2` queues
callers when a pool is exhausted rather than erroring, and hitting the
server-wide ceiling requires many *distinct* projects across *multiple* pods
to be maxing out concurrent connections at the same instant. There is
currently no alerting on MySQL connection utilisation — before raising either
`connectionLimit` or `maxSize` again, add monitoring on
`SHOW STATUS LIKE 'Threads_connected'` (or the equivalent Prometheus MySQL
exporter metric) so future sizing decisions are based on observed peak
concurrency rather than the theoretical worst case.

**`maxSize` is not a hard ceiling.** `DataSourceRegistry.getOrCreate()`
(`external/mzen/package/mzen-om/src/data-source/registry.ts`) only evicts a
datasource to stay under `maxSize` if it can find an entry with
`refCount === 0` (no active queries/leases). If every cached project
datasource is busy when a new project needs a slot, eviction fails, a
warning is logged, and `getOrCreate()` creates the new datasource anyway —
the registry silently grows past `maxSize` rather than blocking or erroring.
So the ~210-connections/pod figure above is the *typical-case* footprint
with `maxSize: 20`, not a guaranteed maximum: under sustained load with more
than 20 distinct busy projects per pod, actual connection count can exceed
it. This is what the `Threads_connected` monitoring recommendation above is
for — it would catch this case in practice.

### Per-project concurrency (`connectionLimit`)

`connectionLimit: 5` is the practical throughput ceiling for a single
project on a single pod: at most 5 concurrent MySQL operations for that
project's main pool (plus up to 5 more once it starts using `bulkWrite()`,
via the separate bulk pool). A 6th concurrent request against the same
project doesn't fail — `mysql2` queues it until a connection frees up — but
it does add latency proportional to how long the other 5 hold their
connections (e.g. transaction length).

For survey-taking traffic this rarely binds: most participant requests are
short, single-query operations, so 5 connections comfortably absorb far more
than 5 concurrent participants. It becomes a real limit for a project running
many concurrent long-lived transactions (e.g. bulk import, migration,
several admins editing simultaneously) on the same project database at the
same time — those queue behind each other on the 5-connection pool. If a
specific project needs a higher ceiling, `connectionLimit` is currently a
single value shared by all projects (`DataSourceLookupProject.ts` /
`DataSourceLookupProjectRedis.ts`), not configurable per project.

## Transactions

All `package/api` services use `repo.transaction(context, fn)` — never call
`transactionStart()`/`transactionCommit()`/`transactionRollback()` directly.
Each transactional caller gets its own dedicated connection lease, so
concurrent requests against the same project database cannot clobber each
other's transactions. See the ["Transactions" section in Dynamic DataSource Basics](../../../external/mzen/package/mzen-om/docs/dynamic-datasource.md)
for the call pattern and the tx-scoped context requirement.

## Best Practices

1. **Always pass context** - Every project-scoped repo operation needs context
2. **Single context per request** - Create context once at the start of each service method
3. **Consistent projectId** - Use the projectId from request headers, not from query results
4. **Error handling** - Context errors are caught and logged by the framework

## Common Issues

### Error: "No datasource context provided"
**Cause**: Forgot to pass context to repo method

**Fix**: Add context to all repo calls:
```typescript
// ❌ Wrong
await repo.find(query)

// ✅ Correct
await repo.find(query, { context })
```

### Error: "No project found for subdomain"
**Cause**: Project doesn't exist or subdomain not configured

**Fix**: Verify project exists and subdomain matches

## See Also

For comprehensive information on dynamic datasources:
- **[Dynamic DataSource API](../../../external/mzen/package/mzen-om/docs/dynamic-datasource.md)** - Context creation, lookup interface, error handling
- **[Advanced Infrastructure](../../../external/mzen/package/mzen-om/docs/dynamic-datasource-advanced.md)** - BaseDataSourceLookup, caching, connection pooling details
- **[Multiple DataSources](../../../external/mzen/package/mzen-om/docs/dynamic-datasource-multiple.md)** - Multi-datasource patterns (if VeySur adds tenant-level isolation)
