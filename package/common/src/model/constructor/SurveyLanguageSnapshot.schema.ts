// Generated from SurveyLanguageSnapshot.ts by datacapy-gen. Do not edit.
// cspell:disable
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import type { AssertSchema } from '@datacapy/schema'
import type { SurveyLanguageSnapshotFields } from './SurveyLanguageSnapshot'
import { initialisers } from '../schema/registry'

export class SchemaSurveyLanguageSnapshot extends Schema.from(
  sb
    .schema('surveyLanguageSnapshot')
    .construct('SurveyLanguageSnapshot')
    .strict()
    .shape({
      _id: sb.string().required().init(initialisers.genUniqueId).maxLength(17),
      snapshotId: sb.string().required().maxLength(17),
      surveyId: sb.string().required().maxLength(17),
      languageCode: sb.string().required().maxLength(2),
      contentHash: sb.string().required().minLength(64).maxLength(64),
      data: sb
        .object()
        .as<NonNullable<SurveyLanguageSnapshotFields['data']>>()
        .required()
        .init({})
        .strict(false),
      createdAt: sb.date().default('now'),
      updatedAt: sb.date().default('now'),
    }),
) {}

const _checkSchemaSurveyLanguageSnapshot: AssertSchema<
  SchemaSurveyLanguageSnapshot,
  SurveyLanguageSnapshotFields
> = true
void _checkSchemaSurveyLanguageSnapshot
