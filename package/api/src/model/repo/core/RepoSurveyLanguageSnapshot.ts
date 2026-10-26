import { Repo, repib } from '@datacapy/server'
import { SurveyLanguageSnapshot } from 'veysur-common'

export class RepoSurveyLanguageSnapshot extends Repo<SurveyLanguageSnapshot> {
  constructor() {
    super({
      name: 'surveyLanguageSnapshot',
      dataSource: 'project',
      autoIndex: false,
      indexes: {
        snapshotLanguage: repib.asc('snapshotId').asc('languageCode').unique(),
      },
    })
  }
}

export default RepoSurveyLanguageSnapshot
