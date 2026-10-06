import { Schema, sb } from '@datacapy/schema'
import {
  ALLOWED_FILE_MIME_TYPES,
  SCHEMA_LENGTH_MAX_INTERNAL_ID,
} from './constant'

export class SchemaFile extends Schema {
  constructor() {
    super(
      sb
        .schema('file')
        .construct('File')
        .strict()
        .shape({
          _id: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          filename: sb.string().required().maxLength(255),
          storedFilename: sb.string().required().maxLength(255),
          // SHA256 hex string (null allowed for placeholder files)
          hash: sb.string().minLength(64).maxLength(64).default(null),
          size: sb.number().required(),
          mimeType: sb
            .string()
            .required()
            .maxLength(127)
            .inArray(ALLOWED_FILE_MIME_TYPES),
          filePath: sb.string().required().maxLength(512),
          uploadedAt: sb.date().default(null),
          createdById: sb
            .string()
            .required()
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          surveyId: sb
            .string()
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID)
            .default(null),
          responseId: sb
            .string()
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID)
            .default(null),
          fileContext: sb
            .string()
            .inArray(['project', 'survey', 'response', 'temp', 'import'])
            .default(null),
          bucketType: sb
            .string()
            .inArray(['public', 'private'])
            .default('public'),
          createdAt: sb.date().default('now'),
          updatedAt: sb.date().default('now'),
          deletedAt: sb.date().default(null),
          refs: sb
            .array()
            .nullable()
            .default(null)
            .of(
              sb.object({
                type: sb.string().required().maxLength(50),
                id: sb
                  .string()
                  .required()
                  .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
              }),
            ),
          imageSetId: sb.string().default(null).maxLength(128),
          imageVariant: sb
            .string()
            .inArray(['original', 'edited', 'thumb'])
            .default(null),
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
                  // parts of a project settings (.vsps) import to apply
                  apply: sb.array().of(sb.string()).nullable(),
                })
                .nullable(),
              status: sb
                .string()
                .nullable()
                .inArray([
                  'pending',
                  'queued',
                  'processing',
                  'completed',
                  'failed',
                ]),
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
            .nullable()
            .default(null),
        })
        .build(),
    )
  }
}

export default SchemaFile
