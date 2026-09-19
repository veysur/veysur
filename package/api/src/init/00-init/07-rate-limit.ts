import { Server } from 'mzen-server'
import { DataSourceRedis } from 'mzen-om'

import { app as appConfig } from 'config/default'
import { RateLimitRule } from 'config/types'
import { RedisRateLimiter } from 'service/rate-limit/RedisRateLimiter'

interface CompiledRule {
  regex: RegExp
  skip: boolean
  tierKey: string
  limit: number
  limiter?: RedisRateLimiter
}

/**
 * Compile a single rate limit rule, failing fast if a non-skipped rule is
 * missing limit/windowSeconds — silently defaulting them could otherwise
 * disable rate limiting on that path without anyone noticing.
 */
export function compileRule(rule: RateLimitRule, index: number): CompiledRule {
  const skip = rule.skip ?? false
  const tierKey = rule.tierKey ?? `r${index}`

  if (!skip && (rule.limit == null || rule.windowSeconds == null)) {
    throw new Error(
      `Rate limit rule "${tierKey}" (pattern: ${rule.pattern}) must define ` +
        'both limit and windowSeconds unless skip is true',
    )
  }

  return {
    regex: new RegExp(rule.pattern, 'i'),
    skip,
    tierKey,
    limit: rule.limit ?? 0,
    limiter: skip
      ? undefined
      : new RedisRateLimiter({
          limit: rule.limit as number,
          windowSeconds: rule.windowSeconds as number,
        }),
  }
}

const compiledRules: CompiledRule[] = appConfig.rateLimit.rules.map(compileRule)

const defaultLimiter = new RedisRateLimiter({
  limit: appConfig.rateLimit.default.limit,
  windowSeconds: appConfig.rateLimit.default.windowSeconds,
})

const allLimiters = [
  ...compiledRules
    .map((r) => r.limiter)
    .filter((l): l is RedisRateLimiter => !!l),
  defaultLimiter,
]

/**
 * Wire the Redis datasource into all limiters.
 * Called at stage 01-model-initialised after dataSources are available.
 */
export const initRateLimitRedis = async function (server: Server) {
  const redis =
    (server.modelManager.dataSources['cacheDb'] as DataSourceRedis) || null
  allLimiters.forEach((limiter) => limiter.init(redis))

  if (redis) {
    server.logger.info('Rate limiter initialized with Redis')
  } else {
    server.logger.info(
      'Rate limiter initialized (in-memory fallback, no Redis)',
    )
  }
}

/**
 * Register the rate limiting middleware on the router.
 * Called at stage 00-init. Redis is wired up separately at stage 01.
 *
 * Rules are evaluated in order from config/default.ts — first match wins.
 * Paths not matched by any rule fall through to the default tier.
 * To add limits for new paths, add a rule to appConfig.rateLimit.rules.
 */
export const initRateLimit = function (server: Server) {
  if (!appConfig.rateLimit.enabled) {
    return
  }

  server.router.use(async (req, res, next) => {
    // Skip CORS preflight — OPTIONS carries no payload risk
    if (req.method === 'OPTIONS') {
      return next()
    }

    const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown'

    for (const rule of compiledRules) {
      if (!rule.regex.test(req.path)) continue

      if (rule.skip) return next()

      const result = await rule.limiter!.check(`rl:${rule.tierKey}:${ip}`)
      res.set('X-RateLimit-Limit', String(rule.limit))
      res.set('X-RateLimit-Remaining', String(result.remaining))

      if (!result.allowed) {
        res.set('Retry-After', String(result.retryAfter))
        return res
          .status(429)
          .json({ error: 'Too many requests', retryAfter: result.retryAfter })
      }

      return next()
    }

    // Default tier — no rule matched
    const result = await defaultLimiter.check(`rl:gen:${ip}`)
    res.set('X-RateLimit-Limit', String(appConfig.rateLimit.default.limit))
    res.set('X-RateLimit-Remaining', String(result.remaining))

    if (!result.allowed) {
      res.set('Retry-After', String(result.retryAfter))
      return res
        .status(429)
        .json({ error: 'Too many requests', retryAfter: result.retryAfter })
    }

    next()
  })
}

export default initRateLimit
