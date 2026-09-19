export type AclContext = {
  jwt?: {
    _id: string
    type?: string
    role?: string
    email?: string
    requiresTwoFactorSetup?: boolean
  }
  // Present on the participant auth strategy — identifies which survey/
  // participant a participant-scoped JWT belongs to.
  surveyId?: string
  participantId?: string
  projectId?: string
}

export type AclConditions = {
  projectAdmin?: string[]
}
