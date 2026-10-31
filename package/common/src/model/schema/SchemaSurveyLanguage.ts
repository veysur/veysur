import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

import type { SurveyLanguageData } from '../constructor/SurveyLanguage'
import {
  SCHEMA_LENGTH_MAX_INTERNAL_ID,
  SCHEMA_LENGTH_MAX_LANG,
} from './constant'

export const surveyLanguageShape = {
  _id: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  surveyId: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  languageCode: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_LANG),
  data: sb.object().as<SurveyLanguageData>().strict(false).required(),
  createdAt: sb.date().default('now'),
  updatedAt: sb.date().default('now'),
}

export class SchemaSurveyLanguage extends Schema<typeof surveyLanguageShape> {
  constructor() {
    super(
      sb
        .schema('surveyLanguage')
        .construct('SurveyLanguage')
        .strict()
        .shape(surveyLanguageShape),
    )
  }
}

export default SchemaSurveyLanguage
