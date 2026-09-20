# Pace processQueue() dispatch attempts within a run, to prevent recovery bursts

**Status:** accepted
**Decided:** 2026-08-24
**Scope:** package/api

## Context

The queue design in [2026-08-23_paced-bulk-invite-sending.md](2026-08-23_paced-bulk-invite-sending.md)
caps each project's dispatch volume per `processQueue` run
(`ceil(EMAIL_SEND_RATE_PER_HOUR / ticksPerHour)`), and that cap holds even during a
backlog — a single project can never exceed its purchased rate regardless of how much is
queued.

What it doesn't cap is the _aggregate_ firing rate within a single run. In steady state
this is invisible: few projects have due rows in any given 60s tick. But if the mail
relay or the task manager itself goes offline and recovers, many projects can become due
simultaneously. `processQueue`'s dispatch loop had no delay between `await this.send(row)`
calls, so a run could fire up to `processBatchSize` (200) sends back-to-back in a few
seconds — bounded only by SMTP round-trip latency.

Whether this actually reaches recipients that fast depends on what sits between the API
and the outside world. Inspection of the Postfix relay config used at the time confirmed **no
outbound rate or concurrency limiting is configured at all** — only `message_size_limit`.
So there is no relay-side backstop: an API-side burst is a burst to recipient mail
servers, precisely the sender-reputation risk the whole queue system exists to prevent,
and it lands at the worst possible moment (immediately after the relay's own recovery).

## Decision

Spread each run's dispatch attempts evenly across the tick interval, instead of firing
them as fast as I/O allows:

```typescript
// expectedAttempts: sum, over allowed projects, of min(dueRows, project.maxPerRun) -
// NOT the raw candidate count. See "sized off actual attempts" below for why.
const dispatchBudget = Math.min(expectedAttempts, processBatchSize)
const dispatchDelayMs =
  dispatchBudget > 0 ? Math.floor(tickIntervalMs / dispatchBudget) : 0
// ...
await this.sleep(dispatchDelayMs) // between every attempted row, success or failure
```

This sits on top of, not instead of, the existing per-project cap and the global
`processBatchSize` ceiling — no existing gate changes. A small run (few due rows) is
barely paced; a full recovery-sized batch is spread across close to the full tick
interval. No new config surface was added: the tick interval is already an implicit
constant (`ticksPerHour = 60`) tied 1:1 to the seeded task's CronJob schedule, so it's
expressed as a single hardcoded `tickIntervalMs` rather than a tunable.

**Sized off actual attempts, not raw candidate count.** An earlier version of this
change sized `dispatchBudget` directly off `candidates.length` (the raw due-row count
across all projects). Manual testing against real seeded data caught the flaw: with one
project holding a 67-row backlog but capped at `maxPerRun: 3` by its rate limit (a
completely normal steady-state case, not even a multi-project burst), that formula
produced `floor(60_000 / 67) ≈ 895ms` between dispatches — paced for a 67-wide batch
that was never going to happen, when only 3 rows could ever be attempted that run. The
3 actual dispatches fired within ~2 seconds instead of spreading across the tick. Fixed
by summing each allowed project's `min(dueRows, maxPerRun)` instead - i.e. what the
per-project cap will actually let through this run.

See [../../mail-queue-pacing.md](../../mail-queue-pacing.md) for the operational detail.

## Rejected alternatives

| Alternative                                                                           | Rejected because                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reduce the per-project cap (`maxPerRun`)                                              | Doesn't address the actual mechanism — the global `processBatchSize` ceiling already bounds total dispatches per tick regardless of per-project caps, so a smaller per-project cap only redistributes the same burst across more projects, it doesn't slow the firing rate. It also permanently under-delivers a project's purchased `EMAIL_SEND_RATE_PER_HOUR` in normal (non-backlog) operation, to fix a problem that only shows up during recovery.                                                                    |
| Postfix `smtp_destination_rate_delay` / `default_destination_rate_delay`              | Paces delivery to a single _destination domain_, not our own aggregate outbound rate. A burst to 200 different recipient domains would still fire almost simultaneously — doesn't address the reported symptom.                                                                                                                                                                                                                                                                                                            |
| Postfix submission-side rate limiting (`smtpd_client_message_rate_limit` via `anvil`) | Would cap aggregate rate at the relay, which is the right axis, but works by issuing a `454 4.7.1` temporary rejection once a client exceeds the limit. `ServiceEmail.send()`/`processQueue()` currently treats any failure as permanent (`status: 'error'`, no retry — see the prior ADR's Consequence section). Without also teaching the API to distinguish a 4xx defer from a real failure and retry, this would silently convert "paced a bit slower" into "never sent" — worse than the bug it fixes.                |
| Lowering Postfix's SMTP delivery agent concurrency (`process_limit` in `master.cf`)   | A blunt, relay-wide throttle (not time-based pacing — a burst of fast connections can still clear quickly) that would apply to everything through that relay. Scoping it to the survey-pool relay hosts (`mail1`/`mail2.veysur.com`, separate from transactional `mail.veysur.com`) avoids delaying password-reset/verification email, so it remains a reasonable _complementary_ hardening layer, but on its own doesn't give the precise, project-cap-aware pacing the API layer already has full visibility to compute. |

## Consequence

A full-batch `processQueue` run can now take close to `tickIntervalMs` (60s) wall-clock
instead of a few seconds. Since the task's `concurrency: 1` prevents overlapping runs,
this means the _next_ scheduled tick can find the task still running and be skipped
(logged as "at concurrency limit", not an error — `consecutiveFailures` backoff is
unaffected). Effective cadence during a large recovery backlog can therefore occasionally
stretch to ~2x the interval for one tick — see
[task-manager.md](../../task-manager.md#concurrency-control). This is an accepted
trade-off: a slightly slower catch-up is preferable to bursting the relay at the moment
it's most fragile.

## Related

- [mail-queue-pacing.md](../../mail-queue-pacing.md)
- [task-manager.md](../../task-manager.md)
- [2026-08-23_paced-bulk-invite-sending.md](2026-08-23_paced-bulk-invite-sending.md)
