import { genUniqueId } from '@datacapy/id'
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

import { SCHEMA_LENGTH_MAX_INTERNAL_ID } from './constant'

export const surveyPublicationSpec = {
  _id: sb
    .string()
    .required()
    .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID)
    .init(genUniqueId),
  snapshotId: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  surveyId: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  publishedById: sb
    .string()
    .required()
    .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  label: sb.string().default(null),
  notes: sb.string().default(null),
  publishedAt: sb.date().default('now'),
  stoppedAt: sb.date().default(null),
  createdAt: sb.date().default('now'),
  updatedAt: sb.date().default('now'),
  // Populated relation: count of responses
  responseCount: sb.number().relation(),
}

export class SchemaSurveyPublication extends Schema<
  typeof surveyPublicationSpec
> {
  constructor() {
    super(
      sb
        .schema('surveyPublication')
        .construct('SurveyPublication')
        .strict()
        .shape(surveyPublicationSpec),
    )
  }
}

export default SchemaSurveyPublication
