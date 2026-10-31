import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

import type { L10n } from '../constructor/L10n'
import type { SurveyAttributes } from '../constructor/Survey/attributeMeta'
import type {
  SectionKind,
  SurveySectionConfig,
} from '../constructor/Survey/SurveySection'
import {
  SCHEMA_LENGTH_MAX_INPUT,
  SCHEMA_LENGTH_MAX_INTERNAL_ID,
  SCHEMA_LENGTH_MAX_TEXT,
  ENTITY_CODE_PATTERN,
} from './constant'
import { SchemaL10n } from './SchemaL10n'
import { SchemaL10nHtml } from './SchemaL10nHtml'

export const surveySectionShape = {
  _id: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  surveyId: sb.string().required(),
  createdById: sb.string().required(),
  // Section discriminant: 'welcome' | 'group' | 'thankYou'.
  kind: sb.string().default('group').maxLength(16).as<SectionKind>(),
  code: sb
    .string()
    .maxLength(12)
    .default('')
    .trim()
    .regex(ENTITY_CODE_PATTERN, {
      message:
        'Code must start with a letter and contain only letters, numbers, and underscores',
    }),
  name: sb
    .object()
    .schema(() => new SchemaL10n())
    .matchAll(
      sb
        .string()
        .label('Group name')
        .notEmpty()
        .maxLength(SCHEMA_LENGTH_MAX_INPUT)
        .stripHtml()
        .trim(),
    )
    .as<L10n>()
    .default({}),
  desc: sb
    .object()
    .nullable()
    .default(null)
    .schema(() => new SchemaL10nHtml())
    .matchAll(
      sb
        .string()
        .label('Description')
        .notEmpty()
        .maxLength(SCHEMA_LENGTH_MAX_TEXT)
        .trim(),
    )
    .as<L10n>()
    .nullable(),
  questionIds: sb.array(sb.string()),
  // Section config, e.g. the thank-you link { link: { url, text } }.
  config: sb
    .object()
    .strict(false)
    .as<SurveySectionConfig>()
    .nullable()
    .default(null),
  attributes: sb
    .object()
    .strict(false)
    .matchAll(sb.mixed())
    .as<SurveyAttributes>()
    .default({}),
  condition: sb.string().nullable().default(null).maxLength(2000).trim(),
  conditionReferences: sb.array(sb.string()).nullable().default(null),
  createdAt: sb.date().default('now'),
  updatedAt: sb.date().default('now'),
}

export class SchemaSurveySection extends Schema<typeof surveySectionShape> {
  constructor() {
    super(
      sb
        .schema('surveySection')
        .construct('SurveySection')
        .constructCollection('SurveySectionCollection')
        .strict()
        .shape(surveySectionShape),
    )
  }
}
