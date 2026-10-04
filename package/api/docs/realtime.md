# Realtime channel

A generic push channel (socket.io) from the API to signed-in admins. Events are **hints**:
the client invalidates the matching `KEY_STATE_*` queries and REST stays the source of
truth, so a missed event is harmless. Today it replaces polling `/notification/list`.

## Wire format

- Path `/api/socket.io` (`REALTIME_SOCKET_PATH`), websocket transport only, so no sticky
  sessions. nginx forwards `/api/` unchanged and has a dedicated `location /api/socket.io/`
  (1h read timeout, `Upgrade` headers).
- Every server-to-client message is the `event` socket event carrying
  `{ type, payload? }` (`RealtimeEvent` in `veysur-common`). Type constants live beside it,
  e.g. `REALTIME_EVENT_NOTIFICATION_CHANGED`.
- Rooms: `user:{userId}` (`realtimeUserRoom`), joined automatically, and
  `survey:{projectId}:{surveyId}` (`realtimeSurveyRoom`), joined on request (see below).
  A project room is a reserved name, not built.

## Survey rooms

The survey editor sends `survey:join` / `survey:leave` with `{ projectId, surveyId }`
(answered with `{ ok }`). Join is refused unless the token's `project` map contains
`projectId`, the same check as the `projectAdmin` ACL role; the map is refreshed by
`auth:refresh`. `ServiceSurvey.patch` calls `emitSurveyChanged` after applying patches, which
sends `survey.changed` with `{ surveyId, originClientId }` to the room. `originClientId`
comes from the `X-Client-Id` request header (the sender's `RealtimeClient.clientId`), so the
client that saved skips its own echo. The editor refetches on the event and on every
reconnect, and no longer polls.

## Auth

The handshake sends `auth.token`, an admin JWT. `RealtimeAuthenticator` verifies it and
validates the `jwtAdmin` schema; anything else is rejected with `unauthorised`. The
connection is closed at the token's `exp`. The client sends `auth:refresh` with `{ token }`
(answered with `{ ok }`) after each JWT refresh, which must be the same user and moves the deadline.
Admin JWTs live 10 minutes, so `SocketProvider` refreshes the JWT just before expiry.

## Emitting

```typescript
await this.getService<ServiceRealtime>('realtime').emitToUser(
  userId,
  REALTIME_EVENT_NOTIFICATION_CHANGED,
)
```

With Redis (`cacheDb`), `ServiceRealtime` publishes through `@socket.io/redis-emitter`, so it
works from the task-manager worker (no `io` there) and reaches clients on any API pod via
the Redis adapter. Without Redis (local `pnpm dev:api`, unit tests) it uses the in-process
`io` or does nothing. Redis is required in every deployed environment. Emit failures are
logged, never thrown.

## Adding an event type

1. Add the constant to `veysur-common` (`src/realtime.ts`).
2. Call `emitToUser` after the DB write.
3. Add one row to the sub-app's invalidation map (`appAdmin/common/realtimeInvalidation.ts`).

Client-to-server messages go through `RealtimeGateway.registerHandler(type, handler)`.

## Shutdown

`io.close()` runs as a shutdown handler; datacapy then destroys remaining connections and
tolerates the already-closed server.
