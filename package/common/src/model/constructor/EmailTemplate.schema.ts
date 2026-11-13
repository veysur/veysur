// Generated from EmailTemplate.ts by datacapy-gen. Do not edit.
// cspell:disable
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import type { AssertSchema } from '@datacapy/schema'
import type { EmailTemplateData } from './EmailTemplate'
import { initialisers } from '../schema/registry'

export class SchemaEmailTemplate extends Schema.from(
  sb
    .schema('emailTemplate')
    .construct('EmailTemplate')
    .strict()
    .shape({
      _id: sb.string().required().init(initialisers.genUniqueId),
      surveyId: sb.string().required().init(null).nullable(),
      type: sb
        .string()
        .required()
        .inArray<string>([
          'invite',
          'reminder',
          'thankYou',
          'adminBasic',
          'adminDetail',
          'team-invite',
        ]),
      lang: sb.string().required().maxLength(3),
      subject: sb.string().required().default(null).trim().stripHtml(),
      body: sb.string().required().default(null).trim(),
      createdAt: sb.date().default('now'),
      updatedAt: sb.date().default('now'),
    }),
) {}

const _checkSchemaEmailTemplate: AssertSchema<
  SchemaEmailTemplate,
  EmailTemplateData
> = true
void _checkSchemaEmailTemplate
