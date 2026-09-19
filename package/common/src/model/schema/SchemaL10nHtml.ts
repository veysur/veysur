import { Schema, sb } from 'mzen-schema'

import { SCHEMA_LENGTH_MAX_TEXT } from './constant'

export class SchemaL10nHtml extends Schema {
  constructor() {
    super(
      sb
        .schema('l10nHtml')
        .construct('L10n')
        .strict()
        .matchAll(sb.string().maxLength(SCHEMA_LENGTH_MAX_TEXT).trim())
        .build(),
    )
  }
}
