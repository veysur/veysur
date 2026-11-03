import { genUniqueId } from '@datacapy/id'
import type { SurveyParticipantAttributeDefinition } from '../constructor/SurveyParticipantAttribute'
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

import { SCHEMA_LENGTH_MAX_INTERNAL_ID } from './constant'

export const surveyParticipantAttributeSpec = {
  _id: sb
    .string()
    .required()
    .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID)
    .init(genUniqueId),
  surveyId: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  attributes: sb.array().as<SurveyParticipantAttributeDefinition>().default([]),
  createdAt: sb.date().default('now'),
  updatedAt: sb.date().default('now'),
}

export class SchemaSurveyParticipantAttribute extends Schema<
  typeof surveyParticipantAttributeSpec
> {
  constructor() {
    super(
      sb
        .schema('surveyParticipantAttribute')
        .construct('SurveyParticipantAttribute')
        .strict()
        .shape(surveyParticipantAttributeSpec),
    )
  }
}

export default SchemaSurveyParticipantAttribute
