import moment from 'moment-timezone'

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

export class UserAccessToken {
  token: string
  ttl: number
  ip: string
  createdAt: Date
  expiresAt: Date
  geo?: GeoInfo

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
