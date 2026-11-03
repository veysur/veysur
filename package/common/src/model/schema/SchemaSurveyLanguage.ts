import { genUniqueId } from '@datacapy/id'
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

import type { SurveyLanguageData } from '../constructor/SurveyLanguage'
import {
  SCHEMA_LENGTH_MAX_INTERNAL_ID,
  SCHEMA_LENGTH_MAX_LANG,
} from './constant'

export const surveyLanguageSpec = {
  _id: sb
    .string()
    .required()
    .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID)
    .init(genUniqueId),
  surveyId: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  languageCode: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_LANG),
  data: sb.object().as<SurveyLanguageData>().strict(false).required().init({}),
  createdAt: sb.date().default('now'),
  updatedAt: sb.date().default('now'),
}

export class SchemaSurveyLanguage extends Schema<typeof surveyLanguageSpec> {
  constructor() {
    super(
      sb
        .schema('surveyLanguage')
        .construct('SurveyLanguage')
        .strict()
        .shape(surveyLanguageSpec),
    )
  }
}

export default SchemaSurveyLanguage
