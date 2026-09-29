import util from 'util'
import * as Sentry from '@sentry/node'
import { Server } from '@datacapy/server'
import { Logger, LoggerLike } from 'veysur-common'

interface EndpointErrorLogDetails {
  handled?: boolean
  statusCode?: number
  errorName?: string
  errorMessage?: string
  errorStack?: string
}

const isEndpointErrorLogDetails = (
  value: unknown,
): value is EndpointErrorLogDetails =>
  typeof value === 'object' && value !== null && 'handled' in value

// @datacapy/server's ErrorHandler logs every endpoint error but never reports it to
// Sentry/BugSink itself. `handled: false` marks errors with no matching
// responseErrorConfig - i.e. unexpected errors that fell through to the
// generic 500 response - these are the real bugs worth alerting on.
//
// Some endpoints also declare a blanket `Error: { http: { code: 500 } }`
// catch-all in their responseErrorConfig (see package/api/src/endpoint/
// shared/project.ts, shared/user.ts, core/file.ts). That makes any plain
// Error match and set `handled: true`, even though the client still gets a
// 500 - these are genuine bugs too, just hidden from the `handled` flag. So
// we also capture whenever the resolved HTTP status is a server error
// (>= 500), regardless of `handled`. Expected business errors mapped to
// 4xx codes (validation errors, etc.) are still excluded so they don't flood
// BugSink with noise.
export const createSentryTransport = (): LoggerLike => ({
  log: (...args) => console.log(...args),
  trace: (...args) => console.trace(...args),
  debug: (...args) => console.debug(...args),
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => {
    console.error(...args)

    const [value] = args
    if (isEndpointErrorLogDetails(value)) {
      const isServerError =
        value.handled === false ||
        (typeof value.statusCode === 'number' && value.statusCode >= 500)

      if (isServerError) {
        const err = new Error(value.errorMessage ?? 'Unknown error')
        err.name = value.errorName ?? 'Error'
        if (value.errorStack) err.stack = value.errorStack
        Sentry.captureException(err)
      }
    }
  },
})

export const initLogger = function (server: Server) {
  // Set the default depth to null to remove the recursion limit.
  // All  subsequent console.log() and console.dir() calls will use this default.
  util.inspect.defaultOptions.depth = 10

  server.setLogger(
    new Logger({ logger: createSentryTransport(), config: { redact: [] } }),
  )
}

export default initLogger
