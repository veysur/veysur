import { SurveyParticipant } from 'veysur-common/model/constructor'
import { Repo, ServerErrorBadRequest, relb, repib } from '@datacapy/server'

export class RepoSurveyParticipant extends Repo<SurveyParticipant> {
  constructor() {
    super({
      name: 'surveyParticipant',
      dataSource: 'project', // Use dynamic datasource routing
      autoIndex: false,
      relations: {
        surveyResponse: relb
          .hasOne('surveyResponse')
          .key('participantId')
          .pkey('_id')
          .keys({
            surveyId: 'surveyId',
          })
          .fields({
            completed: 1,
            completedAt: 1,
            participantId: 1,
            surveyId: 1,
          }),
      },
      indexes: {
        createdAt: repib.desc('createdAt').timestamp(),
        updatedAt: repib.desc('updatedAt').timestamp(),
        createdById: repib
          .asc('createdById')
          .desc('createdAt')
          .timestamp('createdAt'),
        surveyId: repib
          .asc('surveyId')
          .desc('createdAt')
          .timestamp('createdAt'),
        token: repib.asc('surveyId').asc('token').unique(),
        email: repib.asc('surveyId').asc('email').unique(),
        searchNameFirst: repib.asc('surveyId').asc('nameFirst'),
        searchNameLast: repib.asc('surveyId').asc('nameLast'),
      },
    })
  }

  async create(surveyData, options?) {
    const { isValid, errors } = await this.schema.validatePaths(surveyData)
    if (!isValid) {
      throw new ServerErrorBadRequest(errors)
    }

    await this.schema.applyFilters(surveyData)
    const surveyParticipant = new SurveyParticipant(surveyData)

    await this.insertOne(surveyParticipant, options)

    return surveyParticipant
  }
}

export default RepoSurveyParticipant
