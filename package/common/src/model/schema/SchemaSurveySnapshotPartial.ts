import { Schema, sb } from '@datacapy/schema'

import { SCHEMA_LENGTH_MAX_INTERNAL_ID } from './constant'

export class SchemaSurveySnapshotPartial extends Schema {
  constructor() {
    super(
      sb
        .schema('surveySnapshotPartial')
        .construct('SurveySnapshotPartial')
        .strict()
        .shape({
          _id: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          surveyId: sb
            .string()
            .required()
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          createdById: sb
            .string()
            .required()
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          contentHash: sb.string().required().minLength(64).maxLength(64),
          label: sb.string().default(null),
          notes: sb.string().default(null),
          surveyPartial: { $schema: 'survey' },
          createdAt: sb.date().default('now'),
          updatedAt: sb.date().default('now'),
        })
        .build(),
    )
  }
}

export default SchemaSurveySnapshotPartial
