import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

export const eventLogFields = {
  _id: sb.string(),
  action: sb.string().required().notNull().maxLength(255),
  userId: sb.string().default(null),
  metadata: sb.object().as<Record<string, unknown>>().default(null),
  createdAt: sb.date().required().default('now'),
}

export class SchemaEventLog extends Schema.from(
  sb.schema('eventLog').strict().shape(eventLogFields),
) {}

export default SchemaEventLog
