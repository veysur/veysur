import { randomSessionId } from 'model/common/randomSessionId'

export class JwtParticipant {
  participantId: string
  sessionId: string
  type: string
  surveyId: string
  snapshotId: string
  publicationId: string
  projectId: string

  constructor(data) {
    if (typeof data == 'object') Object.assign(this, data)
    this.sessionId = this.sessionId || randomSessionId()
    this.type = 'participant'
  }
}

export default JwtParticipant
