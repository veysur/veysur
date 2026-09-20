# Error Tracking (BugSink / Sentry SDK)

The four SPAs use `@sentry/react` to capture unhandled errors and report them to a BugSink (or any Sentry-compatible) instance. Each app has its own project and DSN.

## Projects

| App         | BugSink project   |
| ----------- | ----------------- |
| appAdmin    | `veysur-admin`    |
| appSurvey   | `veysur-survey`   |
| appAccount  | `veysur-account`  |

## How DSNs are injected

DSNs are **compile-time constants** baked into the bundle by rsbuild's `define` option. They are read from CI environment variables at build time:

| Variable                      | App         |
| ----------------------------- | ----------- |
| `PUBLIC_BUGSINK_DSN_ADMIN`    | appAdmin    |
| `PUBLIC_BUGSINK_DSN_SURVEY`   | appSurvey   |
| `PUBLIC_BUGSINK_DSN_ACCOUNT`  | appAccount  |

When a variable is absent or empty, `Sentry.init` runs with `enabled: false` — the SDK is a no-op. This is how dev and self-hosted builds disable tracking without any code changes.

## Dev behaviour

Error tracking is **disabled in dev** (`pnpm dev` and `pnpm dev:*`). The DSN env vars are not set, so `enabled: false` is passed automatically. No BugSink service runs locally.

## Testing a deployment

To verify a DSN is wired up correctly, open the browser console on a build that has one and run:

```js
throw new Error('test error')
```

The error should appear in BugSink within a few seconds.

## Error capture points

- **`PageError.tsx`** — React Router error element; calls `Sentry.captureException` via `useEffect` when an unhandled route error renders.
- **`Sentry.init`** — automatically installs a global `window.onerror` / `unhandledrejection` handler that captures all other uncaught errors.

## Related

- API error tracking: [`package/api/docs/error-tracking.md`](../../api/docs/error-tracking.md)
