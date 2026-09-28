import { Schema, sb } from 'mzen-schema'

import { SCHEMA_LENGTH_MAX_INTERNAL_ID } from './constant'

export class SchemaDataTransferJob extends Schema {
  constructor() {
    super(
      sb
        .schema('dataTransferJob')
        .construct('DataTransferJob')
        .strict()
        .shape({
          _id: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          direction: sb
            .string()
            .required()
            .inArray(['import', 'export'])
            .default('export'),
          entityType: sb.string().required().maxLength(64),
          entityId: sb
            .string()
            .nullable()
            .default(null)
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          label: sb.string().nullable().default(null).maxLength(255),
          format: sb.string().required().maxLength(16),
          options: sb.object().nullable().default(null),
          sourceFileId: sb
            .string()
            .nullable()
            .default(null)
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          sourceFileHash: sb.string().nullable().default(null).maxLength(64),
          projectId: sb
            .string()
            .required()
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          requestedByUserId: sb
            .string()
            .required()
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          requestHost: sb.string().nullable().default(null).maxLength(255),
          requestProto: sb.string().nullable().default(null).maxLength(16),
          status: sb
            .string()
            .required()
            .inArray(['pending', 'processing', 'completed', 'failed'])
            .default('pending'),
          resultFileId: sb
            .string()
            .nullable()
            .default(null)
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          error: sb.string().nullable().default(null),
          createdAt: sb.date().default('now'),
          startedAt: sb.date().default(null),
          completedAt: sb.date().default(null),
          updatedAt: sb.date().default('now'),
        })
        .build(),
    )
  }
}

export default SchemaDataTransferJob
