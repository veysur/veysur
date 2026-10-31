import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

export const projectAdminShape = {
  _id: sb.string().required(),
  projectId: sb.string().required(),
  userId: sb.string().default(null).optional(),
  createdById: sb.string().required(),
  status: sb.string().default('active').optional(),
  email: sb.string().default(null).optional(),
  nameFirst: sb.string().default(null).optional(),
  nameLast: sb.string().default(null).optional(),
  code: sb.string().default(null).optional(),
  createdAt: sb.date().default('now'),
  updatedAt: sb.date().default('now'),
}

export class SchemaProjectAdmin extends Schema<typeof projectAdminShape> {
  constructor() {
    super(
      sb
        .schema('projectAdmin')
        .construct('ProjectAdmin')
        .strict()
        .shape(projectAdminShape),
    )
  }
}
