// Generated from SurveyParticipantAttributeSnapshot.ts by datacapy-gen. Do not edit.
// cspell:disable
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import type { AssertSchema } from '@datacapy/schema'
import type { SurveyParticipantAttributeSnapshotFields } from './SurveyParticipantAttributeSnapshot'
import { initialisers } from '../schema/registry'

export class SchemaSurveyParticipantAttributeSnapshot extends Schema.from(
  sb
    .schema('surveyParticipantAttributeSnapshot')
    .construct('SurveyParticipantAttributeSnapshot')
    .strict()
    .shape({
      _id: sb.string().required().init(initialisers.genUniqueId).maxLength(17),
      snapshotId: sb.string().required().maxLength(17),
      surveyId: sb.string().required().maxLength(17),
      attributes: sb
        .array()
        .as<
          NonNullable<
            SurveyParticipantAttributeSnapshotFields['attributes']
          >[number]
        >()
        .default([]),
      contentHash: sb.string().required().minLength(64).maxLength(64),
      createdAt: sb.date().default('now'),
      updatedAt: sb.date().default('now'),
    }),
) {}

const _checkSchemaSurveyParticipantAttributeSnapshot: AssertSchema<
  SchemaSurveyParticipantAttributeSnapshot,
  SurveyParticipantAttributeSnapshotFields
> = true
void _checkSchemaSurveyParticipantAttributeSnapshot
