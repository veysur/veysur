import { SCHEMA_LENGTH_MAX_INPUT } from 'veysur-common'
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

export class SurveySchemaNew extends Schema {
  constructor() {
    super(
      sb
        .schema()
        .strict()
        .shape({
          name: sb
            .string()
            .notEmpty({ message: 'Name is required' })
            .maxLength(SCHEMA_LENGTH_MAX_INPUT),
        }),
    )
  }
}

export default SurveySchemaNew
