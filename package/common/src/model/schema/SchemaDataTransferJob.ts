import { genUniqueId } from '@datacapy/id'
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

import { SCHEMA_LENGTH_MAX_INTERNAL_ID } from './constant'

export class SchemaDataTransferJob extends Schema.from(
  sb
    .schema('dataTransferJob')
    .construct('DataTransferJob')
    .strict()
    .shape({
      _id: sb
        .string()
        .required()
        .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID)
        .init(genUniqueId),
      direction: sb
        .string()
        .required()
        .inArray(['import', 'export'])
        .default('export'),
      entityType: sb.string().required().maxLength(64).init(''),
      entityId: sb
        .string()
        .nullable()
        .default(null)
        .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
      label: sb.string().nullable().default(null).maxLength(255),
      format: sb.string().required().maxLength(16).init(''),
      options: sb
        .object()
        .as<Record<string, unknown>>()
        .nullable()
        .default({}),
      sourceFileId: sb
        .string()
        .nullable()
        .default(null)
        .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
      /**
       * The uploaded import file's content hash, used to dedup a resubmission
       * of the same file while a prior job for it is still active. Unused for
       * export jobs.
       */
      sourceFileHash: sb.string().nullable().default(null).maxLength(64),
      projectId: sb
        .string()
        .required()
        .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID)
        .init(''),
      requestedByUserId: sb
        .string()
        .required()
        .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID)
        .init(''),
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
    }),
) {}

export default SchemaDataTransferJob
