import { Schema, sb } from 'mzen-schema'

import {
  SCHEMA_LENGTH_MAX_INPUT,
  SCHEMA_LENGTH_MAX_INTERNAL_ID,
  SCHEMA_LENGTH_MAX_TEXT,
  ENTITY_CODE_PATTERN,
} from './constant'

export class SchemaSurveySection extends Schema {
  constructor() {
    super(
      sb
        .schema('surveySection')
        .construct('SurveySection')
        .constructCollection('SurveySectionCollection')
        .strict()
        .shape({
          _id: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          surveyId: sb.string().required(),
          createdById: sb.string().required(),
          // Section discriminant: 'welcome' | 'group' | 'thankYou'.
          kind: sb.string().default('group').maxLength(16),
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
            .schema('l10n')
            .matchAll(
              sb
                .string()
                .label('Group name')
                .notEmpty()
                .maxLength(SCHEMA_LENGTH_MAX_INPUT)
                .stripHtml()
                .trim(),
            ),
          desc: sb
            .object()
            .nullable()
            .default(null)
            .schema('l10nHtml')
            .matchAll(
              sb
                .string()
                .label('Description')
                .notEmpty()
                .maxLength(SCHEMA_LENGTH_MAX_TEXT)
                .trim(),
            ),
          questionIds: sb.array(sb.string()),
          // Section config, e.g. the thank-you link { link: { url, text } }.
          config: sb.object().strict(false).nullable().default(null),
          attributes: sb.object().strict(false).matchAll(sb.mixed()),
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
