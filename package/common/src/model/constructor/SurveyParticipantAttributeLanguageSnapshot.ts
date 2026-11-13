import { SchemaConstructor } from '@datacapy/schema'
import type { tags as t } from '@datacapy/schema'

import type { SurveyParticipantAttributeLanguageData } from './SurveyParticipantAttributeLanguage'
import { SchemaSurveyParticipantAttributeLanguageSnapshot } from './SurveyParticipantAttributeLanguageSnapshot.schema'

type InternalId = string & t.MaxLength<17>
type Hash = string & t.MinLength<64> & t.MaxLength<64>

/** @schema surveyParticipantAttributeLanguageSnapshot construct=SurveyParticipantAttributeLanguageSnapshot strict */
export interface SurveyParticipantAttributeLanguageSnapshotFields {
  _id: InternalId & t.Required & t.InitFn<'genUniqueId'>
  snapshotId: InternalId & t.Required
  surveyId: InternalId & t.Required
  languageCode: string & t.Required & t.MaxLength<2>
  data: Record<string, SurveyParticipantAttributeLanguageData> & t.Default<t.EmptyObject> & t.NonStrict & t.Opaque
  contentHash: Hash & t.Required
  createdAt: Date & t.Default<'now'>
  updatedAt: Date & t.Default<'now'>
}

/** Fields come from the generated {@link SchemaSurveyParticipantAttributeLanguageSnapshot}. */
export class SurveyParticipantAttributeLanguageSnapshot extends SchemaConstructor.from(
  SchemaSurveyParticipantAttributeLanguageSnapshot,
) {}

export default SurveyParticipantAttributeLanguageSnapshot
