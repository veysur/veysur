import type { UserClient } from 'veysur-common'

export type AclContext = {
  jwt?: {
    _id: string
    type?: string
    role?: string
    email?: string
    requiresTwoFactorSetup?: boolean
    clientId?: string
    botRequired?: boolean | null
    botVerified?: boolean | null
  }
  // Present on the participant auth strategy — identifies which survey/
  // participant a participant-scoped JWT belongs to.
  surveyId?: string
  participantId?: string
  client?: Partial<UserClient>
  accessToken?: string
  snapshotId?: string
  publicationId?: string
  sessionId?: string
  projectId?: string
}

export type AclConditions = {
  projectAdmin?: string[]
}
