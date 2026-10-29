import { SurveyPublication } from 'veysur-common'
import { Repo, RepoRelationBuilder as relb, RepoIndexBuilder as repib } from '@datacapy/server'

export class RepoSurveyPublication extends Repo<SurveyPublication> {
  constructor() {
    super({
      name: 'surveyPublication',
      dataSource: 'project', // Use dynamic datasource routing
      autoIndex: false,
      relations: {
        snapshot: relb.belongsToOne('surveySnapshot').key('snapshotId'),
        responseCount: relb
          .hasManyCount('surveyResponse')
          .pkey('_id')
          .key('publicationId'),
        publishedBy: relb.belongsToOne('user').key('publishedById'),
      },
      indexes: {
        createdAt: repib.desc('createdAt').timestamp(),
        surveyPublished: repib
          .asc('surveyId')
          .asc('publishedAt')
          .timestamp('publishedAt'),
        snapshotId: repib
          .asc('snapshotId')
          .desc('createdAt')
          .timestamp('createdAt'),
        stoppedAt: repib
          .asc('surveyId')
          .desc('stoppedAt')
          .timestamp('stoppedAt'),
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
