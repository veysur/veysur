// Generated from Project.ts by datacapy-gen. Do not edit.
// cspell:disable
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import type { AssertSchema } from '@datacapy/schema'
import type { ProjectFields } from './Project'

export class SchemaProject extends Schema.from(
  sb
    .schema('project')
    .construct('Project')
    .strict()
    .shape({
      _id: sb.string().required(),
      name: sb.string().required(),
      timezone: sb.string().default('UTC'),
      ownerId: sb.string().default(''),
      createdAt: sb.date().default('now'),
      updatedAt: sb.date().default('now'),
    }),
) {}

const _checkSchemaProject: AssertSchema<SchemaProject, ProjectFields> = true
void _checkSchemaProject
