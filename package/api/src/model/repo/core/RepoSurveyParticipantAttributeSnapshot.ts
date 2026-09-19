import { Repo } from 'mzen-server'
import { SurveyParticipantAttributeSnapshot } from 'veysur-common'

export class RepoSurveyParticipantAttributeSnapshot extends Repo<SurveyParticipantAttributeSnapshot> {
  constructor() {
    super({
      name: 'surveyParticipantAttributeSnapshot',
      dataSource: 'project',
      autoIndex: false,
      indexes: {
        snapshotId: {
          spec: { snapshotId: 1 },
          options: { unique: true },
        },
      },
    })
  }
}

export default RepoSurveyParticipantAttributeSnapshot
