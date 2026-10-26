import { SurveySnapshotPartial } from 'veysur-common'
import { Repo, relb, repib } from '@datacapy/server'

export class RepoSurveySnapshotPartial extends Repo<SurveySnapshotPartial> {
  constructor() {
    super({
      name: 'surveySnapshotPartial',
      dataSource: 'project', // Use dynamic datasource routing
      autoIndex: false,
      relations: {
        publications: relb.hasMany('surveyPublication').key('snapshotId'),
        responseCount: relb
          .hasManyCount('surveyResponse')
          .pkey('_id')
          .key('snapshotId'),
        createdBy: relb.belongsToOne('user').key('createdById').fields({
          _id: 1,
          nameFirst: 1,
          nameLast: 1,
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
        contentHash: repib
          .asc('surveyId')
          .asc('contentHash')
          .desc('createdAt')
          .timestamp('createdAt'),
      },
    })
  }
}

export default RepoSurveySnapshotPartial
