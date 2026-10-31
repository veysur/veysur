import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

import { SCHEMA_LENGTH_MAX_INTERNAL_ID } from './constant'

export const notificationShape = {
  _id: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  type: sb
    .string()
    .required()
    .inArray(['dataTransferJob'])
    .default('dataTransferJob'),
  projectId: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
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
}

export class SchemaNotification extends Schema<typeof notificationShape> {
  constructor() {
    super(
      sb
        .schema('notification')
        .construct('Notification')
        .strict()
        .shape(notificationShape),
    )
  }
}

export default SchemaNotification
