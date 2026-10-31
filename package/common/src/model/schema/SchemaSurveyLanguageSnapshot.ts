import type { SurveyLanguageData } from '../constructor/SurveyLanguage'
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

import {
  SCHEMA_LENGTH_MAX_INTERNAL_ID,
  SCHEMA_LENGTH_MAX_LANG,
} from './constant'

export const surveyLanguageSnapshotShape = {
  _id: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  snapshotId: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  surveyId: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  languageCode: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_LANG),
  contentHash: sb.string().required().minLength(64).maxLength(64),
  data: sb.object().as<SurveyLanguageData>().strict(false).required(),
  createdAt: sb.date().default('now'),
  updatedAt: sb.date().default('now'),
}

export class SchemaSurveyLanguageSnapshot extends Schema<
  typeof surveyLanguageSnapshotShape
> {
  constructor() {
    super(
      sb
        .schema('surveyLanguageSnapshot')
        .construct('SurveyLanguageSnapshot')
        .strict()
        .shape(surveyLanguageSnapshotShape),
    )
  }
}

export default SchemaSurveyLanguageSnapshot
