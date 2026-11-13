import type { tags as t } from '@datacapy/schema'

import type { SurveyDocument } from './SurveyDocument'

/**
 * A published survey as stored: the survey document with the snapshot's ids.
 *
 * @schema surveySnapshot construct=SurveySnapshot strict
 */
export interface SurveySnapshotDocument {
  _id: string & t.Required & t.MaxLength<17>
  snapshotId: string & t.Required & t.MaxLength<17>
  survey?: SurveyDocument
}
