import { SchemaBuilder as sb } from '@datacapy/schema'

import type { L10n } from '../constructor/L10n'
import type { SurveyAttributes } from '../constructor/Survey/attributeMeta'
import { SchemaSettingSurvey } from './SchemaSettingSurvey'
import { SCHEMA_LENGTH_MAX_INPUT } from './constant'
import { SchemaL10n } from './SchemaL10n'
import { SchemaSurveyElement } from './SchemaSurveyElement'
import { SchemaSurveySection } from './SchemaSurveySection'

/**
 * The plain fields the survey adds to the settings. `sections` and `elements`
 * are left out: the constructor turns them into collections, so the class type
 * is not the schema type.
 */
export const surveyOwnShape = {
  createdById: sb.string().required(),
  name: sb.string().label('Name').default('').stripHtml().trim(),
  title: sb
    .object()
    .schema(() => new SchemaL10n())
    .matchAll(
      sb
        .string()
        .label('Title')
        .maxLength(SCHEMA_LENGTH_MAX_INPUT)
        .stripHtml()
        .trim(),
    )
    .as<L10n>()
    .default({}),
  attributes: sb
    .object()
    .matchAll(sb.mixed())
    .as<SurveyAttributes>()
    .default({}),
  sectionIds: sb.array(sb.string()).default([]),
  elementIds: sb.array(sb.string()).default([]),
}

export class SchemaSurvey extends SchemaSettingSurvey {
  constructor() {
    super()

    this.name = 'survey'
    this.spec.$name = 'survey'
    this.spec.$construct = 'Survey'

    Object.assign(
      this.spec,
      sb
        .object()
        .shape({
          ...surveyOwnShape,
          sections: sb.array().of(() => new SchemaSurveySection()),
          elements: sb.array().of(() => new SchemaSurveyElement()),
        })
        .build(),
    )
  }
}
