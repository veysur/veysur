import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.BUGSINK_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  release: process.env.npm_package_version,
  tracesSampleRate: 0,
  sendDefaultPii: true,
  enabled: !!process.env.BUGSINK_DSN,
})
