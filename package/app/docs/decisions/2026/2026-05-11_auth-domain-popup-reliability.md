# AuthDomain: Popup reliability under background-tab throttling

**Status:** superseded by [auth-domain-redirect-handoff](./2026-09-28_auth-domain-redirect-handoff.md)
**Decided:** 2026-05-11
**Scope:** package/app — `AuthDomainMessaging`, `AuthWaitingPopup`

## Context

- The auth-domain window is backgrounded while the popup is visible
- Browsers throttle `setTimeout` to ≥1 s (Firefox up to 15 s) in background tabs
- `pollTargetWindowReady` (100 × 100 ms) and `pollForAuthenticationComplete` (50 × 100 ms) both ran in the backgrounded window, turning a 15 s fallback into 2–5+ minutes
- If the popup closed before sending `auth-complete`, the poll exited without calling `finish()`, leaving the main window permanently stuck
- `AuthWaitingPopup` had no timeout, so users saw an indefinite spinner with no way to recover

## Decisions

1. Add a `window focus` event listener to `pollTargetWindowReady` that calls `proceed()` immediately when the main window regains focus (after ≥5 poll ticks as a minimum load guard).
2. Fix `pollForAuthenticationComplete` early-exit to call `finish()` instead of returning silently when the popup closes.
3. Add a 30 s timeout to `AuthWaitingPopup` that shows an error state with a "Close this window" button.

## Key reasons

- The happy-path `popup-ready` / `auth-complete` event messages are not throttled — only the fallback timers are affected. The `focus` listener restores near-instant recovery for the fallback case without touching the happy path.
- `finish()` on early popup close ensures the main window always navigates, even if auth data was not transferred.
- 30 s is generous enough to cover slow networks and heavy browser throttling while still being actionable.

## Rejected alternatives

| Alternative                                           | Rejected because                                                                                                                                                                                                                                                                |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `document.visibilitychange` instead of `window focus` | `focus` is more targeted: fires only when the user actively returns to the tab, not on every visibility change (e.g. OS task-switch without tab change). `BrowserInterface.addEventListener` wraps `window.addEventListener`, so `focus` works without extending the interface. |
| Reduce `maxAttempts` to shrink fallback window        | Makes the fallback too aggressive for slow page loads; doesn't fix throttling.                                                                                                                                                                                                  |
| Replace polling with `BroadcastChannel`               | Over-engineered; the event-based path already works in the non-throttled happy case.                                                                                                                                                                                            |
| Close popup from popup-side on timeout                | Would have triggered the `pollForAuthenticationComplete` early-exit bug (before fix 2) and left the main window stuck. With fix 2 in place this would work, but letting the user decide to close is better UX.                                                                  |

## Revisit when

- `Cross-Origin-Opener-Policy` headers are added to the admin app (would nullify `window.opener`, breaking the popup approach — requires a different auth transfer strategy).

## Related

- [`AuthDomainMessaging.ts`](../../../src/model/service/AuthDomain/AuthDomainMessaging.ts)
- [`AuthWaitingPopup.tsx`](../../../src/component/AuthWaitingPopup/AuthWaitingPopup.tsx)
- [`AuthDomain README`](../../../src/model/service/AuthDomain/README.md)
