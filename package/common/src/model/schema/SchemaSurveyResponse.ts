import { Schema, sb } from '@datacapy/schema'

import {
  SCHEMA_LENGTH_MAX_INTERNAL_ID,
  SCHEMA_LENGTH_MAX_TEXT,
  SCHEMA_LENGTH_MAX_LANG,
} from './constant'

export class SchemaSurveyResponse extends Schema {
  constructor() {
    super(
      sb
        .schema('surveyResponse')
        .construct('SurveyResponse')
        .strict()
        .shape({
          _id: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          surveyId: sb
            .string()
            .required()
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          snapshotId: sb
            .string()
            .required()
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          publicationId: sb.string().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          participantId: sb
            .string()
            .nullable()
            .default(null)
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          sessionId: sb
            .string()
            .nullable()
            .default(null)
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          // The language the participant was viewing/answering the survey in
          // (the live content-language selection at save time) - distinct
          // from participant.language, the participant's stored profile
          // preference. Addressable in conditions as `response.language`.
          language: sb
            .string()
            .nullable()
            .default(null)
            .maxLength(SCHEMA_LENGTH_MAX_LANG),
          answers: sb
            .object()
            .noCast()
            .matchAll(
              sb.or([
                sb.boolean(),
                sb.number(),
                // Multiple choice answers stored as object: { [optionCode]: true }
                sb.object().noCast().matchAll(sb.boolean()),
                sb.string().maxLength(SCHEMA_LENGTH_MAX_TEXT),
              ]),
            ),
          randomSeeds: sb.object().nullable().default({}).matchAll(sb.number()),
          ip: sb.string().nullable().default(null).maxLength(45),
          referrerUrl: sb.string().nullable().default(null).maxLength(512),
          merge: sb.object().nullable().default(null).shape({
            fromSnapshotId: sb.string(),
            origResponseId: sb.string(),
            at: sb.date(),
          }),
          completed: sb.boolean().default(false),
          completedAt: sb.date().default(null),
          startedAt: sb.date().default(null),
          createdAt: sb.date().default('now'),
          updatedAt: sb.date().default('now'),
        })
        .build(),
    )
  }
}
