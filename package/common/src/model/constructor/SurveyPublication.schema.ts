// Generated from SurveyPublication.ts by datacapy-gen. Do not edit.
// cspell:disable
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import type { AssertSchema } from '@datacapy/schema'
import type { SurveyPublicationFields } from './SurveyPublication'
import { initialisers } from '../schema/registry'

export class SchemaSurveyPublication extends Schema.from(
  sb
    .schema('surveyPublication')
    .construct('SurveyPublication')
    .strict()
    .shape({
      _id: sb.string().required().init(initialisers.genUniqueId).maxLength(17),
      snapshotId: sb.string().required().maxLength(17),
      surveyId: sb.string().required().maxLength(17),
      publishedById: sb.string().required().maxLength(17),
      label: sb.string().default(null),
      notes: sb.string().default(null),
      publishedAt: sb.date().default('now'),
      stoppedAt: sb.date().default(null),
      createdAt: sb.date().default('now'),
      updatedAt: sb.date().default('now'),
      responseCount: sb.number().relation(),
    }),
) {}

const _checkSchemaSurveyPublication: AssertSchema<
  SchemaSurveyPublication,
  SurveyPublicationFields
> = true
void _checkSchemaSurveyPublication
