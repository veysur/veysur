import { SurveySnapshotPartial } from 'veysur-common'
import { Repo, TYPE_HINT_TIMESTAMP } from '@datacapy/server'

export class RepoSurveySnapshotPartial extends Repo<SurveySnapshotPartial> {
  constructor() {
    super({
      name: 'surveySnapshotPartial',
      dataSource: 'project', // Use dynamic datasource routing
      autoIndex: false,
      relations: {
        publications: {
          alias: 'publications',
          type: 'hasMany',
          repo: 'surveyPublication',
          key: 'snapshotId',
        },
        responseCount: {
          alias: 'responseCount',
          type: 'hasManyCount',
          repo: 'surveyResponse',
          pkey: '_id',
          key: 'snapshotId',
        },
        createdBy: {
          alias: 'createdBy',
          type: 'belongsToOne',
          repo: 'user',
          key: 'createdById',
          fields: {
            _id: 1,
            nameFirst: 1,
            nameLast: 1,
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
        contentHash: {
          spec: {
            surveyId: 1,
            contentHash: 1,
            createdAt: -1,
          },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
      },
    })
  }
}

export default RepoSurveySnapshotPartial
