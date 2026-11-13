import { SchemaConstructor } from '@datacapy/schema'
import type { tags as t } from '@datacapy/schema'

import { SchemaSurveyPublication } from './SurveyPublication.schema'

type InternalId = string & t.MaxLength<17>

/** @schema surveyPublication construct=SurveyPublication strict */
export interface SurveyPublicationFields {
  _id: InternalId & t.Required & t.InitFn<'genUniqueId'>
  snapshotId: InternalId & t.Required
  surveyId: InternalId & t.Required
  publishedById: InternalId & t.Required
  label: (string & t.Default<null>) | null
  notes: (string & t.Default<null>) | null
  publishedAt: Date & t.Default<'now'>
  stoppedAt: (Date & t.Default<null>) | null
  createdAt: Date & t.Default<'now'>
  updatedAt: Date & t.Default<'now'>
  /** Populated relation: count of responses */
  responseCount?: number & t.Relation
}

/** Fields come from the generated {@link SchemaSurveyPublication}. */
export class SurveyPublication extends SchemaConstructor.from(
  SchemaSurveyPublication,
) {}
