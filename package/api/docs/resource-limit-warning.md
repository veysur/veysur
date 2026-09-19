# Resource Limit Warning Email

ToS §4 gives a customer 1 month after downgrading or cancelling a paid plan to bring
Resource Usage within the new (Free) plan's limits, before the system "reserves the
right" to auto-delete oldest-to-newest resources. That automatic-deletion mechanism is
**not** implemented — this is only the 7-day warning email that precedes it.

## Trigger condition

The warning fires only if the project is **actually** over its new plan's limits when
the daily check runs — not merely because it downgraded. A project that downgrades but
stays within Free Plan limits never receives this email.

`ServiceUsageTracking.sendResourceLimitWarnings` (daily task):

1. Finds active `ProjectSubscription` rows on the Free plan whose `startedAt` is at
   least `P1M - P7D` in the past (i.e. within 7 days of the reduction period ending)
   and `resourceLimitWarningSentAt: null`.
2. For each, calls `isOverLimit` (shared with any future enforcement work) to compare
   current usage against the Free plan's `feature` limits.
3. Sends `resource-limit-warning` (listing which resource(s) exceed limits) and sets
   `resourceLimitWarningSentAt` **only if currently over limit**. If not over limit,
   the flag is left unset so a later breach before the cutoff is still caught by a
   subsequent run.

## Known limitation

`resourceLimitWarningSentAt` is designed to reset to `null` if usage later drops back
within limits, so a subsequent breach gets its own fresh warning (see the field comment
on `ProjectSubscription`). The current implementation does not yet perform that reset —
once sent, the flag stays set for the rest of the reduction period, so a project that
recovers and breaches again during the same period will not get a second email. Revisit
if re-firing on every breach turns out to matter in practice.

## Related

- No new endpoints or frontend UI — backend email job only.
- Actual automatic-deletion enforcement for over-limit resources after downgrade
  (ToS §4 item 3) remains an unbuilt, reserved right.
