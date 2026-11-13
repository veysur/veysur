import { SchemaConstructor } from '@datacapy/schema'
import type { tags as t } from '@datacapy/schema'

import type { SurveyLanguageData } from './SurveyLanguage'
import { SchemaSurveyLanguageSnapshot } from './SurveyLanguageSnapshot.schema'

type InternalId = string & t.MaxLength<17>
type Hash = string & t.MinLength<64> & t.MaxLength<64>

/** @schema surveyLanguageSnapshot construct=SurveyLanguageSnapshot strict */
export interface SurveyLanguageSnapshotFields {
  _id: InternalId & t.Required & t.InitFn<'genUniqueId'>
  snapshotId: InternalId & t.Required
  surveyId: InternalId & t.Required
  languageCode: string & t.Required & t.MaxLength<2>
  contentHash: Hash & t.Required
  data: SurveyLanguageData & t.Required & t.Init<t.EmptyObject> & t.NonStrict & t.Opaque
  createdAt: Date & t.Default<'now'>
  updatedAt: Date & t.Default<'now'>
}

/** Fields come from the generated {@link SchemaSurveyLanguageSnapshot}. */
export class SurveyLanguageSnapshot extends SchemaConstructor.from(
  SchemaSurveyLanguageSnapshot,
) {}

export default SurveyLanguageSnapshot
