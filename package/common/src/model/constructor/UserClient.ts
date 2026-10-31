import { UserAccessToken } from './UserAccessToken'
import { Infer } from '@datacapy/schema'
import { userClientShape } from '../schema/SchemaUserClient'
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
  Infer<typeof userClientShape>,
  'geo' | 'accessToken' | 'user'
> {}

export default UserClient
