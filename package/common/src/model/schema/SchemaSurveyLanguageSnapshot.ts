import { genUniqueId } from '@datacapy/id'
import type { SurveyLanguageData } from '../constructor/SurveyLanguage'
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

import {
  SCHEMA_LENGTH_MAX_INTERNAL_ID,
  SCHEMA_LENGTH_MAX_LANG,
} from './constant'

export const surveyLanguageSnapshotSpec = {
  _id: sb
    .string()
    .required()
    .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID)
    .init(genUniqueId),
  snapshotId: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  surveyId: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  languageCode: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_LANG),
  contentHash: sb.string().required().minLength(64).maxLength(64),
  data: sb.object().as<SurveyLanguageData>().strict(false).required().init({}),
  createdAt: sb.date().default('now'),
  updatedAt: sb.date().default('now'),
}

export class SchemaSurveyLanguageSnapshot extends Schema<
  typeof surveyLanguageSnapshotSpec
> {
  constructor() {
    super(
      sb
        .schema('surveyLanguageSnapshot')
        .construct('SurveyLanguageSnapshot')
        .strict()
        .shape(surveyLanguageSnapshotSpec),
    )
  }
}

export default SchemaSurveyLanguageSnapshot
