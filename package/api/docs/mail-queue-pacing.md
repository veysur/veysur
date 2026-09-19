<!-- cspell:ignore jdoc -->

# Mail queue pacing

How bulk survey invite/reminder sends are spread over time to protect the shared mail
relay's sender reputation. See the [ADR](decisions/2026/2026-08-23_paced-bulk-invite-sending.md)
for the design rationale and rejected alternatives.

## Scope

Only the admin-triggered bulk paths go through the queue:
`ServiceSurveyParticipantEmail.send()` / `.sendReminders()`
(`POST /survey-participant/:surveyId/send-invites` / `/send-reminders`).

`ServiceAuthParticipant._sendRegistrationEmail()` and
`ServiceSurveyCompletionEmail.sendCompletionEmails()` remain synchronous — both send to a
single participant per call as part of a user-facing flow, not a bulk campaign.

## Mechanics

```
_sendEmail() (enqueue path)              processQueue() (dispatch path, every 60s)
        │                                            │
        ▼                                            ▼
ServiceEmail.enqueue()               RepoEmail.find({ status: 'pending',
  status: 'pending'                              scheduledAt: { $lte: now } })
  scheduledAt: now + random(spread)                  │
        │                                    round-robin per project,
        ▼                              capped at ceil(rate / ticksPerHour)
RepoEmail row persisted                              │
                                        (paced: sleep between attempts,
                                         spread evenly across the tick)
                                                      ▼
                                            ServiceEmail.send() (real dispatch)
                                              status: 'sent' | 'error'
                                              Project.emailDailySent += 1
                                              SurveyParticipant.inviteSentAt/
                                                reminderSentAt set
```

- **Enqueue** (`ServiceEmail.enqueue`) inserts a fully-resolved `RepoEmail` row with
  `status: 'pending'` and a `scheduledAt` drawn from a spread window sized to the batch:
  `spreadWindowHours = batch.length / perProjectMaxPerHour`. A small batch gets a short
  window and sends almost immediately; a large one spreads proportionally further. Each
  page of a multi-page send-invites/send-reminders call computes its own window from its
  own page size — consecutive pages chain closely enough in practice to hold the overall
  campaign near the target rate.
- `SurveyParticipant.inviteQueuedAt` / `reminderQueuedAt` are set at enqueue time;
  `inviteSentAt` / `reminderSentAt` are set later, by `processQueue`, on actual dispatch.
  The "who's due" query in `_sendEmail` excludes participants who are already queued, so
  re-invoking send-invites/send-reminders (or the frontend's `skip`/`batchSize`
  pagination) never double-enqueues.
- **Dispatch** (`ServiceEmail.processQueue`) runs every 60 seconds (seeded `Task` record,
  `task: 'email'`, `action: 'processQueue'`). It pulls a batch of due rows
  (`processBatchSize * 5` candidates, capped to `processBatchSize` dispatches per run),
  buckets them by project, and round-robins so no single project's backlog starves
  another project's queue.
- **Per-project rate cap**: each project is capped this run at
  `ceil(EMAIL_SEND_RATE_PER_HOUR / ticksPerHour)` rows, where `ticksPerHour = 60` (the
  task's 60s interval). This ties the dispatch-side ceiling directly to the same
  `EMAIL_SEND_RATE_PER_HOUR` value used to size the enqueue-time spread window, so the
  configured rate is an actual enforced ceiling, not just advisory scheduling.
- **Aggregate inter-row pacing**: the per-project cap above bounds each project's own
  volume, but says nothing about _how fast_ a run fires its dispatches. Normally this
  doesn't matter — few projects have due rows in any given tick. But if the relay or the
  task manager itself goes offline and recovers, many projects can become due
  simultaneously; without pacing, a run would fire up to `processBatchSize` (200) sends
  back-to-back in a few seconds, bursting the relay right when it may be most fragile.
  `processQueue` guards against this by spreading a run's dispatch attempts (success or
  failure — both are a real relay hit) evenly across the tick interval:
  `dispatchDelayMs = floor(tickIntervalMs / dispatchBudget)`, where `dispatchBudget` is
  the sum, over every project with due rows, of
  `min(dueRowsForProject, project's maxPerRun)` — i.e. what will actually be attempted
  this run, capped at `processBatchSize`. This is deliberately **not** the raw candidate
  count: a single backlogged project capped at a low `maxPerRun` (the common case — one
  project with a large backlog draining slowly over many ticks) must still be paced
  across the full tick, not treated as if all its due rows were about to fire. This is
  aggregate protection _on top of_, not instead of, the per-project cap — a run with few
  actual attempts is barely paced at all, while a run with many projects simultaneously
  hitting their caps is spread across close to the full 60s tick. See the
  [pacing ADR](decisions/2026/2026-08-24_mail-queue-dispatch-pacing.md) for why this
  lives at the API layer rather than the Postfix relay. One consequence: a full-batch run
  can now take close to 60s wall-clock instead of a few seconds, which can cause the
  _next_ scheduled tick to be skipped — see
  [task-manager.md](task-manager.md#concurrency-control).
- **Pause/quota gate — core has none.** Self-hosted's single project is a static,
  config-sourced value (see `model/service/ServiceProject.ts`), not a database row, so
  there is no `emailSendingPaused`/`emailDailyQuota`/`emailDailySent` concept in core at
  all — `ServiceEmail.processQueue` and `ServiceSurveyParticipantEmail._sendEmail`
  dispatch unconditionally, gated only by the `EMAIL_SEND_RATE_PER_HOUR` cap described
  below. This is a deliberate simplification (core has no `RepoProject`/multi-tenant
  project machinery — see `model/service/ServiceProject.ts`), not an oversight —
  self-hosted's mail volume is the operator's own concern.
- The cloud edition has its own per-project pause/quota enforcement layered on top of this
  same queue, implemented and tracked separately in the commercial package's own
  documentation — not covered here.

## Per-plan send-rate limits

A commercial edition may additionally cap the hourly send rate per plan tier, layered on
top of the queue pacing described above — tracked in the commercial package's own
documentation, not covered here.

## Configuration

`package/api/src/config/default.ts` under `mail.queue`:

| Config key                    | Env var                             | Default | Purpose                                    |
| ----------------------------- | ----------------------------------- | ------- | ------------------------------------------ |
| `mail.queue.processBatchSize` | `API_MAIL_QUEUE_PROCESS_BATCH_SIZE` | 200     | Max rows dispatched per `processQueue` run |

This is operational tuning (how much work one task run does), not a customer-facing
entitlement, so it stays flat config rather than a subscription feature.

## Manual troubleshooting (Tilt dev)

The scheduled task never fires on its own in Tilt dev (`taskManager.suspend: true` —
see [task-manager.md](task-manager.md#manual-triggering)). Trigger a dispatch run with:

```bash
# cd ./package/k8s
./scripts/task/run.sh --task email --action processQueue
```

This prints a full summary (`[MailQueue] N due candidate(s) found...` /
`Run complete: X dispatched, Y failed...`) — see task-manager.md's "Mail queue processing"
example for a full sample run. A run against a large backlog will now visibly take up to
~60s to complete (inter-row pacing, see Mechanics above) rather than finishing near-
instantly — this is expected, not a hang.

To inspect queue state directly, connect to MySQL (see
[database-access.md](../../k8s/docs/infrastructure/database-access.md)) and query the
`email` table's JSON document column, e.g.:

```sql
-- Pending rows for a project, in dispatch order
SELECT jdoc->>'$.to', jdoc->>'$.type', jdoc->>'$.scheduledAt'
FROM email
WHERE jdoc->>'$.projectId' = '<projectId>' AND jdoc->>'$.status' = 'pending'
ORDER BY jdoc->>'$.scheduledAt';
```

Per-row dispatch failures are recorded on `RepoEmail.error` (row stays `status: 'error'`,
not retried automatically) — visible via the query above but not proactively alerted on.

## How this relates to per-project daily quota and abuse pause

Queue pacing (this doc) only controls _when_ a project's queued batch sends, spread over
time — it is core, self-hosted-eligible, and independent of any per-project daily quota
or abuse-driven pause a given edition may layer on top. Those are a separate concern,
tracked in the commercial package's own documentation, not covered here.
