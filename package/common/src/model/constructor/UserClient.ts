import type { tags as t } from '@datacapy/schema'
import { UserAccessToken, UserAccessTokenData } from './UserAccessToken'
import { Infer } from '@datacapy/schema'
import type { SchemaUserClient } from './UserClient.schema'
export class UserClient {
  geo?: {
    country: string
    countryCode: string
    region: string
    regionCode: string
    city: string
    location: {
      type: string
      coordinates: [number, number] // [lon, lat]
    }
    timezone: string
  }
  accessToken: UserAccessToken[]
  static alias: string

  constructor(data) {
    if (typeof data == 'object') Object.assign(this, data)
  }
}

// Written out by hand, not inferred: `geo` has optional parts in the schema
// but a complete shape here, and `accessToken` is a relation to a class.
export interface UserClient extends Omit<
  Infer<SchemaUserClient>,
  'geo' | 'accessToken' | 'user'
> {}

export default UserClient

/** @schema userClient */
export interface UserClientData {
  _id: string & t.Required
  userId: string & t.Required
  user?: unknown & t.Relation
  name: (string & t.MaxLength<300> & t.Trim & t.Default<null>) | null
  system: (string & t.MaxLength<40> & t.Trim & t.Default<null>) | null
  systemVersion: (string & t.MaxLength<40> & t.Trim & t.Default<null>) | null
  buildNumber: (string & t.MaxLength<40> & t.Trim & t.Default<null>) | null
  buildVersion: (string & t.MaxLength<40> & t.Trim & t.Default<null>) | null
  userAgent: (string & t.MaxLength<1024> & t.Trim & t.Default<null>) | null
  notificationToken:
    | (string & t.MaxLength<1024> & t.Trim & t.Default<null>)
    | null
  geo?: {
    country?: string
    countryCode?: string
    region?: string
    regionCode?: string
    timezone?: string
    city?: string
    location?: { type?: string; coordinates?: number[] }
  }
  accessToken?: UserAccessTokenData[] &
    t.ConstructCollection<'Collection'> &
    t.Private
  createdAt: Date & t.Default<'now'>
  updatedAt: Date & t.Default<'now'>
}
