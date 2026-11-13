// Generated from SurveyParticipantAttribute.ts by datacapy-gen. Do not edit.
// cspell:disable
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import type { AssertSchema } from '@datacapy/schema'
import type { SurveyParticipantAttributeFields } from './SurveyParticipantAttribute'
import { initialisers } from '../schema/registry'

export class SchemaSurveyParticipantAttribute extends Schema.from(
  sb
    .schema('surveyParticipantAttribute')
    .construct('SurveyParticipantAttribute')
    .strict()
    .shape({
      _id: sb.string().required().init(initialisers.genUniqueId).maxLength(17),
      surveyId: sb.string().required().maxLength(17),
      attributes: sb
        .array()
        .as<
          NonNullable<SurveyParticipantAttributeFields['attributes']>[number]
        >()
        .default([]),
      createdAt: sb.date().default('now'),
      updatedAt: sb.date().default('now'),
    }),
) {}

const _checkSchemaSurveyParticipantAttribute: AssertSchema<
  SchemaSurveyParticipantAttribute,
  SurveyParticipantAttributeFields
> = true
void _checkSchemaSurveyParticipantAttribute
