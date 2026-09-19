# Decisions — package/api

Decisions scoped to the API package. Cross-cutting decisions spanning multiple packages
live in the repo root's `docs/decisions/`.

| Date       | Decision                                                                                            | Summary                                                                                                                                                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-23 | [Paced bulk invite/reminder sending](2026/2026-08-23_paced-bulk-invite-sending.md)                  | Bulk survey invite/reminder batches are enqueued as pending `RepoEmail` rows with a randomised `scheduledAt` and dispatched by a per-project rate-limited `ServiceTaskManager` task, instead of sending the whole batch at once |
| 2026-08-24 | [Pace processQueue() dispatch attempts within a run](2026/2026-08-24_mail-queue-dispatch-pacing.md) | `processQueue()` spreads its dispatch attempts evenly across the tick interval, preventing an aggregate burst to the mail relay when many projects are simultaneously backlogged (e.g. right after an outage)                   |
