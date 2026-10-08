# Task Manager

Scheduled task execution system for recurring jobs like email sends and cleanup operations.

## Quick Start

```typescript
const repoTask = modelManager.getRepo<RepoTask>('task')

await repoTask.create({
  name: 'Delete Soft-Deleted Files',
  description: 'Permanently delete files soft-deleted more than 1 hour ago',
  enabled: true,
  start: new Date('2026-01-01T03:00:00.000Z'), // First run date
  interval: 3600, // 1 hour in seconds
  concurrency: 1, // Max 1 concurrent execution
  timeout: 30, // Minutes before timeout
  task: 'fileDeletion', // Service name
  action: 'hardDeleteAll', // Method name
  options: { olderThan: 'PT1H' },
})
```

Executes `modelManager.services.fileDeletion.hardDeleteAll(options, config)` hourly.

**Timezone note**: `start`/`interval` are plain UTC epoch math (`getCurrentSlot()` in `ServiceTaskManager.ts`) — there is no timezone-aware scheduling. A daily task anchored away from `00:00 UTC` can be used to guarantee it always runs after a specific calendar day (in some other timezone) has definitely started — see whichever service's own docs explain why it needs that margin, if any.

## Task Properties

| Property         | Type    | Default | Description                                                                                            |
| ---------------- | ------- | ------- | ------------------------------------------------------------------------------------------------------ |
| name             | string  | -       | Human-readable task name                                                                               |
| description      | string  | -       | Task description                                                                                       |
| enabled          | boolean | true    | Task can run                                                                                           |
| start            | Date    | -       | First run date                                                                                         |
| interval         | number  | -       | Seconds between runs                                                                                   |
| concurrency      | number  | 1       | Max concurrent executions                                                                              |
| timeout          | number  | 10      | Minutes before timeout                                                                                 |
| task             | string  | -       | Service name                                                                                           |
| action           | string  | -       | Service method name                                                                                    |
| options          | object  | {}      | Parameters passed to service                                                                           |
| failOnErrorCount | boolean | false   | Treat a run that resolves with `{ errors\|failed > 0 }` as a failed execution (see Soft failure below) |

## Adding a New Scheduled Task

Seed a `Task` record via a migration rather than creating it ad hoc — see `src/migrate/2026/02/2026-02-16_1200_seed-initial-tasks.ts` for the canonical example (it seeds the initial tasks). Follow the same pattern: insert one `Task` document per job with `task`/`action` pointing at an existing service method. See [database-migrations.md](database-migrations.md) for general migration mechanics (naming, running, dry-run).

## Architecture

```
task-manager loop (1min) → ServiceTaskManager.run()
                       ↓
          ┌────────────┼────────────┐
          ↓            ↓            ↓
     Monitor      Cleanup      Execute
     Timeouts    Old Logs     Drain due
```

**Phase 1: Monitor** — Detect and mark timed-out executions
**Phase 2: Cleanup** — Delete old execution records (keep last 10 successful, last 50 failed per task)
**Phase 3: Execute** — Drain due tasks in-process, bounded by a per-run task count
(`maxConcurrency`), a wall-clock budget (`TASK_RUN_BUDGET_MS`, 45s, checked before each
task so a running one is never interrupted), and the DB-wide running-execution guard.
Candidates run in `lateness()` order (time since last run as a multiple of the task's own
interval, most-behind first), so a run that hits its budget defers the tasks least harmed
by waiting.

**Key design decisions:**

- In-process execution (no separate pods)
- Drain, not one-per-tick. A one-task-per-run limit starved short-interval tasks:
  the 60s `email`/`processQueue` queue fell behind for 6 to 15 min at every hour boundary
  when a batch of hourly and `start`-anchored daily tasks came due together, tripping
  `task-stale`. The three budgets above cap resource use instead.
- Exponential backoff on failure (5min → 15min → 1h → 6h → 24h, then held at the
  24h cap). No task is ever auto-disabled — it keeps retrying, and the health alerts
  below keep firing, until the underlying issue is fixed or an operator sets
  `enabled: false` by hand
- **Soft failure** (`failOnErrorCount: true` tasks): when a task action resolves with
  `errors > 0` / `failed > 0` in its return shape, the execution is recorded as `failed`
  and the backoff counter advances, but the process exit stays `0` (the run is not
  treated as crashed). Opt-in per task via the `failOnErrorCount` field — currently set on
  `email`, `emailBounceProcessor`, and `mailCanary` (their actions report internal errors
  via the return shape rather than throwing). Tasks without it are exempt, for example one
  that returns a `failed` count for a single bad row on an otherwise healthy run and must
  not be backed off for that. Set it in the seed migration alongside
  `task`/`action`.

### Health alerts (BugSink → Slack)

The monitor phase raises a `captureException` (grouped by a stable fingerprint, so
Slack notifies once per episode) for:

| Fingerprint                 | Condition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `task-failing`              | any task has failed 2+ consecutive times — one failed run is treated as a transient blip and not alerted, so a real outage surfaces after ~2 intervals                                                                                                                                                                                                                                                                                                                                                                                                        |
| `task-persistently-failing` | any task has failed 6+ consecutive times and is pinned at the capped 24h backoff (higher-severity escalation of `task-failing`)                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `task-execution-timeout`    | a running execution exceeds its `timeout` and is killed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `task-stale`                | an enabled, not-backed-off task's `lastRunAt` is older than `max(2 × interval, 10 min)` **and** it stayed stale for one further scheduling cycle (`max(interval, 2 min)`). The 10-minute floor stops sub-minute-interval tasks (e.g. the 60s mail queue) from alerting on the tick gap a deploy causes while the `task-manager` container is recreated. The confirmation window suppresses a false alarm when a deploy resets a task's interval or clears its backoff; `staleSinceAt` is recorded on the first observation and cleared when the task next runs |

These depend on `BUGSINK_DSN` being set and the BugSink `veysur-api` project's Slack
alert being configured (see [error-tracking.md](error-tracking.md)).

## Task Lifecycle

```
[Created] → [Due] → [Running] → [Completed]
              ↓                      ↓
         [Backed Off]           [Next Run]
              ↑  ↓
         [Failed] → backoff grows to a 24h cap, then holds there
                    (never auto-disabled; alerts keep firing).
                    [Disabled] only via a manual enabled: false.
```

**Schedule calculation:**

- First run: `now >= task.start`
- Subsequent runs: `now >= lastRunAt + interval`

## Concurrency Control

| Level      | Configuration                             | Purpose                                                                        |
| ---------- | ----------------------------------------- | ------------------------------------------------------------------------------ |
| Global max | `config.taskManager.maxConcurrency: 5`    | Prevent overload; also the per-run task-count budget for the Phase 3 drain     |
| Per-task   | `Task.concurrency: 1`                     | Task-specific limit                                                            |

**Run duration vs. interval**: most tasks complete in well under a second, far shorter
than their interval. `email`/`processQueue` is an exception by design — under a large
backlog (e.g. right after a mail relay or task manager outage) it intentionally paces its
dispatches across close to its full 60s interval to avoid bursting the shared relay, see
[mail-queue-pacing.md](mail-queue-pacing.md). When a run overruns into the next
scheduled tick, `canStartTask()` finds the task still running (`concurrency: 1`) and
skips that tick — logged as "at concurrency limit", not an error, and
`consecutiveFailures` backoff is unaffected. Net effect: effective cadence during a large
recovery backlog can occasionally stretch to ~2x the interval for one tick, not a strict
60s.

The Phase 3 drain runs `email`/`processQueue` in the same tick as any hour-boundary batch
of quicker tasks, so the mail queue is no longer starved for minutes each hour. If a
never-cleared backlog of other work keeps hitting the 45s wall-clock budget, a low-lateness
task like the freshly-run mail queue can still slip a tick or two, but its `lateness()`
score climbs each tick it is skipped and pulls it to the front, so recovery is bounded to a
tick or two, well inside the `task-stale` threshold.

## Distributed Locking

`Task.concurrency` limits how many executions of the _same_ task run at once, but some tasks fan out work across independent resources (e.g. one export per survey) where two different tasks — or two overlapping runs of the same task — must never touch the same resource concurrently. `RepoTaskLock` provides that resource-level lock, independent of task concurrency.

```typescript
const acquired = await repoTaskLock.acquireLock(
  `export-survey-${surveyId}`, // lockKey — unique per resource
  executionId, // identifies the holder
  300, // ttlSeconds (default 300)
  'export', // resourceType
  surveyId, // resourceId
)
if (!acquired) return // another execution holds the lock

try {
  // ... do the work ...
} finally {
  await repoTaskLock.releaseLock(`export-survey-${surveyId}`, executionId)
}
```

- **Acquire**: creates the lock if none exists, takes it over if expired, or extends it if already held by the same `executionId`. Returns `false` if another live execution holds it.
- **Race safety**: relies on a unique index on `lockKey`; a duplicate-key error (`code 11000`) on insert is treated as "lost the race" and returns `false`.
- **Expiry**: locks are TTL-based (`expires`), not tied to process lifetime — a crashed holder's lock is simply taken over once expired.
- **Cleanup**: `cleanupExpiredLocks()` removes stale lock documents.

**Example**: a service handling a per-project recurring job can acquire a `<task>-project-<projectId>` lock before doing its work, so overlapping scheduler runs (e.g. a slow run plus the next minute's tick) can't process the same project twice.

## Failure Handling

| Failures | Backoff         | Status                                            |
| -------- | --------------- | ------------------------------------------------- |
| 1        | 5 min           | Enabled                                           |
| 2        | 15 min          | Enabled — `task-failing` alert fires              |
| 3        | 1 hour          | Enabled                                           |
| 4        | 6 hours         | Enabled                                           |
| 5        | 24 hours        | Enabled                                           |
| 6+       | 24 hours (held) | Enabled — `task-persistently-failing` alert fires |

No task is ever auto-disabled — the backoff is held at the 24h cap and the task
keeps retrying until the underlying issue is fixed or an operator sets
`enabled: false` by hand. See [Health alerts](#health-alerts-bugsink--slack) above.

Successful execution resets `consecutiveFailures` to 0.

The schedule is defined once as `BACKOFF_STEPS_MS` in `RepoTask.ts`.

## Configuration

**Scheduler** (`deploy/compose.yaml`): the `task-manager` service runs `node dist/run.js` with
`API_TASK=taskManager` and `API_ACTION=run` in a loop, once a minute, with a 600 second kill
timeout per run. A heartbeat file drives its healthcheck. The dev overlay (`compose.dev.yaml`)
disables the service, so in `pnpm dev` nothing runs on a schedule (see
[Manual triggering](#manual-triggering)).

**API (config/default.js):**

```javascript
module.exports = { taskManager: { maxConcurrency: 5 } }
```

## Monitoring

Run from `deploy/`:

```bash
# Service state and healthcheck
./scripts/veysur.sh status

# Logs
./scripts/veysur.sh logs task-manager
```

```typescript
// Recent executions
const executions = await repoTaskExecution.find(
  { taskName: 'Delete Soft-Deleted Files' },
  { sort: { started: -1 }, limit: 20 },
)
```

**Execution record fields:**

- `log` — console output captured during execution (`console.log/warn/error/info`), prefixed with `[level]`; `null` if no output
- `error` — error message string on failure; `null` on success

## Manual Triggering

Run any service action outside the scheduler by executing `run.js` in the running `api` container with
`API_TASK`, `API_ACTION` and optional `API_TASK_JSON` set. Useful for development testing and
production one-off fixes.

The quickest way: `pnpm dev:task -- <task> <action> [optionsJson]` from the repo root
(`deploy/scripts/task-run.sh` — detects dev vs. production stack automatically). For example:

```bash
pnpm dev:task -- dataTransferJob processQueue
```

Or run `docker compose exec` directly, from `deploy/`:

```bash
docker compose exec -T -e API_TASK=fileDeletion -e API_ACTION=hardDeleteAll api node dist/run.js
```

The dev stack runs the API from source, so use `pnpm exec tsx src/run.ts` in place of
`node dist/run.js`. **In the dev stack this is the only way anything runs**: the overlay disables
the `task-manager` service, so no task (mail queue processing, file cleanup, mail canary, and so on)
fires on its own.

For creating and managing the initial admin account, see
[admin-account-bootstrap.md](admin-account-bootstrap.md). It uses this same mechanism for a one-off
administrative action rather than a scheduled task.

**With options** (passed as JSON via `API_TASK_JSON`):

```bash
docker compose exec -T \
  -e API_TASK=fileDeletion -e API_ACTION=hardDeleteAll \
  -e API_TASK_JSON='{"olderThan": "P1W"}' \
  api node dist/run.js
```

**File cleanup**: regular files (soft-deleted more than a month ago) are deleted automatically, but
can be triggered manually. `olderThan` takes an ISO 8601 duration; for example `P1W` or `PT5M`.

**Temp file cleanup** (not automatic, must be triggered manually):
Temp files are often created for data export purposes and should be deleted once the file has downloaded.
We can't know exactly when the file finishes downloading so we preset the file deletion time
to some point in the future (6 hours).
To delete temp files with future deletion time use a negative duration (e.g. "-PT6H").

```bash
docker compose exec -T \
  -e API_TASK=fileDeletion -e API_ACTION=hardDeleteAll \
  -e API_TASK_JSON='{"olderThan": "-PT6H", "fileContext": "temp"}' \
  api node dist/run.js
```

**Mail queue processing**: dispatches due rows from the paced bulk invite/reminder queue (see
`mail-queue-pacing.md`). It runs automatically every 60s in a deployed stack, but never on its own in
the dev stack (see above).

```bash
docker compose exec -T -e API_TASK=email -e API_ACTION=processQueue api node dist/run.js
```

Both the task entrypoint and `processQueue()` itself log what they're doing, so a manual run prints a full trail:

```
[Task] Running email.processQueue
[MailQueue] 31 due candidate(s) found (batch cap 200)
[MailQueue] Project eYhnVnWh253Kt7K: rate 150/hour -> cap 3/run
[MailQueue] Run complete: 3 dispatched, 0 failed, 0 skipped (paused), 0 skipped (quota)
[Task] Completed email.processQueue: {"dispatched":3,"failed":0,"skippedPaused":0,"skippedQuota":0,"errors":[]}
```

This `[Task] Running <task>.<action>` / `[Task] Completed <task>.<action>: <result>` pair comes from `src/run.ts` itself, so it applies to every manual task invocation above, not just this one.

**Data transfer job processing**: compiles/runs due async survey export and import jobs
(`.vssp`/`.vssa`, which can carry embedded response/answer-option files, see
`docs/import-export/import-export-system.md`). Like the mail queue, needs no `RepoTaskLock`:
`concurrency: 1` on the seeded task already prevents overlapping runs. Runs automatically
every 15s in a deployed stack.

```bash
docker compose exec -T -e API_TASK=dataTransferJob -e API_ACTION=processQueue api node dist/run.js
```

**Notification cleanup**: deletes settled (read/dismissed) `Notification` rows once they've
aged past retention, and their related `DataTransferJob` row alongside them
(`ServiceNotification.cleanupOld()` - see
`docs/import-export/import-export-system.md#notifications`). Runs automatically every hour
in a deployed stack.

```bash
docker compose exec -T -e API_TASK=notification -e API_ACTION=cleanupOld api node dist/run.js
```

**Embed file repair**: rewrites missing embed files and stale pointers for live, embed-enabled surveys
(`ServiceSurveyEmbedArtefact.repairAll()` - see [embedded-surveys.md](embedded-surveys.md)), including surveys
published before embedding existed. Seeded by migration `2026-10-07_1000`, it runs daily in a deployed stack and
sets `failOnErrorCount`, so a run that repairs nothing but reports failures counts as failed.

```bash
docker compose exec -T -e API_TASK=surveyEmbedArtefact -e API_ACTION=repairAll api node dist/run.js
```

## Key Files

- [ServiceTaskManager.ts](../src/model/service/ServiceTaskManager.ts) — Main orchestration service
- [TaskHealthMonitor.ts](../src/model/service/TaskHealthMonitor.ts) — Stale detection, timeout alerts, failure back-off / BugSink escalation
- [RepoTask.ts](../src/model/repo/RepoTask.ts) — Task repository
- [RepoTaskExecution.ts](../src/model/repo/RepoTaskExecution.ts) — Execution tracking
- [RepoTaskLock.ts](../src/model/repo/RepoTaskLock.ts) — Distributed resource locking
- [Task.ts](../../common/src/model/constructor/Task.ts) — Task model
