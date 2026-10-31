import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

import { SCHEMA_LENGTH_MAX_INTERNAL_ID } from './constant'

export const surveyPublicationShape = {
  _id: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
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
}

export class SchemaSurveyPublication extends Schema<
  typeof surveyPublicationShape
> {
  constructor() {
    super(
      sb
        .schema('surveyPublication')
        .construct('SurveyPublication')
        .strict()
        .shape(surveyPublicationShape),
    )
  }
}

export default SchemaSurveyPublication
