import { Schema, sb } from '@datacapy/schema'

import {
  SCHEMA_LENGTH_MAX_INPUT,
  SCHEMA_LENGTH_MAX_INTERNAL_ID,
} from './constant'

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
          text: { $schema: 'l10nHtml' },
          detail: sb.object().nullable().default(null).schema('l10nHtml'),
          attributes: sb.object().strict(false).matchAll(sb.mixed()),
          createdAt: sb.date().default('now'),
          updatedAt: sb.date().default('now'),
        })
        .build(),
    )
  }
}
