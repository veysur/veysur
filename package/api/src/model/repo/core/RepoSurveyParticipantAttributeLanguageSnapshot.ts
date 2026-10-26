import { Repo, repib } from '@datacapy/server'
import { SurveyParticipantAttributeLanguageSnapshot } from 'veysur-common'

export class RepoSurveyParticipantAttributeLanguageSnapshot extends Repo<SurveyParticipantAttributeLanguageSnapshot> {
  constructor() {
    super({
      name: 'surveyParticipantAttributeLanguageSnapshot',
      dataSource: 'project',
      autoIndex: false,
      indexes: {
        snapshotLanguage: repib.asc('snapshotId').asc('languageCode').unique(),
      },
    })
  }
}

export default RepoSurveyParticipantAttributeLanguageSnapshot
