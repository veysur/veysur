import type { SurveyParticipantAttributeLanguageData } from '../constructor/SurveyParticipantAttributeLanguage'
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

import {
  SCHEMA_LENGTH_MAX_INTERNAL_ID,
  SCHEMA_LENGTH_MAX_LANG,
} from './constant'

export const surveyParticipantAttributeLanguageShape = {
  _id: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  surveyId: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  languageCode: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_LANG),
  data: sb
    .object()
    .as<Record<string, SurveyParticipantAttributeLanguageData>>()
    .strict(false)
    .default({}),
  createdAt: sb.date().default('now'),
  updatedAt: sb.date().default('now'),
}

export class SchemaSurveyParticipantAttributeLanguage extends Schema<
  typeof surveyParticipantAttributeLanguageShape
> {
  constructor() {
    super(
      sb
        .schema('surveyParticipantAttributeLanguage')
        .construct('SurveyParticipantAttributeLanguage')
        .strict()
        .shape(surveyParticipantAttributeLanguageShape),
    )
  }
}

export default SchemaSurveyParticipantAttributeLanguage
