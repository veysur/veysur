import { SurveyParticipantAttributeLanguage } from 'veysur-common'
import { Repo, RepoIndexBuilder as repib } from '@datacapy/server'

export class RepoSurveyParticipantAttributeLanguage extends Repo<SurveyParticipantAttributeLanguage> {
  constructor() {
    super({
      name: 'surveyParticipantAttributeLanguage',
      dataSource: 'project',
      autoIndex: false,
      indexes: {
        surveyParticipantAttributeLanguage: repib
          .asc('surveyId')
          .asc('languageCode')
          .unique(),
      },
    })
  }
}

export default RepoSurveyParticipantAttributeLanguage
