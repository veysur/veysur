import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

export class SchemaEmail extends Schema.from(
  sb.schema('email').shape({
    _id: sb.string(),
    userId: sb.string().default(null),
    projectId: sb.string().default(null),
    service: sb.string().required().notNull().maxLength(127).lowercase().trim(),
    type: sb.string().required().notNull().maxLength(512).lowercase().trim(),
    to: sb
      .string()
      .required()
      .notNull()
      .email()
      .maxLength(512)
      .lowercase()
      .trim(),
    from: sb
      .string()
      .required()
      .notNull()
      .email()
      .maxLength(512)
      .lowercase()
      .trim(),
    envelopeFrom: sb.string().email().maxLength(512).lowercase().trim(),
    subject: sb.string().required().notNull().maxLength(2048).trim(),
    template: sb.string().maxLength(2048).trim().default(null),
    html: sb.string().maxLength(50000).trim().default(null),
    text: sb.string().maxLength(50000).trim().default(null),
    templateData: sb.object(),
    messageId: sb.string().maxLength(2048).trim(),
    data: sb.object(),
    error: sb.string().maxLength(2048).trim(),
    attempts: sb.number().default(0),
    status: sb.string().inArray(['pending', 'sent', 'error']).default('sent'),
    scheduledAt: sb.date().default(null),
    sent: sb.date().default(null),
    updatedAt: sb.date().default(null),
    createdAt: sb.date().default('now'),
  }),
) {}

export default SchemaEmail
