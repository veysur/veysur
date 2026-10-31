import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

import type { L10n } from '../constructor/L10n'
import type { SurveyAttributes } from '../constructor/Survey/attributeMeta'
import {
  SCHEMA_LENGTH_MAX_INPUT,
  SCHEMA_LENGTH_MAX_INTERNAL_ID,
  SCHEMA_LENGTH_MAX_ELEMENT_TEXT,
  SCHEMA_LENGTH_MAX_TEXT,
  ENTITY_CODE_PATTERN,
} from './constant'
import { SchemaL10nHtml } from './SchemaL10nHtml'
import { SchemaSurveyAnswerOption } from './SchemaSurveyAnswerOption'
import { SchemaSurveySubquestion } from './SchemaSurveySubquestion'

/** Fields shared by questions and content elements. */
export const surveyElementBaseShape = {
  _id: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  surveyId: sb.string().required(),
  createdById: sb.string().required(),
  // Element discriminant. 'question' | 'content' — kind-specific required
  // fields are checked in SurveyValidation, not here (runtime discrimination).
  kind: sb.string().default('question').maxLength(16),
  type: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INPUT).default(''),
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
  text: sb
    .object()
    .schema(() => new SchemaL10nHtml())
    .matchAll(
      sb
        .string()
        .label('Element text')
        .notEmpty()
        .maxLength(SCHEMA_LENGTH_MAX_ELEMENT_TEXT)
        .trim(),
    )
    .as<L10n>()
    .default({}),
  sectionId: sb
    .string()
    .required()
    .notEmpty()
    .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
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

export const surveyElementShape = {
  ...surveyElementBaseShape,
  detail: sb
    .object()
    .schema(() => new SchemaL10nHtml())
    .nullable()
    .default(null)
    .matchAll(
      sb
        .string()
        .label('Detail')
        .notEmpty()
        .maxLength(SCHEMA_LENGTH_MAX_TEXT)
        .trim(),
    ),
  /** @deprecated alias of `sectionId`, accepted during the rename migration window. */
  groupId: sb
    .string()
    .nullable()
    .default(null)
    .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  // Content-element config (e.g. { youtube: { url, videoId, startAt } }).
  // Null / absent for questions.
  config: sb.object().strict(false).nullable().default(null),
  subquestions: sb.array().of(() => new SchemaSurveySubquestion()),
  answerOptions: sb.array().of(() => new SchemaSurveyAnswerOption()),
}

export class SchemaSurveyElement extends Schema<typeof surveyElementShape> {
  constructor() {
    super(
      sb
        .schema('surveyElement')
        // No item-level `.construct()` — `.constructCollection()` hands the raw
        // row array to `SurveyElementCollection.fromArray`, which instantiates
        // each row as `SurveyQuestion` or `SurveyContent` by its `kind`. An
        // item-level construct would re-wrap every row (content included) into a
        // single class and lose that discrimination.
        .constructCollection('SurveyElementCollection')
        .strict()
        .shape(surveyElementShape),
    )
  }
}
