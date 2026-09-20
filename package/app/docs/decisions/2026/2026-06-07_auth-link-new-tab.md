# AuthLink + BroadcastChannel: right-click "Open in new tab" for auth-gated links

**Status:** accepted  
**Decided:** 2026-06-07  
**Scope:** package/app: `AuthLink`, `AuthBroadcastProvider`, `PageLogin`

## Context

- Auth-gated navigation links (project domains, account navbar, platform navbar) were rendered as `<button>` or React Router `<Link>` elements
- Buttons have no `href`, so browsers cannot offer "Open in new tab" in the right-click menu
- React Router `<Link>` elements have an `href` but navigate to the SPA path, not the cross-domain target; a new tab would land on the wrong page
- A new tab has an empty sessionStorage, so even a correctly pointed link would land on the login page with no session

## Decisions

1. **`AuthLink` renders a real `<a href="/login?returnTo=<target>">`** so the browser's right-click menu works. Left-clicks are intercepted (`e.preventDefault()`) and handled directly: either `openProjectWithAuth` (cross-domain) or an `onNavigate` SPA callback (same-domain).
2. **`AuthBroadcastProvider`** mounts in the root of each app that uses same-origin `AuthLink` nav (currently account app and admin app) and responds to `REQUEST_AUTH` on the `veysur-auth` BroadcastChannel with the current session.
3. **`PageLogin` broadcasts `REQUEST_AUTH` on mount** when opened with `?returnTo` and no local session. If an existing tab responds within 500 ms, the Continue button is shown immediately.
4. **Same-origin `returnTo`**: `PageLogin` calls `queryClient.setQueryData([KEY_STATE_AUTH], broadcastAuth)` and sets a `sameOriginRedirect` state variable. On the next render, `isAuthed` is true and a declarative `<Navigate>` fires; auth state and route change land in the same render batch so `AuthGate` never sees `isAuthed=false`.

## Key reasons

- A real `href` is the only way to give browsers enough information to build the right-click menu. There is no JS API to add items to the native context menu.
- BroadcastChannel is same-origin only, so the session relay is no less secure than sessionStorage itself; no cross-origin data is exposed.
- Declarative `<Navigate>` (not imperative `navigate()`) for same-origin returns: an imperative call fires before the query cache update propagates to `useAuth`, causing `AuthGate` to see `isAuthed=false` for one render and redirect to the home path. Rendering `<Navigate>` in the same render cycle as the `setQueryData` call prevents this race.

## Rejected alternatives

| Alternative                             | Rejected because                                                                                                                                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `window.open(targetUrl)` on right-click | Browsers block `window.open` that isn't triggered by a direct user gesture; right-click is not a gesture on the page itself                                                                                   |
| Add `href` to existing `<button>`       | `<button href>` is not valid HTML; browser behaviour is undefined                                                                                                                                             |
| Store auth in localStorage for new tabs | localStorage auth data persists across sessions; sessionStorage isolation is intentional for security                                                                                                         |
| `postMessage` from opener to new tab    | The opener reference is unavailable when the tab is opened via right-click (no `window.opener`); see [BroadcastChannel vs. postMessage](../../auth-navigation.md#broadcastchannel-vs-postmessage)                |
| BroadcastChannel for popup signalling   | Rejected in [[auth-domain-popup-reliability]] as over-engineered for that case. Here the problem is different: the tab opened via right-click has no opener reference at all, so postMessage is not an option |

## Revisit when

- `Cross-Origin-Opener-Policy` headers restrict BroadcastChannel scope (unlikely: COOP only affects cross-origin openers, not same-origin broadcast)
- The auth domain and account app are ever split onto different origins (would break BroadcastChannel same-origin restriction)

## Related

- [`AuthLink.tsx`](../../../src/component/AuthLink/AuthLink.tsx)
- [`AuthBroadcastProvider.tsx`](../../../src/component/AuthBroadcastProvider/AuthBroadcastProvider.tsx)
- [`PageLogin.tsx`](../../../src/appAccount/page/PageLogin.tsx)
- [`AuthDomain README`](../../../src/model/service/AuthDomain/README.md)
- [Auth Navigation Flows](../../auth-navigation.md)
- [`auth-domain-popup-reliability`](2026-05-11_auth-domain-popup-reliability.md)
