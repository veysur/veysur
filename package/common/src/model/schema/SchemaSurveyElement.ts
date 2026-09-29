import { Schema, sb } from '@datacapy/schema'

import {
  SCHEMA_LENGTH_MAX_INPUT,
  SCHEMA_LENGTH_MAX_INTERNAL_ID,
  SCHEMA_LENGTH_MAX_ELEMENT_TEXT,
  SCHEMA_LENGTH_MAX_TEXT,
  ENTITY_CODE_PATTERN,
} from './constant'

export class SchemaSurveyElement extends Schema {
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
        .shape({
          _id: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          surveyId: sb.string().required(),
          createdById: sb.string().required(),
          // Element discriminant. 'question' | 'content' — kind-specific required
          // fields are checked in SurveyValidation, not here (runtime discrimination).
          kind: sb.string().default('question').maxLength(16),
          type: sb
            .string()
            .required()
            .maxLength(SCHEMA_LENGTH_MAX_INPUT)
            .default(''),
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
            .schema('l10nHtml')
            .matchAll(
              sb
                .string()
                .label('Element text')
                .notEmpty()
                .maxLength(SCHEMA_LENGTH_MAX_ELEMENT_TEXT)
                .trim(),
            ),
          detail: sb
            .object()
            .schema('l10nHtml')
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
          sectionId: sb
            .string()
            .required()
            .notEmpty()
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          /** @deprecated alias of `sectionId`, accepted during the rename migration window. */
          groupId: sb
            .string()
            .nullable()
            .default(null)
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          attributes: sb.object().strict(false).matchAll(sb.mixed()),
          // Content-element config (e.g. { youtube: { url, videoId, startAt } }).
          // Null / absent for questions.
          config: sb.object().strict(false).nullable().default(null),
          subquestions: sb.array().ofSchema('surveySubquestion'),
          answerOptions: sb.array().ofSchema('surveyAnswerOption'),
          condition: sb
            .string()
            .nullable()
            .default(null)
            .maxLength(2000)
            .trim(),
          conditionReferences: sb.array(sb.string()).nullable().default(null),
          createdAt: sb.date().default('now'),
          updatedAt: sb.date().default('now'),
        })
        .build(),
    )
  }
}
