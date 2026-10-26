import { Schema, sb } from '@datacapy/schema'

export class SchemaTaskLock extends Schema {
  constructor() {
    super(
      sb
        .schema('taskLock')
        .construct('TaskLock')
        .strict()
        .shape({
          _id: sb.string().required().default(''),
          lockKey: sb.string().required().maxLength(255).default(null),
          resourceType: sb.string().required().maxLength(100).default(null),
          resourceId: sb.string().required().maxLength(255).default(null),
          executionId: sb.string().required().maxLength(255).default(null),
          lockedAt: sb.date().required().default(null),
          expiresAt: sb.date().required().default(null),
          note: sb.string().maxLength(1000).default(null),
        }),
    )
  }
}

export default SchemaTaskLock
