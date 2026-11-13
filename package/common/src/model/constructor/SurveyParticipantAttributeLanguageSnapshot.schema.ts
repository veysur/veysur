// Generated from SurveyParticipantAttributeLanguageSnapshot.ts by datacapy-gen. Do not edit.
// cspell:disable
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import type { AssertSchema } from '@datacapy/schema'
import type { SurveyParticipantAttributeLanguageSnapshotFields } from './SurveyParticipantAttributeLanguageSnapshot'
import { initialisers } from '../schema/registry'

export class SchemaSurveyParticipantAttributeLanguageSnapshot extends Schema.from(
  sb
    .schema('surveyParticipantAttributeLanguageSnapshot')
    .construct('SurveyParticipantAttributeLanguageSnapshot')
    .strict()
    .shape({
      _id: sb.string().required().init(initialisers.genUniqueId).maxLength(17),
      snapshotId: sb.string().required().maxLength(17),
      surveyId: sb.string().required().maxLength(17),
      languageCode: sb.string().required().maxLength(2),
      data: sb
        .object()
        .as<
          NonNullable<SurveyParticipantAttributeLanguageSnapshotFields['data']>
        >()
        .default({})
        .strict(false),
      contentHash: sb.string().required().minLength(64).maxLength(64),
      createdAt: sb.date().default('now'),
      updatedAt: sb.date().default('now'),
    }),
) {}

const _checkSchemaSurveyParticipantAttributeLanguageSnapshot: AssertSchema<
  SchemaSurveyParticipantAttributeLanguageSnapshot,
  SurveyParticipantAttributeLanguageSnapshotFields
> = true
void _checkSchemaSurveyParticipantAttributeLanguageSnapshot
