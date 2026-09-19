# Error Tracking (BugSink / Sentry SDK)

The four SPAs use `@sentry/react` to capture unhandled errors and report them to the self-hosted BugSink instance. Each app has its own BugSink project and DSN.

## Projects

| App         | BugSink project   |
| ----------- | ----------------- |
| appAdmin    | `veysur-admin`    |
| appSurvey   | `veysur-survey`   |
| appAccount  | `veysur-account`  |
| appPlatform | `veysur-platform` |

## How DSNs are injected

DSNs are **compile-time constants** baked into the bundle by rsbuild's `define` option. They are read from CI environment variables at build time:

| Variable                      | App         |
| ----------------------------- | ----------- |
| `PUBLIC_BUGSINK_DSN_ADMIN`    | appAdmin    |
| `PUBLIC_BUGSINK_DSN_SURVEY`   | appSurvey   |
| `PUBLIC_BUGSINK_DSN_ACCOUNT`  | appAccount  |
| `PUBLIC_BUGSINK_DSN_PLATFORM` | appPlatform |

When a variable is absent or empty, `Sentry.init` runs with `enabled: false` — the SDK is a no-op. This is how dev and k3d builds disable tracking without any code changes.

## Dev behaviour

Error tracking is **disabled in dev** (Tilt / `pnpm dev:*`). The DSN env vars are not set, so `enabled: false` is passed automatically. No BugSink service runs locally.

## Testing in stage

To verify a DSN is wired up correctly, open the browser console on stage and run:

```js
throw new Error('test error')
```

The error should appear in BugSink within a few seconds.

## Error capture points

- **`PageError.tsx`** — React Router error element; calls `Sentry.captureException` via `useEffect` when an unhandled route error renders.
- **`Sentry.init`** — automatically installs a global `window.onerror` / `unhandledrejection` handler that captures all other uncaught errors.

## Related

- BugSink k8s deployment: [`package/k8s/docs/error-tracking.md`](../../k8s/docs/error-tracking.md)
- API error tracking: [`package/api/docs/error-tracking.md`](../../api/docs/error-tracking.md)
