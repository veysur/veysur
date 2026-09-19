import { SurveyParticipantAttribute } from 'veysur-common'
import { Repo } from 'mzen-server'

export class RepoSurveyParticipantAttribute extends Repo<SurveyParticipantAttribute> {
  constructor() {
    super({
      name: 'surveyParticipantAttribute',
      dataSource: 'project',
      autoIndex: false,
      indexes: {
        surveyId: {
          spec: { surveyId: 1 },
          options: { unique: true },
        },
      },
    })
  }
}

export default RepoSurveyParticipantAttribute
