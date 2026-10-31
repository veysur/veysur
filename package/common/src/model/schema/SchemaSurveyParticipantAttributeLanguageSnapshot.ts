import type { SurveyParticipantAttributeLanguageData } from '../constructor/SurveyParticipantAttributeLanguage'
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import {
  SCHEMA_LENGTH_MAX_INTERNAL_ID,
  SCHEMA_LENGTH_MAX_LANG,
} from './constant'

export const surveyParticipantAttributeLanguageSnapshotShape = {
  _id: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  snapshotId: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  surveyId: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  languageCode: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_LANG),
  data: sb
    .object()
    .as<Record<string, SurveyParticipantAttributeLanguageData>>()
    .strict(false)
    .default({}),
  contentHash: sb.string().required().minLength(64).maxLength(64),
  createdAt: sb.date().default('now'),
  updatedAt: sb.date().default('now'),
}

export class SchemaSurveyParticipantAttributeLanguageSnapshot extends Schema<
  typeof surveyParticipantAttributeLanguageSnapshotShape
> {
  constructor() {
    super(
      sb
        .schema('surveyParticipantAttributeLanguageSnapshot')
        .construct('SurveyParticipantAttributeLanguageSnapshot')
        .strict()
        .shape(surveyParticipantAttributeLanguageSnapshotShape),
    )
  }
}

export default SchemaSurveyParticipantAttributeLanguageSnapshot
