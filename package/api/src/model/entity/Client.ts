import { UserAccessToken, UserClient } from 'veysur-common'

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
  geo?: UserClient['geo']
  accessToken?: UserAccessToken[]
  createdAt?: Date
  updatedAt?: Date
}
