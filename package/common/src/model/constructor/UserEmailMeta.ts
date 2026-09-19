export class UserEmailMetaVerifyStatus {
  isVerified: boolean
  isVerifiedAt: Date | null
}

export class UserEmailMetaVerify {
  status: UserEmailMetaVerifyStatus
  token: unknown[]
}

export class UserEmailMetaHistory {
  prevValue: string
  verifyStatus: UserEmailMetaVerifyStatus
  clientId: string
  createdAt: Date
}

export class UserEmailMeta {
  verify: UserEmailMetaVerify
  history?: UserEmailMetaHistory[]

  static alias: string

  constructor(data: Partial<UserEmailMeta> = {} as UserEmailMeta) {
    this.verify = data.verify ?? {
      status: { isVerified: false, isVerifiedAt: null },
      token: [],
    }
    this.history = Array.isArray(data.history) ? data.history : []
  }

  get isVerified() {
    return this.verify?.status?.isVerified ?? false
  }

  historyGetPrevious() {
    return this.history && this.history.length >= 2
      ? this.history[this.history.length - 2]
      : null
  }
}

export default UserEmailMeta
