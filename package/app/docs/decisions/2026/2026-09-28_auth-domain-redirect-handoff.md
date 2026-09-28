# AuthDomain: Replace popup handoff with a server-side redirect handoff

**Status:** accepted
**Decided:** 2026-09-28
**Scope:** package/app — `AuthDomain`; package/api — new `authHandoff` service/endpoint
**Supersedes:** [auth-domain-popup-reliability](./2026-05-11_auth-domain-popup-reliability.md)

## Context

`AuthDomain` moved an authenticated session between domains (account ↔ project admin
subdomain ↔ platform domain) via a popup window and a two-phase `postMessage` handshake
(`popup-ready` → `{auth, rememberMe}` → `auth-complete`). Two real failures prompted this
change:

- The popup sometimes failed to close and redirect (a timing issue between the
  `auth-complete` message and the fallback poll/close) — partially addressed by the prior
  ADR, but never fully eliminated.
- Chrome on Android blocks the popup outright: `createAuthPopup` logs an error and returns
  `null`, with no fallback path — the cross-domain transfer simply fails.

The prior ADR's own "Revisit when" clause named a `Cross-Origin-Opener-Policy` header change
(which would null `window.opener`) as the trigger to replace the popup approach entirely.
Android popup-blocking is that same failure mode arriving from a different angle.

## Decision

Replace the popup with a server-side handoff:

1. The initiating domain mints a short-lived (60s TTL), single-use token via
   `POST /auth-handoff` — the server derives the session payload (`{ auth, rememberMe }`)
   entirely from the caller's own already-authenticated request (JWT/access-token), never
   from client-supplied input, so the endpoint is safe at `role: authedAdmin`.
2. The initiating domain does a plain top-level redirect to
   `<targetUrl>?auth-handoff=<token>`.
3. The target domain redeems the token via `POST /auth-handoff/redeem` (public,
   `role: all`, rate-limited) before rendering, and applies the returned payload directly to
   the query cache.

No popup, no `postMessage`, no `window.opener` dependency, no window-close race.

### Token store: Redis, not MySQL

The token is transient (60s), single-use, and needs no survey/project scoping — Redis
already provides native TTL and an atomic GET+DEL in one round-trip (`AuthHandoffStore`,
`src/service/auth-handoff/AuthHandoffStore.ts`, following `RedisRateLimiter`'s Lua-script
pattern), which a MySQL repo could only approximate with a find-then-update. Redis
reclaiming an expired key needs zero cleanup-task code, unlike a MySQL-backed record.

Unlike `RedisRateLimiter`/`RedisTwoTierCache` (both fail-open/degrade when Redis is
unavailable), `AuthHandoffStore` fails loud: a token minted on one pod must be redeemable
from a request that lands on a different pod, so a per-process in-memory fallback would
silently break multi-pod deployments.

### Frontend sequencing

`common/queryClient.ts` reads/clears the `veysur.authHandoff` localStorage key
**synchronously at module import time**, before React renders — this was how the popup flow
guaranteed auth was available before first render. The redirect handoff instead needs an
async network call (the redeem) to get that payload, which can't complete before a module's
top-level code runs on import — and in practice, importing `AuthDomain` itself (needed to
perform the redeem) already pulls in `queryClient.ts` via the `common` barrel before the
redeem call ever fires. Rather than fight the import graph, `consumeIncomingHandoffIfPresent()`
applies the redeemed payload directly via `queryClient.setQueryData(...)`, in addition to
writing the same shape to the `veysur.authHandoff` localStorage key (kept only for a
dev/e2e session-injection hook). Each
sub-app's bootstrap entry (`index.tsx`) awaits `consumeIncomingHandoffIfPresent()` before
`ReactDOM.createRoot(...).render(<App/>)`.

### What replaces `prepareTargetWindow()`'s secondary signal

`prepareTargetWindow()` did double duty: it opened the popup, and its side effect (a
non-null `AuthDomain.targetWindow`) let `useAuthLoginRedirect` tell a just-submitted "New
Login" apart from an already-authenticated page load (skip vs. show the "Continue" button).
With no popup, `AuthDomain.markLoginSubmitted()` / `consumeLoginJustSubmitted()` replaces
that signal directly — a plain flag set by the login/signup form's submit handler, consumed
once by the redirect effect. The UX split (New Login auto-proceeds; already-authenticated
requires a click) is preserved; only the popup-based mechanism is gone.

## Rejected alternatives

| Alternative | Rejected because |
|---|---|
| Patch the popup further (e.g. retry `window.open()`, detect the block and show a manual "open in new tab" link) | Doesn't fix Android Chrome's hard block, and still carries the COOP fragility the prior ADR flagged as a future breakage. |
| Cross-origin `fetch`/XHR from the initiating domain to redeem on the target domain's behalf before redirecting | Needs CORS on every target's API surface (dynamically, per-project subdomain) for no benefit — a top-level redirect after mint needs no CORS at all, since both the mint and redeem calls are same-origin to whichever domain makes them. |
| `BroadcastChannel` for the whole transfer | Same-origin only; does nothing for the actual cross-origin leg this ADR addresses (still used, unchanged, for the same-origin new-tab case — see `AuthBroadcastProvider`). |

## Revisit when

- If a future requirement needs the handoff to carry more than a bearer session (e.g.
  multi-factor step-up), reconsider whether a single-use token is still the right shape or
  whether a short-lived session cookie scoped to the redeem call would be safer.

## Related

- [`AuthDomain.ts`](../../../src/model/service/AuthDomain/AuthDomain.ts)
- [`AuthDomain README`](../../../src/model/service/AuthDomain/README.md)
- [`ApiAuthHandoff.ts`](../../../src/model/api/ApiAuthHandoff.ts)
- Backend: `external/veysur/package/api/src/model/service/ServiceAuthHandoff.ts`,
  `src/service/auth-handoff/AuthHandoffStore.ts`, `src/endpoint/shared/auth-handoff.ts`
- ADR: [auth-domain-popup-reliability](./2026-05-11_auth-domain-popup-reliability.md) (superseded)
