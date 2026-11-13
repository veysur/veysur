import { genUniqueId } from '@datacapy/id'

import { UserClient, Project, ProjectAdmin } from 'model/constructor'
import { Infer, PropsOf } from '@datacapy/schema'
import type { tags as t } from '@datacapy/schema'

import type { SchemaUser } from './User.schema'
import type { UserClientData } from './UserClient'
import { USER_ROLE_CUSTOMER, USER_ROLE_PLATFORM_ADMIN } from '../../constants'

export class User {
  updatedAt: Date

  // relations
  projectOwn?: PropsOf<Project>[]
  projectAdmin?: PropsOf<ProjectAdmin>[]
  client?: PropsOf<UserClient>[]

  static alias: string

  constructor(data) {
    if (typeof data == 'object') Object.assign(this, data)
    this._id = data?._id || genUniqueId()
  }

  getFullName() {
    return this.nameFirst + ' ' + this.nameLast
  }

  getShortName() {
    return this.nameFirst + ' ' + (this.nameLast ? this.nameLast[0] : '')
  }

  getInitials() {
    return this.nameFirst && this.nameLast
      ? this.nameFirst[0].toUpperCase() + this.nameLast[0].toUpperCase()
      : this.nameFirst
        ? this.nameFirst[0].toUpperCase()
        : this.nameLast
          ? this.nameLast[0].toUpperCase()
          : ''
  }

  hasRole(role) {
    const roles = Array.isArray(role) ? role : [role]
    return roles.indexOf(this.role) !== -1
  }
}

export interface User extends Omit<Infer<SchemaUser>, 'client'> {}

type InternalId = string & t.MaxLength<17>

type VerifyStatus = {
  isVerified: boolean & t.Required & t.Default<false>
  isVerifiedAt: (Date & t.Required & t.Default<null>) | null
}

type VerifyToken = {
  token?: string & t.PrivateValue
  ttl?: number
  createdAt?: Date
  expiresAt?: Date
  failCount?: number
}

type VerifyTokens = VerifyToken[] & t.ConstructCollection<'Collection'>

/**
 * The stored user. An extension adds its own fields by spreading
 * `new SchemaUser().builderFields()` into a schema of the same name.
 *
 * @schema user construct=User strict
 */
export interface UserData {
  _id: InternalId & t.Required
  nameFirst: string & t.Required & t.NotNull & t.MaxLength<64> & t.Trim
  nameLast: string & t.Required & t.NotNull & t.MaxLength<64> & t.Trim
  email: string &
    t.Required &
    t.NotNull &
    t.Email &
    t.MaxLength<255> &
    t.Lowercase &
    t.Trim
  emailMeta?: {
    verify?: { status?: VerifyStatus; token?: VerifyTokens }
    history?: {
      prevValue: string & t.Required & t.Trim
      verifyStatus?: VerifyStatus
      clientId: string & t.Required & t.Trim & t.PrivateValue
      createdAt: Date & t.Default<'now'>
    }[] &
      t.Private
  }
  password?: string & t.PrivateValue
  passwordMeta?: { reset?: { token?: VerifyTokens } } & t.Private
  twoFactorSecret?: string & t.PrivateValue & t.Encrypt
  twoFactorMeta?: {
    enabled: boolean & t.Default<false>
    enabledAt?: Date
    prompt?: { dismissed: boolean & t.Default<false> }
  }
  client?: UserClientData[] &
    t.Relation &
    t.Private &
    t.ConstructCollection<'Collection'>
  maxClients: (number & t.Default<null> & t.PrivateValue) | null
  role: string &
    t.OneOf<typeof USER_ROLE_CUSTOMER | typeof USER_ROLE_PLATFORM_ADMIN> &
    t.Default<typeof USER_ROLE_CUSTOMER>
  createdAt: Date & t.Default<'now'>
  deletedAt: (Date & t.Default<null>) | null
  deletionReminderSentAt: (Date & t.Default<null>) | null
  anonymizedAt: (Date & t.Default<null>) | null
}

export default User
