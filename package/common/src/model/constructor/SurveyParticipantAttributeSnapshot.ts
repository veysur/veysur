import { SchemaConstructor } from '@datacapy/schema'
import type { tags as t } from '@datacapy/schema'

import type { SurveyParticipantAttributeDefinition } from './SurveyParticipantAttribute'
import { SchemaSurveyParticipantAttributeSnapshot } from './SurveyParticipantAttributeSnapshot.schema'

type InternalId = string & t.MaxLength<17>
type Hash = string & t.MinLength<64> & t.MaxLength<64>

/** @schema surveyParticipantAttributeSnapshot construct=SurveyParticipantAttributeSnapshot strict */
export interface SurveyParticipantAttributeSnapshotFields {
  _id: InternalId & t.Required & t.InitFn<'genUniqueId'>
  snapshotId: InternalId & t.Required
  surveyId: InternalId & t.Required
  attributes: SurveyParticipantAttributeDefinition[] & t.Default<t.EmptyArray> & t.Opaque
  contentHash: Hash & t.Required
  createdAt: Date & t.Default<'now'>
  updatedAt: Date & t.Default<'now'>
}

/** Fields come from the generated {@link SchemaSurveyParticipantAttributeSnapshot}. */
export class SurveyParticipantAttributeSnapshot extends SchemaConstructor.from(
  SchemaSurveyParticipantAttributeSnapshot,
) {}

export default SurveyParticipantAttributeSnapshot
