import { QueryKey } from '@tanstack/react-query'

import {
  KEY_STATE_SURVEY_RESPONSE_GET,
  KEY_STATE_SURVEY_RESPONSE_LIST,
  KEY_STATE_SURVEY_STATS,
} from 'appAdmin/common'

/**
 * The query keys shared by every mutation that changes a survey's response
 * data (create, update, delete, delete many) — the response list, the
 * survey stats, and (when a single response was affected) that response's
 * detail cache. Used as `invalidateKeys` for useInvalidatingMutation.
 */
export function surveyResponseQueryKeys({
  surveyId,
  snapshotId,
  publicationId,
  responseId,
}: {
  surveyId: string
  snapshotId?: string
  publicationId?: string
  responseId?: string
}): QueryKey[] {
  const keys: QueryKey[] = [
    [KEY_STATE_SURVEY_RESPONSE_LIST, surveyId, snapshotId, publicationId],
    [KEY_STATE_SURVEY_STATS, surveyId],
  ]
  if (responseId) {
    keys.push([KEY_STATE_SURVEY_RESPONSE_GET, surveyId, responseId])
  }
  return keys
}
