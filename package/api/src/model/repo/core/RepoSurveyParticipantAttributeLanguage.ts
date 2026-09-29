import { SurveyParticipantAttributeLanguage } from 'veysur-common'
import { Repo } from '@datacapy/server'

export class RepoSurveyParticipantAttributeLanguage extends Repo<SurveyParticipantAttributeLanguage> {
  constructor() {
    super({
      name: 'surveyParticipantAttributeLanguage',
      dataSource: 'project',
      autoIndex: false,
      indexes: {
        surveyParticipantAttributeLanguage: {
          spec: { surveyId: 1, languageCode: 1 },
          options: { unique: true },
        },
      },
    })
  }
}

export default RepoSurveyParticipantAttributeLanguage
