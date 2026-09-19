import { SurveyParticipant } from 'veysur-common/model/constructor'
import { Repo, ServerErrorBadRequest, TYPE_HINT_TIMESTAMP } from 'mzen-server'

export class RepoSurveyParticipant extends Repo<SurveyParticipant> {
  constructor() {
    super({
      name: 'surveyParticipant',
      dataSource: 'project', // Use dynamic datasource routing
      autoIndex: false,
      relations: {
        surveyResponse: {
          alias: 'surveyResponse',
          type: 'hasOne',
          repo: 'surveyResponse',
          key: 'participantId',
          pkey: '_id',
          keys: {
            surveyId: 'surveyId',
          },
          // Must include every composite-key field (surveyId, participantId),
          // not just the fields we want displayed - mzen-om matches related
          // docs back to their source doc via these fields *after* this
          // projection is applied, so omitting one breaks the match silently
          // (no error, the relation just never populates).
          fields: {
            completed: 1,
            completedAt: 1,
            participantId: 1,
            surveyId: 1,
          },
        },
      },
      indexes: {
        createdAt: {
          spec: { createdAt: -1 },
          options: { typeHint: TYPE_HINT_TIMESTAMP },
        },
        updatedAt: {
          spec: { updatedAt: -1 },
          options: { typeHint: TYPE_HINT_TIMESTAMP },
        },
        createdById: {
          spec: { createdById: 1, createdAt: -1 },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
        surveyId: {
          spec: {
            surveyId: 1,
            createdAt: -1,
          },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
        token: {
          spec: {
            surveyId: 1,
            token: 1,
          },
          options: { unique: true },
        },
        email: {
          spec: {
            surveyId: 1,
            email: 1,
          },
          options: { unique: true },
        },
        searchNameFirst: {
          spec: {
            surveyId: 1,
            nameFirst: 1,
          },
        },
        searchNameLast: {
          spec: {
            surveyId: 1,
            nameLast: 1,
          },
        },
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
