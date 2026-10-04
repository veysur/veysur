# Realtime channel: socket.io with Redis, hint-only events

**Status:** accepted
**Decided:** 2026-10-04
**Scope:** package/api, package/app

## Context

`useNotifications` polled `/notification/list` every 15s while a data-transfer job was
pending. The job settles in the task-manager CronJob process, which has no HTTP server.
We want a generic push channel that can later carry other events.

## Decision

- socket.io with `@socket.io/redis-adapter` and `@socket.io/redis-emitter`, over SSE or raw
  `ws`, for rooms, reconnection and cross-pod fan-out.
- Redis is required in every deployed environment (core Compose already ships it). The
  no-Redis path exists only for local dev and tests.
- Events are hints `{ type, payload? }`; clients invalidate queries and REST stays the
  source of truth.
- Websocket transport only; handshake authenticated with the admin JWT and closed at `exp`.

## Consequences

- datacapy's `HttpServerManager` now creates the `http.Server` up front and destroys open
  connections on shutdown; `DataSourceRedis` gained `duplicate()`.
- Reverse proxies need a websocket `location /api/socket.io/`.
- Out of scope: collaborative editing, project/survey rooms, per-IP connection limits.

See [../../realtime.md](../../realtime.md).
