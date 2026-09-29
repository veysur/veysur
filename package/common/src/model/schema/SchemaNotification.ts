import { Schema, sb } from '@datacapy/schema'

import { SCHEMA_LENGTH_MAX_INTERNAL_ID } from './constant'

export class SchemaNotification extends Schema {
  constructor() {
    super(
      sb
        .schema('notification')
        .construct('Notification')
        .strict()
        .shape({
          _id: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          type: sb
            .string()
            .required()
            .inArray(['dataTransferJob'])
            .default('dataTransferJob'),
          projectId: sb
            .string()
            .required()
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          recipientUserId: sb
            .string()
            .required()
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          dataTransferJobId: sb
            .string()
            .nullable()
            .default(null)
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          level: sb
            .string()
            .required()
            .inArray(['info', 'success', 'error'])
            .default('info'),
          title: sb.string().required().maxLength(255),
          message: sb.string().nullable().default(null),
          status: sb
            .string()
            .required()
            .inArray(['unread', 'read', 'dismissed'])
            .default('unread'),
          createdAt: sb.date().default('now'),
          readAt: sb.date().default(null),
          dismissedAt: sb.date().default(null),
        })
        .build(),
    )
  }
}

export default SchemaNotification
