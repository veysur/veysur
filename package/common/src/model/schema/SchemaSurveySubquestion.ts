import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

import type { L10n } from '../constructor/L10n'
import type { SurveyAttributes } from '../constructor/Survey/attributeMeta'
import {
  SCHEMA_LENGTH_MAX_INPUT,
  SCHEMA_LENGTH_MAX_INTERNAL_ID,
} from './constant'
import { SchemaL10nHtml } from './SchemaL10nHtml'

export const surveySubquestionShape = {
  _id: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  type: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INPUT).default(''),
  code: sb.string().required().maxLength(12).default(''),
  text: sb
    .object()
    .schema(() => new SchemaL10nHtml())
    .as<L10n>()
    .default({}),
  detail: sb
    .object()
    .nullable()
    .default(null)
    .schema(() => new SchemaL10nHtml())
    .as<L10n>()
    .nullable(),
  attributes: sb
    .object()
    .strict(false)
    .matchAll(sb.mixed())
    .as<SurveyAttributes>()
    .default({}),
  createdAt: sb.date().default('now'),
  updatedAt: sb.date().default('now'),
}

export class SchemaSurveySubquestion extends Schema<
  typeof surveySubquestionShape
> {
  constructor() {
    super(
      sb
        .schema('surveySubquestion')
        .construct('SurveySubquestion')
        .constructCollection('SurveyElementCollection')
        .strict()
        .shape(surveySubquestionShape),
    )
  }
}
