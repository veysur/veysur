import { Repo, repib } from '@datacapy/server'
import { SurveyLanguage } from 'veysur-common'

export class RepoSurveyLanguage extends Repo<SurveyLanguage> {
  constructor() {
    super({
      name: 'surveyLanguage',
      dataSource: 'project',
      autoIndex: false,
      indexes: {
        surveyLanguage: repib.asc('surveyId').asc('languageCode').unique(),
      },
    })
  }
}

export default RepoSurveyLanguage
