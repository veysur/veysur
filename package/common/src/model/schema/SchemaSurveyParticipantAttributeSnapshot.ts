import { genUniqueId } from '@datacapy/id'
import type { SurveyParticipantAttributeDefinition } from '../constructor/SurveyParticipantAttribute'
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import { SCHEMA_LENGTH_MAX_INTERNAL_ID } from './constant'

export const surveyParticipantAttributeSnapshotSpec = {
  _id: sb
    .string()
    .required()
    .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID)
    .init(genUniqueId),
  snapshotId: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  surveyId: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  attributes: sb.array().as<SurveyParticipantAttributeDefinition>().default([]),
  contentHash: sb.string().required().minLength(64).maxLength(64),
  createdAt: sb.date().default('now'),
  updatedAt: sb.date().default('now'),
}

export class SchemaSurveyParticipantAttributeSnapshot extends Schema<
  typeof surveyParticipantAttributeSnapshotSpec
> {
  constructor() {
    super(
      sb
        .schema('surveyParticipantAttributeSnapshot')
        .construct('SurveyParticipantAttributeSnapshot')
        .strict()
        .shape(surveyParticipantAttributeSnapshotSpec),
    )
  }
}

export default SchemaSurveyParticipantAttributeSnapshot
