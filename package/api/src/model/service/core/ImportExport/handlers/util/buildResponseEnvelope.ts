import { SurveyResponse } from 'veysur-common'

import { ResponseBatchEnvelope } from '../SurveyPublicationEntityHandler/types'

export function buildResponseEnvelope(
  surveyId: string,
  publicationId: string | null,
  responses: SurveyResponse[],
): ResponseBatchEnvelope {
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    entityType: 'surveyResponse',
    surveyId,
    publicationId: publicationId ?? null,
    responseCount: responses.length,
    responses: responses.map((r) => ({
      _id: r._id,
      participantId: r.participantId,
      participant: r.participant ?? null,
      snapshotId: r.snapshotId,
      publicationId: r.publicationId,
      sessionId: r.sessionId,
      ip: r.ip,
      referrerUrl: r.referrerUrl,
      answers: r.answers,
      completedAt: r.completedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  }
}
