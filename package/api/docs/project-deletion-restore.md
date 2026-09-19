# Project Deletion & Restore

Owner-initiated project deletion soft-deletes the project row and gives the owner a
1-month self-service restore window before the project is permanently purged, per
`terms-of-service.md` §5.

## Lifecycle

```
active --delete--> soft-deleted (deletedAt set) --purge (P1M)--> anonymized (anonymizedAt set)
                          |
                          +--restore--> active
                          |
                          +--hard-delete (immediate)--> anonymized
```

| Field | Meaning |
|---|---|
| `deletedAt` | Soft-deleted, restorable. `null` when active. |
| `anonymizedAt` | Permanently purged — survey/response data gone, row kept as an accounting reference only (`RepoPayment.projectId` still resolves). Once set, restore is rejected. |
| `deletedByAccountDeletionAt` | Set only when the project was soft-deleted as part of cascading account deletion (see the account-deletion doc), so account restore can select exactly the projects it cascade-deleted. `null` for a standalone project deletion. |
| `deletionReminderSentAt` | Set once the 7-day pre-purge reminder has been sent for the current `deletedAt`; reset to `null` on delete/restore so a later deletion gets a fresh reminder cycle. |

## Billing

`ServiceProject.softDeleteProject()` (the shared helper used by both owner-initiated
`deleteProject` and the account-deletion cascade) calls
`ServiceProjectSubscription.queueFreeOnDeletion()`, which queues a future-dated FREE
downgrade using the same mechanism as self-service "Cancel Subscription"
(`scheduleChange`) — a new `ProjectSubscription` row starting at the current plan's
`payment.dueNextAt`, tagged `queuedOnDelete: true`. **The active (paid) row itself is
never touched** — deletion doesn't cut short a period the customer already paid for.
No row is queued if the project is already FREE, or if a scheduled change already
exists (e.g. the owner had already cancelled themselves before deleting) — deletion
never clobbers or duplicates a pending change. `ServicePaymentScheduler` excludes
soft-deleted projects from processing entirely, so the customer is never charged
during the restore window regardless.

**Restore** (`ServiceProjectSubscription.resolveDeletionQueuedChange`, called from
`restoreProject`) looks for a pending scheduled row:
- None → nothing to do, the active subscription (paid or FREE) was never touched.
- The active row's `payment.dueNextAt` has already lapsed (the paid period genuinely
  ended while the project sat deleted, and — because deleted projects are excluded
  from `ServicePaymentScheduler` — that transition was never applied) → finalize it
  now via `activateScheduledSubscription`, regardless of `queuedOnDelete`. This
  applies equally to a deletion-triggered queue and the owner's own prior scheduled
  change that simply came due while deleted.
- Not lapsed and `queuedOnDelete: true` → delete the queued row, undoing the
  deletion-triggered downgrade; the paid row was never touched, so it just continues.
- Not lapsed and `queuedOnDelete: false` (the owner's own scheduled change, not yet
  due) → left alone.

A failure here is caught and logged, never propagated — it must not block the
project restore itself.

## Purge (`purgeProject`)

At the `P1M` cutoff (`ServiceProject.hardDeleteAll`, daily task) or immediately on
request (`ServiceProject.hardDeleteProject`, owner-triggered "Delete permanently"):

1. Drops the per-project database — survey/response data is irreversibly gone.
2. Anonymises the row in place rather than removing it: `subdomain`/`domain` are
   rewritten to a synthetic, guaranteed-unique placeholder (freeing the original for
   immediate reuse), `name` is replaced with a fixed placeholder, `anonymizedAt` is set.
3. Invalidates the subdomain and datasource caches.

The row is never hard-deleted — `RepoPayment` (root/default datasource) references
`projectId` independently of the per-project database, so removing the row would dangle
that reference.

## Endpoints

| Endpoint | Role | Notes |
|---|---|---|
| `POST /project/:projectId/restore` | `authedAdmin` | See role note below |
| `GET /project/deleted` | `authedAdmin` | Caller's own soft-deleted, non-anonymised projects |
| `POST /project/:projectId/hard-delete` | `authedAdmin` | Requires the project to already be soft-deleted |

**Role note**: these use `authedAdmin` rather than the usual `projectOwner` role for
project-scoped endpoints (see `mzen-acl.md`). `projectOwner` is derived from the JWT's
`project` map, which is populated from the owner's *non-deleted* `projectOwn` relation
(`ServiceAuthDirect.createJsonWebToken`) — a soft-deleted project drops out of that map
on the very next JWT refresh (the frontend calls `authRefresh(true)` right after
deleting), which would lock the owner out of restoring it. Ownership is verified
explicitly inside `ServiceProject.restoreProject`/`hardDeleteProject` instead.

## Related

- Account deletion cascades into this via `deletedByAccountDeletionAt` — see the
  account-deletion-restore plan for how account restore selects cascade-tagged projects.
- Reminder task: `ServiceProject.sendDeletionReminders`, seeded by
  `2026-08-01_1100_seed-project-deletion-reminder-task.ts`.
