import { Repo } from 'mzen-server'
import { SurveyParticipantAttributeLanguageSnapshot } from 'veysur-common'

export class RepoSurveyParticipantAttributeLanguageSnapshot extends Repo<SurveyParticipantAttributeLanguageSnapshot> {
  constructor() {
    super({
      name: 'surveyParticipantAttributeLanguageSnapshot',
      dataSource: 'project',
      autoIndex: false,
      indexes: {
        snapshotLanguage: {
          spec: { snapshotId: 1, languageCode: 1 },
          options: { unique: true },
        },
      },
    })
  }
}

export default RepoSurveyParticipantAttributeLanguageSnapshot
