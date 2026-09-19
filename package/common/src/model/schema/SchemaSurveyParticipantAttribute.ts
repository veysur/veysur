import { Schema, sb } from 'mzen-schema'

import { SCHEMA_LENGTH_MAX_INTERNAL_ID } from './constant'

export class SchemaSurveyParticipantAttribute extends Schema {
  constructor() {
    super(
      sb
        .schema('surveyParticipantAttribute')
        .construct('SurveyParticipantAttribute')
        .strict()
        .shape({
          _id: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          surveyId: sb
            .string()
            .required()
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          attributes: sb.array().default([]),
          createdAt: sb.date().default('now'),
          updatedAt: sb.date().default('now'),
        })
        .build(),
    )
  }
}

export default SchemaSurveyParticipantAttribute
