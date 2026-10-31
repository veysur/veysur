import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

import { SCHEMA_LENGTH_MAX_INTERNAL_ID } from './constant'

export const dataTransferJobShape = {
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
  options: sb.object().as<Record<string, unknown>>().nullable().default(null),
  sourceFileId: sb
    .string()
    .nullable()
    .default(null)
    .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  sourceFileHash: sb.string().nullable().default(null).maxLength(64),
  projectId: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
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
}

export class SchemaDataTransferJob extends Schema<typeof dataTransferJobShape> {
  constructor() {
    super(
      sb
        .schema('dataTransferJob')
        .construct('DataTransferJob')
        .strict()
        .shape(dataTransferJobShape),
    )
  }
}

export default SchemaDataTransferJob
