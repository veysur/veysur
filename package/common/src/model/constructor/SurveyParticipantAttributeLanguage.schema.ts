// Generated from SurveyParticipantAttributeLanguage.ts by datacapy-gen. Do not edit.
// cspell:disable
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import type { AssertSchema } from '@datacapy/schema'
import type { SurveyParticipantAttributeLanguageFields } from './SurveyParticipantAttributeLanguage'
import { initialisers } from '../schema/registry'

export class SchemaSurveyParticipantAttributeLanguage extends Schema.from(
  sb
    .schema('surveyParticipantAttributeLanguage')
    .construct('SurveyParticipantAttributeLanguage')
    .strict()
    .shape({
      _id: sb.string().required().init(initialisers.genUniqueId).maxLength(17),
      surveyId: sb.string().required().maxLength(17),
      languageCode: sb.string().required().maxLength(2),
      data: sb
        .object()
        .as<NonNullable<SurveyParticipantAttributeLanguageFields['data']>>()
        .default({})
        .strict(false),
      createdAt: sb.date().default('now'),
      updatedAt: sb.date().default('now'),
    }),
) {}

const _checkSchemaSurveyParticipantAttributeLanguage: AssertSchema<
  SchemaSurveyParticipantAttributeLanguage,
  SurveyParticipantAttributeLanguageFields
> = true
void _checkSchemaSurveyParticipantAttributeLanguage
