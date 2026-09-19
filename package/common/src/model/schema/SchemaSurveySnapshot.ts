import { Schema, sb } from 'mzen-schema'

import { SCHEMA_LENGTH_MAX_INTERNAL_ID } from './constant'

export class SchemaSurveySnapshot extends Schema {
  constructor() {
    super(
      sb
        .schema('surveySnapshot')
        .construct('SurveySnapshot')
        .strict()
        .shape({
          _id: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          snapshotId: sb
            .string()
            .required()
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          survey: { $schema: 'survey' },
        })
        .build(),
    )
  }
}

export default SchemaSurveySnapshot
