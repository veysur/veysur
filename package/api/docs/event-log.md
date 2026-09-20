# Event Log

Non-blocking event recording system for API traceability, using a dual-buffer architecture (in-memory + Redis WAL) to absorb write spikes without overloading the database.

## Usage

Call `log()` from any service. The call returns in under 5ms — database writes happen asynchronously.

```typescript
// Project-scoped event → written to project DB
await this.modelManager.services.eventLog.log({
  projectId,                       // from aclContext or header
  action: 'survey.created',
  userId: aclContext.jwt._id,
  metadata: { surveyId: survey._id },
})

// System-wide event → written to account DB (omit projectId)
await this.modelManager.services.eventLog.log({
  action: 'user.signup',
  userId: user._id,
})
```

Returns `{ id: string }` — the assigned event ID.

**Fields:**

| Field | Required | Description |
|---|---|---|
| action | Yes | Event type string (e.g. `survey.created`) |
| projectId | No | If present, writes to the project's DB via dynamic datasource |
| userId | No | Actor performing the action |
| metadata | No | Arbitrary key/value context |

## Metadata Redaction

Sensitive string fields in `metadata` are redacted before the event enters the pipeline — memory buffer, Redis WAL, and database all receive the already-redacted entry.

- Field names are matched against `Logger.DEFAULT_REDACT_PATTERNS`: `/password/i`, `/authorization/i`, `/token/i`, `/private/i`, `/secure/i`, `/email/i`, `/phone/i`, `/postcode/i`, `/zipcode/i`
- Values are partially masked (first chars retained + `█` padding) — length and prefix remain visible for audit tracing
- Nested objects and arrays are traversed recursively
- Source: `Logger.serialize()` in [`package/common/src/Logger.ts`](../../common/src/Logger.ts)

Affected metadata fields in the current catalogue are marked `†` in [events-catalogue.md](events-catalogue.md).

## Architecture

```
log()
  ├─ in-memory buffer (per projectId / system)
  │       └─ flush every 1s or at 50 events ──────────────────→ project DB / account DB
  └─ Redis WAL  (written async, failures ignored)
          ├─ flush every 5s / 200 events ─────────────────────→ project DB / account DB
          └─ startup recovery (atomic per-entry claim, safe across pods) → project DB / account DB
```

**Normal path:** Events accumulate in memory and flush to the database in batches. On successful DB write, the corresponding Redis WAL entries are deleted.

**Crash recovery:** If the process dies, the in-memory buffer is lost but Redis WAL survives. On next startup, WAL entries are replayed to the database before the server begins accepting requests. Each WAL key is claimed atomically via `GETDEL`, so in a multi-pod deployment only one pod processes each entry — concurrent startups do not produce duplicate events.

**Redis unavailable:** WAL writes are silently skipped. The memory buffer continues operating and events flush directly to the database. No action needed when Redis recovers.

**Both unavailable:** `log()` returns HTTP 503 (fail closed). No events are accepted until at least one tier is available.

## Configuration

All values are set via environment variables.

| Env Var | Default | Description |
|---|---|---|
| `MEMORY_FLUSH_INTERVAL_MS` | `1000` | How often (ms) the memory buffer flushes |
| `MEMORY_BATCH_SIZE` | `50` | Trigger an immediate flush when a buffer reaches this size |
| `REDIS_FLUSH_INTERVAL_MS` | `5000` | How often (ms) the Redis WAL is flushed to the DB |
| `REDIS_BATCH_SIZE` | `200` | Max events to process per Redis WAL flush |
| `MAX_MEMORY_BUFFER_SIZE_PER_PROJECT` | `100` | Per-project buffer cap; events are dropped when full |
| `GLOBAL_MAX_EVENTS` | `10000` | Total in-memory cap across all buffers; oldest events dropped first |
| `MAX_BACKLOG_QUEUE_SIZE` | `500` | Per-project backoff queue limit; excess moves directly to DLQ |
| `REDIS_BACKUP_TTL_SECONDS` | `86400` | TTL for Redis WAL entries (24 hours) |
| `MAX_RETRIES_BEFORE_DLQ` | `5` | Consecutive flush failures before an event moves to the DLQ |
| `MEMORY_WARNING_THRESHOLD` | `0.7` | Log a warning when global buffer reaches this fraction of the limit |

## Failure Handling

### DB flush backoff

When a database flush fails, the buffer retries with exponential backoff:

| Consecutive failures | Retry delay |
|---|---|
| 1 | 1s |
| 2 | 2s |
| 3 | 4s |
| 4 | 8s |
| 5+ | doubles, capped at 30s |
| `MAX_RETRIES_BEFORE_DLQ` reached | → Dead-letter queue |

If a project's backoff queue exceeds `MAX_BACKLOG_QUEUE_SIZE`, the overflow moves immediately to the DLQ rather than consuming more memory.

### Scenario summary

| Scenario | Behaviour |
|---|---|
| Project DB down | Memory buffer accumulates with backoff; WAL acts as overflow; auto-recovers when DB returns |
| Process crash | Memory buffer lost; Redis WAL retained; replayed atomically at next startup — each WAL entry claimed by exactly one pod via `GETDEL` |
| Redis down | WAL writes skipped silently; memory-only operation; events flush direct to DB |
| Both DB and Redis down | `log()` returns 503; no events accepted |

## REST API

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/event-log` | authedAdmin | Log an event |

### POST /event-log

**Headers:** `x-project-id: <projectId>` (omit for system-wide events)

**Body:**
```json
{
  "action": "survey.created",
  "userId": "abc123",
  "metadata": { "surveyId": "xyz" }
}
```

**Response:** `{ "id": "generated-event-id" }`

## Dead-Letter Queue

Events land in the DLQ when:
- They have failed `MAX_RETRIES_BEFORE_DLQ` consecutive flush attempts
- The per-project backlog queue overflows (`MAX_BACKLOG_QUEUE_SIZE` exceeded)

DLQ entries are stored in Redis with no TTL — they persist until retried or Redis is flushed.

The core edition exposes no endpoint to inspect or retry DLQ entries. `ServiceEventLog` provides the
health and DLQ methods, and a deployment can expose them over HTTP through an extension.

## Database Storage

- **Project events** (`projectId` present) → `event_log` table in `veysurProject_{projectId}` via the project dynamic datasource. See [project-databases.md](project-databases.md).
- **System events** (no `projectId`) → `event_log_system` table in the account database (`account` datasource).

## Migrations

Run once after deployment to create the system event log table in the account DB:

```bash
pnpm migrate
```

The project-scoped `event_log` table is created automatically when a project database is initialised — no separate migration needed.

## Key Files

- [events-catalogue.md](events-catalogue.md) — Full catalogue of all tracked event actions
- [ServiceEventLog.ts](../src/model/service/ServiceEventLog.ts) — Core service: buffers, flush logic, backoff, DLQ, health
- [RepoEventLog.ts](../src/model/repo/core/RepoEventLog.ts) — Project-scoped repo (`dataSource: 'project'`)
- [RepoEventLogSystem.ts](../src/model/repo/RepoEventLogSystem.ts) — System-wide repo (`dataSource: 'account'`)
- [endpoint/shared/event-log.ts](../src/endpoint/shared/event-log.ts) — Ingest endpoint
- [config/default.ts](../src/config/default.ts) — `app.eventLog` config block
