export interface LoggerLike {
  log: (...args: unknown[]) => void
  trace: (...args: unknown[]) => void
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

export interface LoggerOptions {
  config?: LoggerConfig
  logger?: LoggerLike
}

export interface LoggerConfig {
  redact?: Array<string | RegExp>
}

const isGetter = (obj, prop) => {
  return !!Object.getOwnPropertyDescriptor(obj, prop)['get']
}

export class Logger {
  static readonly DEFAULT_REDACT_PATTERNS: Array<string | RegExp> = [
    /password/i,
    /authorization/i,
    /token/i,
    /code/i,
    /private/i,
    /secure/i,
    /email/i,
    /phone/i,
    /postcode/i,
    /zipcode/i,
    /nameLast/i,
  ]

  config: LoggerConfig
  logger: LoggerLike

  constructor(options?: LoggerOptions) {
    options = options
      ? options
      : {
          config: { redact: [] },
          logger: null,
        }

    this.config = {
      redact: [],
    }
    this.config.redact = Array.isArray(options.config.redact)
      ? Logger.DEFAULT_REDACT_PATTERNS.concat(options.config.redact)
      : Logger.DEFAULT_REDACT_PATTERNS

    this.logger = options.logger ? options.logger : console
  }

  log(...values: unknown[]) {
    this.logger.log(...this.serializeAll(values))
  }

  trace(...values: unknown[]) {
    this.logger.trace(...this.serializeAll(values))
  }

  debug(...values: unknown[]) {
    this.logger.debug(...this.serializeAll(values))
  }

  info(...values: unknown[]) {
    this.logger.info(...this.serializeAll(values))
  }

  warn(...values: unknown[]) {
    this.logger.warn(...this.serializeAll(values))
  }

  error(...values: unknown[]) {
    this.logger.error(...this.serializeAll(values))
  }

  // Every argument is serialised, so `logger.error(message, err)` keeps `err`.
  serializeAll(values: unknown[]): unknown[] {
    return values.map((value) => this.serialize(value))
  }

  serialize(value, fieldName?) {
    return Logger.serialize(value, this.config.redact, fieldName)
  }

  static serialize(
    value: unknown,
    patterns: Array<string | RegExp> = Logger.DEFAULT_REDACT_PATTERNS,
    fieldName?: string,
  ): unknown {
    if (value instanceof Error) {
      const v = value as Error & Record<string, unknown>
      const error: Record<string, unknown> = {
        name: v.name ? v.name : null,
      }
      if (v.code) error.code = v.code
      if (v.ref) error.ref = v.ref
      if (v.userMessage) error.userMessage = v.userMessage
      if (v.message) error.message = v.message
      if (v.stack) error.stack = v.stack
      return error
    }
    const seen = new WeakSet()
    try {
      value = JSON.parse(
        JSON.stringify(value, (_key, val) => {
          if (typeof val === 'object' && val !== null) {
            if (seen.has(val)) return '[Circular]'
            seen.add(val)
          }
          return val
        }),
      )
    } catch {
      return String(value)
    }
    if (Array.isArray(value)) {
      value.forEach((aValue, aValueX) => {
        ;(value as unknown[])[aValueX] = Logger.serialize(aValue, patterns)
      })
    } else if (typeof value == 'object' && value) {
      Object.keys(value).forEach((key) => {
        if (isGetter(value, key)) return
        ;(value as Record<string, unknown>)[key] = Logger.serialize(
          (value as Record<string, unknown>)[key],
          patterns,
          key,
        )
      })
    } else if (fieldName && typeof value == 'string') {
      value = Logger.redactFieldValue(value, fieldName, patterns)
    }
    return value
  }

  static redactFieldValue(
    value: string,
    fieldName: string,
    patterns: Array<string | RegExp>,
  ): string {
    const matches = patterns.some(
      (redact) =>
        (redact instanceof RegExp && null !== fieldName.match(redact)) ||
        fieldName === redact,
    )
    return matches ? Logger.redactString(value) : value
  }

  static redactString(value: string): string {
    const redactChar = '█'
    const length = value.length
    if (length <= 4) {
      return redactChar.repeat(length)
    } else if (length <= 12) {
      return value.charAt(0) + redactChar.repeat(length - 1)
    } else if (length <= 24) {
      return value.substr(0, 2) + redactChar.repeat(length - 2)
    } else if (length <= 32) {
      return (
        value.substr(0, 2) +
        redactChar.repeat(8) +
        value.substr(length - 1 - 2, 2)
      )
    } else if (length <= 64) {
      return (
        value.substr(0, 4) +
        redactChar.repeat(8) +
        value.substr(length - 1 - 4, 4)
      )
    } else {
      return (
        value.substr(0, 8) +
        redactChar.repeat(8) +
        value.substr(length - 1 - 8, 8)
      )
    }
  }
}

export default Logger
