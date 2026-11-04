import { genUniqueId } from '@datacapy/id'
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

import { L10n } from '../constructor/L10n'
import type { SurveyAttributes } from '../constructor/Survey/attributeMeta'
import {
  SCHEMA_LENGTH_MAX_INPUT,
  SCHEMA_LENGTH_MAX_INTERNAL_ID,
} from './constant'
import { SchemaL10nHtml } from './SchemaL10nHtml'

export const surveySubquestionSpec = {
  _id: sb
    .string()
    .required()
    .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID)
    .init(genUniqueId),
  type: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INPUT).default(''),
  code: sb.string().required().maxLength(12).default(''),
  text: sb
    .object()
    .schema(() => new SchemaL10nHtml())
    .construct(L10n)
    .as<L10n>()
    .default({}),
  detail: sb
    .object()
    .nullable()
    .default(null)
    .schema(() => new SchemaL10nHtml())
    .construct(L10n)
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

export class SchemaSurveySubquestion extends Schema.from(
  sb
    .schema('surveySubquestion')
    .construct('SurveySubquestion')
    .constructCollection('SurveySubquestionCollection')
    .strict()
    .shape(surveySubquestionSpec),
) {}
