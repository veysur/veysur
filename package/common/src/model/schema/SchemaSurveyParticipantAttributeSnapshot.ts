import type { SurveyParticipantAttributeDefinition } from '../constructor/SurveyParticipantAttribute'
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import { SCHEMA_LENGTH_MAX_INTERNAL_ID } from './constant'

export const surveyParticipantAttributeSnapshotShape = {
  _id: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  snapshotId: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  surveyId: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  attributes: sb.array().as<SurveyParticipantAttributeDefinition>().default([]),
  contentHash: sb.string().required().minLength(64).maxLength(64),
  createdAt: sb.date().default('now'),
  updatedAt: sb.date().default('now'),
}

export class SchemaSurveyParticipantAttributeSnapshot extends Schema<
  typeof surveyParticipantAttributeSnapshotShape
> {
  constructor() {
    super(
      sb
        .schema('surveyParticipantAttributeSnapshot')
        .construct('SurveyParticipantAttributeSnapshot')
        .strict()
        .shape(surveyParticipantAttributeSnapshotShape),
    )
  }
}

export default SchemaSurveyParticipantAttributeSnapshot
