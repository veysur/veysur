import { genUniqueId } from '@datacapy/id'
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

import { SCHEMA_LENGTH_MAX_INTERNAL_ID } from './constant'
import { DataTransferJob } from '../constructor/DataTransferJob'

export const notificationSpec = {
  _id: sb
    .string()
    .required()
    .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID)
    .init(genUniqueId),
  type: sb
    .string()
    .required()
    .inArray(['dataTransferJob'])
    .default('dataTransferJob'),
  projectId: sb
    .string()
    .required()
    .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID)
    .init(''),
  recipientUserId: sb
    .string()
    .required()
    .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID)
    .init(''),
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
  title: sb.string().required().maxLength(255).init(''),
  message: sb.string().nullable().default(null),
  status: sb
    .string()
    .required()
    .inArray(['unread', 'read', 'dismissed'])
    .default('unread'),
  createdAt: sb.date().default('now'),
  readAt: sb.date().default(null),
  dismissedAt: sb.date().default(null),
  // Populated relation: the job that produced the notification
  dataTransferJob: sb
    .mixed()
    .construct(() => DataTransferJob)
    .relation()
    .nullable()
    .default(null),
}

export class SchemaNotification extends Schema<typeof notificationSpec> {
  constructor() {
    super(
      sb
        .schema('notification')
        .construct('Notification')
        .strict()
        .shape(notificationSpec),
    )
  }
}

export default SchemaNotification
