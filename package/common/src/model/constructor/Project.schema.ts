// Generated from Project.ts by datacapy-gen. Do not edit.
// cspell:disable
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import type { AssertSchema } from '@datacapy/schema'
import type { Project } from './Project'

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

const _checkSchemaProject: AssertSchema<
  SchemaProject,
  Pick<
    Project,
    '_id' | 'name' | 'timezone' | 'ownerId' | 'createdAt' | 'updatedAt'
  >
> = true
void _checkSchemaProject
