// Generated from DataTransferJob.ts by datacapy-gen. Do not edit.
// cspell:disable
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import type { AssertSchema } from '@datacapy/schema'
import type { DataTransferJobData } from './DataTransferJob'
import { initialisers } from '../schema/registry'

export class SchemaDataTransferJob extends Schema.from(
  sb
    .schema('dataTransferJob')
    .construct('DataTransferJob')
    .strict()
    .shape({
      _id: sb.string().required().init(initialisers.genUniqueId).maxLength(17),
      direction: sb
        .string()
        .required()
        .default('export')
        .inArray(['import', 'export']),
      entityType: sb.string().required().init('').maxLength(64),
      entityId: sb.string().default(null).maxLength(17),
      label: sb.string().default(null).maxLength(255),
      format: sb.string().required().init('').maxLength(16),
      options: sb
        .object()
        .as<Record<string, unknown>>()
        .default({})
        .strict(false)
        .nullable(),
      sourceFileId: sb.string().default(null).maxLength(17),
      sourceFileHash: sb.string().default(null).maxLength(64),
      projectId: sb.string().required().init('').maxLength(17),
      requestedByUserId: sb.string().required().init('').maxLength(17),
      requestHost: sb.string().default(null).maxLength(255),
      requestProto: sb.string().default(null).maxLength(16),
      status: sb
        .string()
        .required()
        .default('pending')
        .inArray(['pending', 'processing', 'completed', 'failed']),
      resultFileId: sb.string().default(null).maxLength(17),
      error: sb.string().default(null),
      createdAt: sb.date().default('now'),
      startedAt: sb.date().default(null),
      completedAt: sb.date().default(null),
      updatedAt: sb.date().default('now'),
    }),
) {}

const _checkSchemaDataTransferJob: AssertSchema<
  SchemaDataTransferJob,
  DataTransferJobData
> = true
void _checkSchemaDataTransferJob
