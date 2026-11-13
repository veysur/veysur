// Generated from File.ts by datacapy-gen. Do not edit.
// cspell:disable
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import type { AssertSchema } from '@datacapy/schema'
import type { FileFields } from './File'

export class SchemaFile extends Schema.from(
  sb
    .schema('file')
    .construct('File')
    .strict()
    .shape({
      _id: sb.string().required().maxLength(17),
      filename: sb.string().required().maxLength(255),
      storedFilename: sb.string().required().maxLength(255),
      hash: sb.string().default(null).minLength(64).maxLength(64),
      size: sb.number().required(),
      mimeType: sb
        .string()
        .required()
        .inArray<string>([
          'image/png',
          'image/jpeg',
          'image/jpg',
          'image/webp',
          'text/csv',
          'text/markdown',
          'application/octet-stream',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ])
        .maxLength(127),
      filePath: sb.string().required().maxLength(512),
      uploadedAt: sb.date().default(null),
      createdById: sb.string().required().maxLength(17),
      surveyId: sb.string().default(null).maxLength(17),
      responseId: sb.string().default(null).maxLength(17),
      fileContext: sb
        .string()
        .default(null)
        .inArray(['import', 'project', 'survey', 'response', 'temp']),
      bucketType: sb.string().default('public').inArray(['public', 'private']),
      createdAt: sb.date().default('now'),
      updatedAt: sb.date().default('now'),
      deletedAt: sb.date().default(null),
      refs: sb
        .array(
          sb
            .object({
              type: sb.string().required().maxLength(50),
              id: sb.string().required().maxLength(17),
            })
            .required(),
        )
        .default(null),
      imageSetId: sb.string().default(null).maxLength(128),
      imageVariant: sb
        .string()
        .default(null)
        .inArray(['original', 'edited', 'thumb']),
      import: sb
        .object({
          entityType: sb.string(),
          format: sb.string(),
          options: sb
            .object({
              force: sb.boolean(),
              surveyId: sb.string().nullable(),
              publicationId: sb.string().nullable(),
              snapshotId: sb.string().nullable(),
              apply: sb.array(sb.string().required()).default(null).optional(),
            })
            .nullable(),
          status: sb
            .string()
            .inArray(['pending', 'processing', 'completed', 'failed', 'queued'])
            .nullable(),
          result: sb
            .object({
              success: sb.boolean().required(),
              entityId: sb.string(),
              entityType: sb.string(),
              hasIdTranslations: sb.boolean().nullable(),
              repairs: sb.array().nullable(),
              discards: sb.array().nullable(),
              warnings: sb.array().nullable(),
              details: sb.array().nullable(),
              error: sb.string(),
            })
            .nullable(),
        })
        .default(null)
        .nullable(),
    }),
) {}

const _checkSchemaFile: AssertSchema<SchemaFile, FileFields> = true
void _checkSchemaFile
