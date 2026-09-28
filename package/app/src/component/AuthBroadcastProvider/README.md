# AuthBroadcastProvider

An invisible provider that relays the current user's auth session to other same-origin tabs via the `BroadcastChannel` API. When a tab opens a login page in a new tab/window on the same origin, the new tab can request the existing session instead of going through a full re-authentication flow.

## API

```typescript
import {
  AuthBroadcastProvider,
  AUTH_BROADCAST_CHANNEL,
  AuthBroadcastMessage,
} from 'component/AuthBroadcastProvider'
```

- **`AuthBroadcastProvider`** - React component, takes no props, renders `null`
- **`AUTH_BROADCAST_CHANNEL`** - the channel name (`'veysur-auth'`)
- **`AuthBroadcastMessage`** - union of the two message types:
  - `{ type: 'REQUEST_AUTH' }` - sent by a new tab asking for an existing session
  - `{ type: 'AUTH_RESPONSE'; auth: AuthData }` - sent by an authenticated tab in response

## Usage

Mount once near the app root, alongside the other top-level providers (see `appAdmin/App.tsx` and `appAccount/App.tsx`):

```tsx
<AuthBroadcastProvider />
```

## How it fits the auth flow

While mounted, the provider listens for `REQUEST_AUTH` messages and, if the current tab has an `auth` session, replies with `AUTH_RESPONSE`.

`PageLogin` is the consumer: when opened in a new tab via a same-origin link, it broadcasts `REQUEST_AUTH` and waits up to 500ms. If an `AUTH_RESPONSE` arrives in time, that session is used directly (cache populated, redirect to target) - no auth domain round trip needed. If it times out, it falls back to `AuthDomain.handleAuth()`.

## Browser support

No-ops if `BroadcastChannel` is not available on `window`.

## Related

- [AuthDomain](../../model/service/AuthDomain/README.md) - cross-origin auth transfer via a server-side mint/redeem handoff
- [Auth Navigation Flows](../../../docs/auth-navigation.md), particularly [BroadcastChannel vs. postMessage](../../../docs/auth-navigation.md#broadcastchannel-vs-postmessage)
- ADR: [auth-link-new-tab](../../../docs/decisions/2026/2026-06-07_auth-link-new-tab.md)
