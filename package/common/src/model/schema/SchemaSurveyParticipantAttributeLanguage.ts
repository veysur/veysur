import { Schema, sb } from 'mzen-schema'

import {
  SCHEMA_LENGTH_MAX_INTERNAL_ID,
  SCHEMA_LENGTH_MAX_LANG,
} from './constant'

export class SchemaSurveyParticipantAttributeLanguage extends Schema {
  constructor() {
    super(
      sb
        .schema('surveyParticipantAttributeLanguage')
        .construct('SurveyParticipantAttributeLanguage')
        .strict()
        .shape({
          _id: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          surveyId: sb
            .string()
            .required()
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          languageCode: sb
            .string()
            .required()
            .maxLength(SCHEMA_LENGTH_MAX_LANG),
          data: sb.object().strict(false).default({}),
          createdAt: sb.date().default('now'),
          updatedAt: sb.date().default('now'),
        })
        .build(),
    )
  }
}

export default SchemaSurveyParticipantAttributeLanguage
