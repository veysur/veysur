import { Repo } from 'mzen-server'
import { SurveyLanguageSnapshot } from 'veysur-common'

export class RepoSurveyLanguageSnapshot extends Repo<SurveyLanguageSnapshot> {
  constructor() {
    super({
      name: 'surveyLanguageSnapshot',
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

export default RepoSurveyLanguageSnapshot
