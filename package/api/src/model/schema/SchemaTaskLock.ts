import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

export class SchemaTaskLock extends Schema.from(
  sb
    .schema('taskLock')
    .construct('TaskLock')
    .strict()
    .shape({
      _id: sb.string().required().init(''),
      lockKey: sb.string().required().maxLength(255).init(''),
      resourceType: sb.string().required().maxLength(100).init(''),
      resourceId: sb.string().required().maxLength(255).init(''),
      executionId: sb.string().required().maxLength(255).init(''),
      lockedAt: sb
        .date()
        .required()
        .init(() => new Date()),
      expiresAt: sb
        .date()
        .required()
        .init(() => new Date()),
      note: sb.string().maxLength(1000).default(null),
    }),
) {}

export default SchemaTaskLock
