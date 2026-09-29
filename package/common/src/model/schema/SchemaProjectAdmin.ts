import { Schema, sb } from '@datacapy/schema'

export class SchemaProjectAdmin extends Schema {
  constructor() {
    super(
      sb
        .schema('projectAdmin')
        .construct('ProjectAdmin')
        .strict()
        .shape({
          _id: sb.string().required(),
          projectId: sb.string().required(),
          userId: sb.string().default(null),
          createdById: sb.string().required(),
          status: sb.string().default('active'),
          email: sb.string().default(null),
          nameFirst: sb.string().default(null),
          nameLast: sb.string().default(null),
          code: sb.string().default(null),
          createdAt: sb.date().default('now'),
          updatedAt: sb.date().default('now'),
        })
        .build(),
    )
  }
}
