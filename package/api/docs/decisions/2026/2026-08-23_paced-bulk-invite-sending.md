# Pace bulk survey invite/reminder sending to protect mail reputation

**Status:** accepted
**Decided:** 2026-08-23
**Scope:** package/api, package/common

## Context

The mail relay handles both transactional email (verify, password reset) and project survey invitations/reminders. When an admin triggers a bulk
"send invites" or "send reminders" batch, all recipients were emailed essentially at
once. If a project's list has spam-trap or complaint issues, the entire batch went out
before any feedback-loop report could arrive — putting the shared mail relay's sender
reputation at risk for all projects, not just the offending one.

The goal is to spread a given project's invitation/reminder batch over several hours,
giving complaint reports time to surface, while still processing different projects'
backlogs fairly and allowing a specific project to be paused/controlled independently.

## Decision

Extend the existing `RepoEmail`/`ServiceEmail` with a queue state instead of building a
new mail-queue repo/service, and dispatch via the existing `ServiceTaskManager`
infrastructure:

- `RepoEmail` gains `status: 'pending' | 'sent' | 'error'` (default `'sent'`, so historical
  rows and untouched synchronous send paths are unaffected) and `scheduledAt`.
- `ServiceEmail.enqueue()` inserts a fully-resolved email as a pending row with a
  randomised `scheduledAt` inside a per-batch spread window; `ServiceEmail.send()` gains
  a `status` transition and an idempotency guard.
- `ServiceEmail.processQueue()`, run every 60s by a seeded `Task` record, dispatches due
  rows round-robin across projects, capped per project at
  `ceil(EMAIL_SEND_RATE_PER_HOUR / ticksPerHour)` rows per run, and gated by each
  project's existing pause/quota state.
- The enqueue-time spread window is sized dynamically per batch:
  `spreadWindowHours = batch.length / perProjectMaxPerHour`, so a small batch sends
  almost immediately and a large one is spread proportionally further.
- The per-project hourly send rate comes from `ServiceEmail.emailSendRatePerHour()`, which
  defaults to a flat finite limit (no "unlimited" option), since this exists purely to
  protect shared relay reputation. A deployment can override the method to supply its own
  rate per project.

Only the admin-triggered bulk paths (`ServiceSurveyParticipantEmail.send()`/
`.sendReminders()`) are changed. `ServiceAuthParticipant._sendRegistrationEmail()` and
`ServiceSurveyCompletionEmail.sendCompletionEmails()` stay synchronous — both are
single-participant-per-call, user-facing flows, not bulk campaigns.

See [../../mail-queue-pacing.md](../../mail-queue-pacing.md) for the operational detail.

## Rejected alternatives

| Alternative | Rejected because |
|-------------|-------------------|
| Postfix policy daemon (`check_policy_service`) | The protocol only exposes envelope metadata, never message headers/content, and doesn't support batched multi-recipient queries or a native "defer until timestamp" primitive. Per-project fairness/control would still need external state (Redis/API) and doesn't reduce complexity versus an app-level queue. |
| Postfix hold queue + header-based defer | Same "no defer-until timestamp" limitation; releasing held mail still needs an external poller (`postsuper -H`), just working against opaque queue files instead of a queryable DB table. |
| A brand-new `RepoMailQueue`/`ServiceEmailQueue` | Rejected in favour of extending the existing `RepoEmail`/`ServiceEmail`, since `RepoEmail` already logs every invite/reminder send (`projectId`, `type`, `to`, etc.) and no existing consumer treats "every row = sent" (`ServiceEmailEnforcement` already filters on `sent: { $gte }`), so it's safe to extend in place rather than duplicate. |

## Consequence

`SendInvitesResult.sent` was renamed to `queued` — a breaking response-shape change for
`POST /survey-participant/:surveyId/send-invites`/`/send-reminders`, updated in the
`appAdmin` frontend consumer alongside this change. Failed sends do not retry
automatically (matches prior synchronous behaviour); a transient SMTP failure
permanently skips that participant until an admin manually re-triggers, visible via
`RepoEmail.error` but not proactively alerted on. The enqueue-time spread window has no
maximum cap, so a very large campaign against a low rate limit can compute a
multi-day window — accepted as intended, since holding the configured rate is the whole
point regardless of campaign size.

## Related

- [mail-queue-pacing.md](../../mail-queue-pacing.md)
- [task-manager.md](../../task-manager.md)
