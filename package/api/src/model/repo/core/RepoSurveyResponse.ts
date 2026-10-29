import { SurveyResponse } from 'veysur-common/model/constructor'
import { Repo, RepoRelationBuilder as relb, RepoIndexBuilder as repib } from '@datacapy/server'

export class RepoSurveyResponse extends Repo<SurveyResponse> {
  constructor() {
    super({
      name: 'surveyResponse',
      dataSource: 'project', // Use dynamic datasource routing
      autoIndex: false,
      relations: {
        participant: relb
          .belongsToOne('surveyParticipant')
          .key('participantId')
          .keys({
            surveyId: 'surveyId',
          }),
        publication: relb
          .belongsToOne('surveyPublication')
          .key('publicationId'),
        snapshot: relb.belongsToOne('surveySnapshot').key('snapshotId'),
      },
      indexes: {
        createdAt: repib.desc('createdAt').timestamp(),
        updatedAt: repib.desc('updatedAt').timestamp(),
        surveyId: repib
          .asc('surveyId')
          .desc('createdAt')
          .timestamp('createdAt'),
        snapshotId: repib
          .asc('snapshotId')
          .asc('surveyId')
          .desc('createdAt')
          .timestamp('createdAt'),
        publicationId: repib
          .asc('publicationId')
          .asc('surveyId')
          .desc('createdAt')
          .timestamp('createdAt'),
        participantId: repib
          .asc('participantId')
          .asc('surveyId')
          .asc('snapshotId')
          .desc('createdAt')
          .timestamp('createdAt'),
        sessionId: repib
          .asc('sessionId')
          .asc('surveyId')
          .asc('snapshotId')
          .desc('createdAt')
          .timestamp('createdAt'),
        mergeFromSnapshotId: repib
          .asc('merge.fromSnapshotId')
          .asc('surveyId')
          .desc('createdAt')
          .timestamp('createdAt'),
        completedAt: repib.desc('completedAt').timestamp('completedAt'),
        startedAt: repib.desc('startedAt').timestamp('startedAt'),
        completedStatus: repib.asc('surveyId').asc('completed'),
      },
    })
  }
}

export default RepoSurveyResponse
