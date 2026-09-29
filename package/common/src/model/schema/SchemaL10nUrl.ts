import { Schema, sb } from '@datacapy/schema'

import { SCHEMA_LENGTH_MAX_TEXT } from './constant'

export class SchemaL10nUrl extends Schema {
  constructor() {
    super(
      sb
        .schema('l10nUrl')
        .construct('L10n')
        .strict()
        .matchAll(
          sb
            .string()
            .maxLength(SCHEMA_LENGTH_MAX_TEXT)
            .stripHtml()
            .trim()
            .prependHttpIfMissing(),
        )
        .build(),
    )
  }
}
