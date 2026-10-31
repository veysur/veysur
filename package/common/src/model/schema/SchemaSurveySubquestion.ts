import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

import {
  SCHEMA_LENGTH_MAX_INPUT,
  SCHEMA_LENGTH_MAX_INTERNAL_ID,
} from './constant'
import { SchemaL10nHtml } from './SchemaL10nHtml'

export class SchemaSurveySubquestion extends Schema {
  constructor() {
    super(
      sb
        .schema('surveySubquestion')
        .construct('SurveySubquestion')
        .constructCollection('SurveyElementCollection')
        .strict()
        .shape({
          _id: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          type: sb
            .string()
            .required()
            .maxLength(SCHEMA_LENGTH_MAX_INPUT)
            .default(''),
          code: sb.string().required().maxLength(12).default(''),
          text: sb.ref(() => new SchemaL10nHtml()),
          detail: sb.object().nullable().default(null).schema(() => new SchemaL10nHtml()),
          attributes: sb.object().strict(false).matchAll(sb.mixed()),
          createdAt: sb.date().default('now'),
          updatedAt: sb.date().default('now'),
        }),
    )
  }
}
