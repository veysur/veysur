// Generated from Notification.ts by datacapy-gen. Do not edit.
// cspell:disable
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import type { AssertSchema } from '@datacapy/schema'
import type { NotificationFields } from './Notification'
import { initialisers } from '../schema/registry'

export class SchemaNotification extends Schema.from(
  sb
    .schema('notification')
    .construct('Notification')
    .strict()
    .shape({
      _id: sb.string().required().init(initialisers.genUniqueId).maxLength(17),
      type: sb
        .string()
        .required()
        .default('dataTransferJob')
        .inArray(['dataTransferJob']),
      projectId: sb.string().required().init('').maxLength(17),
      recipientUserId: sb.string().required().init('').maxLength(17),
      dataTransferJobId: sb.string().default(null).maxLength(17),
      level: sb
        .string()
        .required()
        .default('info')
        .inArray(['info', 'success', 'error']),
      title: sb.string().required().init('').maxLength(255),
      message: sb.string().default(null),
      status: sb
        .string()
        .required()
        .default('unread')
        .inArray(['unread', 'read', 'dismissed']),
      createdAt: sb.date().default('now'),
      readAt: sb.date().default(null),
      dismissedAt: sb.date().default(null),
      dataTransferJob: sb
        .mixed()
        .default(null)
        .construct('DataTransferJob')
        .relation()
        .nullable()
        .optional(),
    }),
) {}

const _checkSchemaNotification: AssertSchema<
  SchemaNotification,
  NotificationFields
> = true
void _checkSchemaNotification
