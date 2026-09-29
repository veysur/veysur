import { Schema, sb } from '@datacapy/schema'

import {
  SCHEMA_LENGTH_MAX_INTERNAL_ID,
  SCHEMA_LENGTH_MAX_INPUT,
  ENTITY_CODE_PATTERN,
} from './constant'

export class SchemaSurveyAnswerOption extends Schema {
  constructor() {
    super(
      sb
        .schema('surveyAnswerOption')
        .construct('SurveyAnswerOption')
        .constructCollection('SurveyAnswerOptionCollection')
        .strict()
        .shape({
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
            .schema('l10n')
            .matchAll(
              sb
                .string()
                .label('Answer option label')
                .notEmpty()
                .maxLength(SCHEMA_LENGTH_MAX_INPUT)
                .stripHtml(),
            ),
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
            ),
          createdAt: sb.date().default('now'),
          updatedAt: sb.date().default('now'),
        })
        .build(),
    )
  }
}
