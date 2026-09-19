import { Schema, sb } from 'mzen-schema'

import { SCHEMA_LENGTH_MAX_TEXT } from './constant'

export class SchemaL10n extends Schema {
  constructor() {
    super(
      sb
        .schema('l10n')
        .construct('L10n')
        .strict()
        .matchAll(
          sb.string().maxLength(SCHEMA_LENGTH_MAX_TEXT).stripHtml().trim(),
        )
        .build(),
    )
  }
}
