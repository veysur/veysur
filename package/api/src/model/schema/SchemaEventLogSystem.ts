import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

import { eventLogFields } from './SchemaEventLog'

export class SchemaEventLogSystem extends Schema.from(
  sb.schema('eventLogSystem').strict().shape(eventLogFields),
) {}

export default SchemaEventLogSystem
