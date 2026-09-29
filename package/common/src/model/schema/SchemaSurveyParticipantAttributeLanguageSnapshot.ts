import { Schema, sb } from '@datacapy/schema'
import {
  SCHEMA_LENGTH_MAX_INTERNAL_ID,
  SCHEMA_LENGTH_MAX_LANG,
} from './constant'

export class SchemaSurveyParticipantAttributeLanguageSnapshot extends Schema {
  constructor() {
    super(
      sb
        .schema('surveyParticipantAttributeLanguageSnapshot')
        .construct('SurveyParticipantAttributeLanguageSnapshot')
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
          languageCode: sb
            .string()
            .required()
            .maxLength(SCHEMA_LENGTH_MAX_LANG),
          data: sb.object().strict(false).default({}),
          contentHash: sb.string().required().minLength(64).maxLength(64),
          createdAt: sb.date().default('now'),
          updatedAt: sb.date().default('now'),
        })
        .build(),
    )
  }
}

export default SchemaSurveyParticipantAttributeLanguageSnapshot
