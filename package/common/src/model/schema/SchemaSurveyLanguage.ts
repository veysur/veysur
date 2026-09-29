import { Schema, sb } from '@datacapy/schema'

import {
  SCHEMA_LENGTH_MAX_INTERNAL_ID,
  SCHEMA_LENGTH_MAX_LANG,
} from './constant'

export class SchemaSurveyLanguage extends Schema {
  constructor() {
    super(
      sb
        .schema('surveyLanguage')
        .construct('SurveyLanguage')
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
          data: sb.object().strict(false),
          createdAt: sb.date().default('now'),
          updatedAt: sb.date().default('now'),
        })
        .build(),
    )
  }
}

export default SchemaSurveyLanguage
