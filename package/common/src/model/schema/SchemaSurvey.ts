import { SchemaBuilder as sb } from '@datacapy/schema'

import { SchemaSettingSurvey } from './SchemaSettingSurvey'
import { SCHEMA_LENGTH_MAX_INPUT } from './constant'
import { SchemaL10n } from './SchemaL10n'
import { SchemaSurveyElement } from './SchemaSurveyElement'
import { SchemaSurveySection } from './SchemaSurveySection'

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
            ),
          attributes: sb.object().matchAll(sb.mixed()),
          sectionIds: sb.array(sb.string()),
          elementIds: sb.array(sb.string()),
          sections: sb.array().of(() => new SchemaSurveySection()),
          elements: sb.array().of(() => new SchemaSurveyElement()),
        })
        .build(),
    )
  }
}
