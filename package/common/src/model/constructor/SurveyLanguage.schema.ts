// Generated from SurveyLanguage.ts by datacapy-gen. Do not edit.
// cspell:disable
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import type { AssertSchema } from '@datacapy/schema'
import type { SurveyLanguageFields } from './SurveyLanguage'
import { initialisers } from '../schema/registry'

export class SchemaSurveyLanguage extends Schema.from(
  sb
    .schema('surveyLanguage')
    .construct('SurveyLanguage')
    .strict()
    .shape({
      _id: sb.string().required().init(initialisers.genUniqueId).maxLength(17),
      surveyId: sb.string().required().maxLength(17),
      languageCode: sb.string().required().maxLength(2),
      data: sb
        .object()
        .as<NonNullable<SurveyLanguageFields['data']>>()
        .required()
        .init({})
        .strict(false),
      createdAt: sb.date().default('now'),
      updatedAt: sb.date().default('now'),
    }),
) {}

const _checkSchemaSurveyLanguage: AssertSchema<
  SchemaSurveyLanguage,
  SurveyLanguageFields
> = true
void _checkSchemaSurveyLanguage
