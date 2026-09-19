import { SurveyPublication } from 'veysur-common'
import { Repo, TYPE_HINT_TIMESTAMP } from 'mzen-server'

export class RepoSurveyPublication extends Repo<SurveyPublication> {
  constructor() {
    super({
      name: 'surveyPublication',
      dataSource: 'project', // Use dynamic datasource routing
      autoIndex: false,
      relations: {
        snapshot: {
          type: 'one',
          repo: 'surveySnapshot',
          localField: 'snapshotId',
        },
        responseCount: {
          alias: 'responseCount',
          type: 'hasManyCount',
          repo: 'surveyResponse',
          pkey: '_id',
          key: 'publicationId',
        },
        publishedBy: {
          type: 'one',
          repo: 'user',
          localField: 'publishedById',
        },
      },
      indexes: {
        createdAt: {
          spec: { createdAt: -1 },
          options: { typeHint: TYPE_HINT_TIMESTAMP },
        },
        surveyPublished: {
          spec: { surveyId: 1, publishedAt: 1 },
          options: { typeHint: { publishedAt: TYPE_HINT_TIMESTAMP } },
        },
        snapshotId: {
          spec: { snapshotId: 1, createdAt: -1 },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
        stoppedAt: {
          spec: {
            surveyId: 1,
            stoppedAt: -1,
          },
          options: { typeHint: { stoppedAt: TYPE_HINT_TIMESTAMP } },
        },
      },
    })
  }

  async getActivePublication({ surveyId }) {
    return await this.findOne({
      surveyId,
      stoppedAt: null,
    })
  }

  async getPublicationsBySnapshot({ snapshotId }) {
    return await this.find({ snapshotId }, { sort: { createdAt: -1 } })
  }
}

export default RepoSurveyPublication
