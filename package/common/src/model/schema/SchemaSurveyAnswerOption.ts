import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

import type { L10n } from '../constructor/L10n'
import type { SurveyAnswerOptionImageValue } from '../constructor/Survey/SurveyAnswerOption'
import {
  SCHEMA_LENGTH_MAX_INTERNAL_ID,
  SCHEMA_LENGTH_MAX_INPUT,
  ENTITY_CODE_PATTERN,
} from './constant'
import { SchemaL10n } from './SchemaL10n'

export const surveyAnswerOptionShape = {
  _id: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  createdById: sb.string().required(),
  code: sb
    .string()
    .required()
    .maxLength(12)
    .default('')
    .trim()
    .regex(ENTITY_CODE_PATTERN, {
      message:
        'Code must start with a letter and contain only letters, numbers, and underscores',
    }),
  label: sb
    .object()
    .schema(() => new SchemaL10n())
    .matchAll(
      sb
        .string()
        .label('Answer option label')
        .notEmpty()
        .maxLength(SCHEMA_LENGTH_MAX_INPUT)
        .stripHtml(),
    )
    .as<L10n>()
    .default({}),
  image: sb
    .object()
    .nullable()
    .default(null)
    .matchAll(
      sb
        .object()
        .nullable()
        .shape({
          path: sb.string().maxLength(500),
          fileId: sb.string().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
        }),
    )
    .as<Record<string, SurveyAnswerOptionImageValue | null>>(),
  createdAt: sb.date().default('now'),
  updatedAt: sb.date().default('now'),
}

export class SchemaSurveyAnswerOption extends Schema<
  typeof surveyAnswerOptionShape
> {
  constructor() {
    super(
      sb
        .schema('surveyAnswerOption')
        .construct('SurveyAnswerOption')
        .constructCollection('SurveyAnswerOptionCollection')
        .strict()
        .shape(surveyAnswerOptionShape),
    )
  }
}
