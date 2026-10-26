import { SurveyParticipantAttribute } from 'veysur-common'
import { Repo, repib } from '@datacapy/server'

export class RepoSurveyParticipantAttribute extends Repo<SurveyParticipantAttribute> {
  constructor() {
    super({
      name: 'surveyParticipantAttribute',
      dataSource: 'project',
      autoIndex: false,
      indexes: {
        surveyId: repib.asc('surveyId').unique(),
      },
    })
  }
}

export default RepoSurveyParticipantAttribute
