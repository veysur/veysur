import { SurveyResponse } from 'veysur-common/model/constructor'
import { Repo, TYPE_HINT_TIMESTAMP } from '@datacapy/server'

export class RepoSurveyResponse extends Repo<SurveyResponse> {
  constructor() {
    super({
      name: 'surveyResponse',
      dataSource: 'project', // Use dynamic datasource routing
      autoIndex: false,
      relations: {
        participant: {
          alias: 'participant',
          type: 'belongsToOne',
          repo: 'surveyParticipant',
          key: 'participantId',
          keys: {
            surveyId: 'surveyId',
          },
        },
        publication: {
          alias: 'publication',
          type: 'belongsToOne',
          repo: 'surveyPublication',
          key: 'publicationId',
        },
        snapshot: {
          alias: 'snapshot',
          type: 'belongsToOne',
          repo: 'surveySnapshot',
          key: 'snapshotId',
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
        surveyId: {
          spec: {
            surveyId: 1,
            createdAt: -1,
          },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
        snapshotId: {
          spec: {
            snapshotId: 1,
            surveyId: 1,
            createdAt: -1,
          },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
        publicationId: {
          spec: {
            publicationId: 1,
            surveyId: 1,
            createdAt: -1,
          },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
        participantId: {
          spec: {
            participantId: 1,
            surveyId: 1,
            snapshotId: 1,
            createdAt: -1,
          },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
        sessionId: {
          spec: {
            sessionId: 1,
            surveyId: 1,
            snapshotId: 1,
            createdAt: -1,
          },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
        mergeFromSnapshotId: {
          spec: {
            'merge.fromSnapshotId': 1,
            surveyId: 1,
            createdAt: -1,
          },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
        completedAt: {
          spec: { completedAt: -1 },
          options: { typeHint: { completedAt: TYPE_HINT_TIMESTAMP } },
        },
        startedAt: {
          spec: { startedAt: -1 },
          options: { typeHint: { startedAt: TYPE_HINT_TIMESTAMP } },
        },
        completedStatus: {
          spec: { surveyId: 1, completed: 1 },
        },
      },
    })
  }
}

export default RepoSurveyResponse
