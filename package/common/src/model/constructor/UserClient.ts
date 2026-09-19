import { UserAccessToken } from './UserAccessToken'
export class UserClient {
  _id: string
  userId: string
  name: string
  system: string
  systemVersion: string
  buildNumber: string
  buildVersion: string
  userAgent: string
  notificationToken: string
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
  createdAt: Date
  updatedAt: Date

  static alias: string

  constructor(data) {
    if (typeof data == 'object') Object.assign(this, data)
  }
}

export default UserClient
