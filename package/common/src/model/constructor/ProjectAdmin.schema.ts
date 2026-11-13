// Generated from ProjectAdmin.ts by datacapy-gen. Do not edit.
// cspell:disable
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import type { AssertSchema } from '@datacapy/schema'
import type { ProjectAdminData } from './ProjectAdmin'

export class SchemaProjectAdmin extends Schema.from(
  sb
    .schema('projectAdmin')
    .construct('ProjectAdmin')
    .strict()
    .shape({
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
    }),
) {}

const _checkSchemaProjectAdmin: AssertSchema<
  SchemaProjectAdmin,
  ProjectAdminData
> = true
void _checkSchemaProjectAdmin
