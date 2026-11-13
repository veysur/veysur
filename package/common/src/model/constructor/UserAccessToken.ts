import moment from 'moment-timezone'
import { Infer } from '@datacapy/schema'
import type { AssertSchema } from '@datacapy/schema'
import {
  SchemaUserAccessToken,
  userAccessTokenSpec,
} from '../schema/SchemaUserAccessToken'

type Interval =
  'weeks' | 'days' | 'hours' | 'minutes' | 'seconds' | 'milliseconds'

export interface GeoInfo {
  country: string
  countryCode: string
  region: string
  regionCode: string
  city: string
  location: {
    type: 'Point' | string
    coordinates: [number, number]
  }
  timezone: string
}

/**
 * Describes the hand-written `SchemaUserAccessToken` so other generated schemas
 * can reference it. Not in `datacapy.config.json`'s `include`, so nothing is
 * generated from it; `AssertSchema` below keeps the two in step.
 *
 * @schema userAccessToken
 */
export interface UserAccessTokenData {
  token?: string
  ttl?: number
  ip?: string
  geo?: {
    country?: string
    countryCode?: string
    region?: string
    regionCode?: string
    timezone?: string
    city?: string
    location?: { type?: string; coordinates?: number[] }
  }
  createdAt?: Date
  expiresAt?: Date
}

const _checkUserAccessToken: AssertSchema<
  SchemaUserAccessToken,
  UserAccessTokenData
> = true
void _checkUserAccessToken

/** Fields come from {@link userAccessTokenSpec}. */
export interface UserAccessToken extends Infer<typeof userAccessTokenSpec> {}

export class UserAccessToken {
  static alias: string

  constructor(data) {
    if (typeof data == 'object') Object.assign(this, data)
  }

  isExpired() {
    return new Date() > this.expiresAt
  }

  getAge(interval: Interval = 'milliseconds', now?: Date) {
    interval = interval ? interval : 'milliseconds'
    now = now ? now : new Date()
    return Math.abs(
      this.createdAt
        ? moment(now).diff(moment(this.createdAt), interval, true)
        : 0,
    )
  }

  isNew(length: number = 15, interval: Interval = 'minutes', now?: Date) {
    return this.isNewerThan(
      length ? length : 15,
      interval ? interval : 'minutes',
      now,
    )
  }

  isNewerThan(length: number, interval: Interval = 'minutes', now?: Date) {
    return this.getAge(interval ? interval : 'minutes', now) < length
  }

  isOlderThan(length: number, interval: Interval = 'minutes', now?: Date) {
    return this.getAge(interval ? interval : 'minutes', now) > length
  }
}

export default UserAccessToken
