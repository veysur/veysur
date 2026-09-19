import { Schema, sb } from 'mzen-schema'
import {
  SCHEMA_LENGTH_MAX_INTERNAL_ID,
  SCHEMA_LENGTH_MAX_INPUT,
} from './constant'

const suppressionEvents = () =>
  sb
    .array()
    .default([])
    .of(
      sb.object().shape({
        occurredAt: sb.date().default('now'),
        projectId: sb
          .string()
          .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID)
          .default(null),
        surveyId: sb
          .string()
          .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID)
          .default(null),
        participantId: sb
          .string()
          .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID)
          .default(null),
      }),
    )

export class SchemaEmailSuppression extends Schema {
  constructor() {
    super(
      sb
        .schema('emailSuppression')
        .construct('EmailSuppression')
        .strict()
        .shape({
          _id: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          email: sb
            .string()
            .required()
            .notNull()
            .email()
            .maxLength(SCHEMA_LENGTH_MAX_INPUT)
            .lowercase()
            .trim(),
          reason: sb
            .string()
            .required()
            .notNull()
            .inArray(['hardBounce', 'softBounce', 'complaint', 'unsubscribe'])
            .maxLength(SCHEMA_LENGTH_MAX_INPUT),
          hardBounceEvents: suppressionEvents(),
          softBounceEvents: suppressionEvents(),
          complaintEvents: suppressionEvents(),
          unsubscribeEvents: suppressionEvents(),
          expiresAt: sb.date().default(null),
          participantId: sb
            .string()
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID)
            .default(null),
          createdAt: sb.date().default('now'),
          updatedAt: sb.date().default('now'),
        })
        .build(),
    )
  }
}

export default SchemaEmailSuppression
