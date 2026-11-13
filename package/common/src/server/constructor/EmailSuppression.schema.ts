// Generated from EmailSuppression.ts by datacapy-gen. Do not edit.
// cspell:disable
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import type { AssertSchema } from '@datacapy/schema'
import type { EmailSuppressionData } from './EmailSuppression'
import { initialisers } from '../../model/schema/registry'

export class SchemaEmailSuppression extends Schema.from(
  sb
    .schema('emailSuppression')
    .construct('EmailSuppression')
    .strict()
    .shape({
      _id: sb.string().required().init(initialisers.genUniqueId).maxLength(17),
      email: sb
        .string()
        .required()
        .maxLength(255)
        .email()
        .notNull()
        .trim()
        .lowercase(),
      reason: sb
        .string()
        .required()
        .inArray(['hardBounce', 'softBounce', 'complaint', 'unsubscribe'])
        .maxLength(255)
        .notNull(),
      hardBounceEvents: sb
        .array(
          sb
            .object({
              occurredAt: sb.date().default('now'),
              projectId: sb.string().default(null).maxLength(17),
              surveyId: sb.string().default(null).maxLength(17),
              participantId: sb.string().default(null).maxLength(17),
            })
            .required(),
        )
        .default([]),
      softBounceEvents: sb
        .array(
          sb
            .object({
              occurredAt: sb.date().default('now'),
              projectId: sb.string().default(null).maxLength(17),
              surveyId: sb.string().default(null).maxLength(17),
              participantId: sb.string().default(null).maxLength(17),
            })
            .required(),
        )
        .default([]),
      complaintEvents: sb
        .array(
          sb
            .object({
              occurredAt: sb.date().default('now'),
              projectId: sb.string().default(null).maxLength(17),
              surveyId: sb.string().default(null).maxLength(17),
              participantId: sb.string().default(null).maxLength(17),
            })
            .required(),
        )
        .default([]),
      unsubscribeEvents: sb
        .array(
          sb
            .object({
              occurredAt: sb.date().default('now'),
              projectId: sb.string().default(null).maxLength(17),
              surveyId: sb.string().default(null).maxLength(17),
              participantId: sb.string().default(null).maxLength(17),
            })
            .required(),
        )
        .default([]),
      expiresAt: sb.date().default(null),
      participantId: sb.string().default(null).maxLength(17),
      createdAt: sb.date().default('now'),
      updatedAt: sb.date().default('now'),
    }),
) {}

const _checkSchemaEmailSuppression: AssertSchema<
  SchemaEmailSuppression,
  EmailSuppressionData
> = true
void _checkSchemaEmailSuppression
