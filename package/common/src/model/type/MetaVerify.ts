export interface VerifyStatus {
  isVerified: boolean
  isVerifiedAt: Date | null
}

export interface VerifyToken {
  token: string
  ttl: number
  createdAt: Date
  expiresAt: Date
  failCount: number
}

export interface MetaVerify {
  status: VerifyStatus
  token: VerifyToken[]
}

export interface MetaHistoryItem {
  prevValue: string
  verifyStatus: VerifyStatus
  clientId: string
  createdAt: Date
}

export type MetaHistoryVerifiable = {
  verify: MetaVerify
  history: MetaHistoryItem[]
}
