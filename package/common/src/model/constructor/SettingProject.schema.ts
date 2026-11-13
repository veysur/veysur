// Generated from SettingProject.ts by datacapy-gen. Do not edit.
// cspell:disable
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import type { AssertSchema } from '@datacapy/schema'
import type { SettingProjectDocument } from './SettingProject'

export class SchemaSettingProject extends Schema.from(
  sb
    .schema('settingProject')
    .construct('SettingProject')
    .strict()
    .shape({
      _id: sb.string().required(),
      maps: sb.object({ googleApiKey: sb.string(), provider: sb.string() }),
      botProtection: sb.object({
        provider: sb.string(),
        cloudflare: sb.object({
          siteKey: sb.string(),
          secretKey: sb.string().encrypt(),
        }),
        google: sb.object({
          siteKey: sb.string(),
          secretKey: sb.string().encrypt(),
        }),
      }),
      createdAt: sb.date().default('now'),
      updatedAt: sb.date().default('now'),
    }),
) {}

const _checkSchemaSettingProject: AssertSchema<
  SchemaSettingProject,
  SettingProjectDocument
> = true
void _checkSchemaSettingProject
