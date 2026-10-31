import type { SurveyParticipantAttributeDefinition } from '../constructor/SurveyParticipantAttribute'
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

import { SCHEMA_LENGTH_MAX_INTERNAL_ID } from './constant'

export const surveyParticipantAttributeShape = {
  _id: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  surveyId: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  attributes: sb.array().as<SurveyParticipantAttributeDefinition>().default([]),
  createdAt: sb.date().default('now'),
  updatedAt: sb.date().default('now'),
}

export class SchemaSurveyParticipantAttribute extends Schema<
  typeof surveyParticipantAttributeShape
> {
  constructor() {
    super(
      sb
        .schema('surveyParticipantAttribute')
        .construct('SurveyParticipantAttribute')
        .strict()
        .shape(surveyParticipantAttributeShape),
    )
  }
}

export default SchemaSurveyParticipantAttribute
