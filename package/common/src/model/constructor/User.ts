import { genUniqueId } from 'mzen-id'

import { UserClient, Project, ProjectAdmin } from 'model/constructor'
import { MetaHistoryVerifiable, VerifyToken } from 'model/type'
import { PropsOf } from 'mzen-schema'

export class User {
  _id: string
  nameFirst: string
  nameLast: string
  email: string
  emailMeta: MetaHistoryVerifiable
  password: string
  passwordMeta: {
    reset: {
      token: VerifyToken[]
    }
  }
  billingAddress?: {
    line1?: string
    line2?: string
    city?: string
    state?: string
    postcode?: string
    country?: string
  }
  taxId?: string
  businessName?: string
  twoFactorSecret?: string
  twoFactorMeta?: {
    enabled: boolean
    enabledAt: Date | null
    prompt: { dismissed: boolean }
  }
  role: string
  stripeCustomerId?: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null // Timestamp when account was soft-deleted (null = active)
  deletionReminderSentAt?: Date | null // Set once the pre-purge reminder email has been sent for the current deletedAt
  anonymizedAt?: Date | null // Set once, permanently, when PII is scrubbed at the 1-month cutoff - the row is retained, never removed

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

export default User
