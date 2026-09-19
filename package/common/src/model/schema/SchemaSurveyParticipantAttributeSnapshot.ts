import { Schema, sb } from 'mzen-schema'
import { SCHEMA_LENGTH_MAX_INTERNAL_ID } from './constant'

export class SchemaSurveyParticipantAttributeSnapshot extends Schema {
  constructor() {
    super(
      sb
        .schema('surveyParticipantAttributeSnapshot')
        .construct('SurveyParticipantAttributeSnapshot')
        .strict()
        .shape({
          _id: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          snapshotId: sb
            .string()
            .required()
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          surveyId: sb
            .string()
            .required()
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          attributes: sb.array().default([]),
          contentHash: sb.string().required().minLength(64).maxLength(64),
          createdAt: sb.date().default('now'),
          updatedAt: sb.date().default('now'),
        })
        .build(),
    )
  }
}

export default SchemaSurveyParticipantAttributeSnapshot
