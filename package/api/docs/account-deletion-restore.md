# Account Deletion & Restore

Owner-initiated account deletion cascades to soft-delete every owned project and
revokes all sessions immediately. Because login is blocked for a soft-deleted user,
restore is the one unauthenticated, mutating endpoint in the platform — gated by an
emailed numeric code rather than a role — mirroring the design in
[project-deletion-restore.md](project-deletion-restore.md).

## Lifecycle

```
active --delete--> soft-deleted (deletedAt set) --anonymize (P1M)--> anonymized (anonymizedAt set)
                          |
                          +--restore (email + code)--> active
```

| Field | Meaning |
|---|---|
| `deletedAt` | Soft-deleted, restorable. `null` when active. Soft-delete on `RepoUser` means login (`findOne({ email })`) naturally excludes the account without extra checks. |
| `anonymizedAt` | PII scrubbed at the 1-month cutoff. The row is **never removed** — `RepoPayment.userId` and other accounting references must keep resolving. Once set, restore is rejected. |
| `accountDeletionMeta.restore.token` | Numeric restore code array, same token/fail-count/expiry shape as `passwordMeta.reset.token` (`ServicePassword`). |
| `deletionReminderSentAt` | Set once the 7-day pre-purge reminder has been sent; reset on delete/restore. |

## Deletion (`ServiceUser.deleteAccount`)

1. Validates the current password.
2. Soft-deletes every owned, non-deleted project via `ServiceProject.softDeleteProject`
   (the same helper `deleteProject` uses), tagging each with
   `deletedByAccountDeletionAt` so restore can select exactly these projects back —
   not ones the user separately deleted by hand.
3. Soft-deletes the user row.
4. `ServiceAuth.revokeAllForUser` expires every session (`UserClient`) for the user.
5. Emails a restore code (`account-deletion` template).

## Restore (`ServiceUser.restoreAccount`)

Unauthenticated, by email + code (`POST /user/restore`, `role: 'all'`):

1. Loads the user with `includeDeleted: true`; rejects with a distinct "permanently
   deleted" error if `anonymizedAt` is set.
2. Validates the code against `accountDeletionMeta.restore.token` — same
   fail-count/expiry logic as `ServicePassword.put`.
3. Rejects if not deleted or past the `P1M` cutoff.
4. Clears `deletedAt`, restores only projects tagged
   `deletedByAccountDeletionAt`, skipping (with a logged warning) any already past
   their own cutoff.

## Anonymisation (`ServiceUser.anonymizeAll`)

At the `P1M` cutoff (daily task), scrubs PII in place rather than removing the row:
`email` → `deleted-<userId>@deleted.invalid` (the `.invalid` TLD is reserved by
RFC 2606), `nameFirst`/`nameLast` → placeholder, `billingAddress`/`taxId` cleared,
`password`/`twoFactorSecret`/`twoFactorMeta`/restore tokens cleared. Any
commercial-edition-only identifiers on the user record (e.g. a payment provider customer
id) are that edition's own concern and not covered here. Any still soft-deleted owned
projects are left untouched — they purge independently via `ServiceProject.hardDeleteAll`.

## Endpoints

| Endpoint | Role | Notes |
|---|---|---|
| `POST /user/delete` | `authedAdmin` | |
| `POST /user/restore` | `all` | The one unauthenticated, mutating endpoint in this feature |

## Related

- Reminder task: `ServiceUser.sendDeletionReminders`, seeded by
  `2026-08-01_1200_seed-account-deletion-reminder-task.ts`. Generates a **fresh**
  restore code each time rather than reusing the original.
- Anonymise task: `ServiceUser.anonymizeAll`, seeded by
  `2026-08-01_1300_seed-anonymize-old-users-task.ts`, anchored a few hours after the
  project deletion reminder job to avoid same-tick races.
- [project-deletion-restore.md](project-deletion-restore.md) — the project-side
  restore feature this cascades into.
