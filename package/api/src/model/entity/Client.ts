import { GeoInfo, UserAccessToken } from 'veysur-common'

export interface Client {
  _id?: string
  userId?: string
  clientId?: string
  name?: string
  ip?: string
  system?: string
  systemVersion?: string
  buildVersion?: string
  buildNumber?: string
  userAgent?: string
  notificationToken?: string
  geo?: GeoInfo
  accessToken?: UserAccessToken[]
  createdAt?: Date
  updatedAt?: Date
}
