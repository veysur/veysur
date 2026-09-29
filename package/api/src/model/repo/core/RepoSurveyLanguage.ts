import { Repo } from '@datacapy/server'
import { SurveyLanguage } from 'veysur-common'

export class RepoSurveyLanguage extends Repo<SurveyLanguage> {
  constructor() {
    super({
      name: 'surveyLanguage',
      dataSource: 'project',
      autoIndex: false,
      indexes: {
        surveyLanguage: {
          spec: { surveyId: 1, languageCode: 1 },
          options: { unique: true },
        },
      },
    })
  }
}

export default RepoSurveyLanguage
