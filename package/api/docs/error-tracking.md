# Error Tracking (BugSink / Sentry SDK)

The API uses `@sentry/node` to capture unhandled exceptions and report them to the self-hosted BugSink instance (`veysur-api` project).

## Configuration

Set `BUGSINK_DSN` in the environment. It is included in the API ConfigMap and populated in `values-stage.yaml` / `values-prod.yaml` after BugSink is deployed.

When `BUGSINK_DSN` is empty (dev, k3d), `Sentry.init` runs with `enabled: false` — no network calls are made.

## Initialisation

`package/api/src/sentry.ts` calls `Sentry.init` and is imported as the first module in `run.ts`, before any application code runs.

## Error capture points

- **`unhandledRejection`** handler in `server.ts` — calls `Sentry.captureException` for unhandled promise rejections.
- **mzen-server request errors** — framework-level HTTP errors are handled by mzen-server internally; errors that propagate past all handlers trigger the `unhandledRejection` path.

To add explicit capture in a service method:

```ts
import * as Sentry from '@sentry/node'

try {
  // ...
} catch (error) {
  Sentry.captureException(error)
  throw error
}
```

## Related

- BugSink k8s deployment: [`package/k8s/docs/error-tracking.md`](../../k8s/docs/error-tracking.md)
- Frontend error tracking: [`package/app/docs/error-tracking.md`](../../app/docs/error-tracking.md)
