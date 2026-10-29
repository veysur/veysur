import { Repo, RepoIndexBuilder as repib } from '@datacapy/server'
import { SurveyParticipantAttributeSnapshot } from 'veysur-common'

export class RepoSurveyParticipantAttributeSnapshot extends Repo<SurveyParticipantAttributeSnapshot> {
  constructor() {
    super({
      name: 'surveyParticipantAttributeSnapshot',
      dataSource: 'project',
      autoIndex: false,
      indexes: {
        snapshotId: repib.asc('snapshotId').unique(),
      },
    })
  }
}

export default RepoSurveyParticipantAttributeSnapshot
