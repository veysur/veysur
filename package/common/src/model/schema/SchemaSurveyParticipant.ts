import { Schema, sb } from '@datacapy/schema'

import {
  SCHEMA_LENGTH_MAX_INPUT,
  SCHEMA_LENGTH_MAX_INTERNAL_ID,
  SCHEMA_LENGTH_MAX_LANG,
  SCHEMA_LENGTH_MAX_PARTICIPANT_ATTRIBUTE_VALUE,
} from './constant'

export class SchemaSurveyParticipant extends Schema {
  constructor() {
    super(
      sb
        .schema('surveyParticipant')
        .construct('SurveyParticipant')
        .strict()
        .shape({
          _id: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          surveyId: sb
            .string()
            .required()
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          createdById: sb
            .string()
            .required()
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          token: sb
            .string()
            .maxLength(SCHEMA_LENGTH_MAX_INPUT)
            .trim()
            .default(null),
          emailVerifyToken: sb
            .string()
            .maxLength(SCHEMA_LENGTH_MAX_INPUT)
            .trim()
            .default(null),
          nameFirst: sb
            .string()
            .required()
            .notNull()
            .maxLength(SCHEMA_LENGTH_MAX_INPUT)
            .trim(),
          nameLast: sb
            .string()
            .required()
            .notNull()
            .maxLength(SCHEMA_LENGTH_MAX_INPUT)
            .trim(),
          email: sb
            .string()
            .required()
            .notNull()
            .email()
            .maxLength(SCHEMA_LENGTH_MAX_INPUT)
            .lowercase()
            .trim(),
          emailStatus: sb
            .string()
            .maxLength(SCHEMA_LENGTH_MAX_INPUT)
            .trim()
            .inArray(['pending', 'verified', 'invalid'])
            .default('pending'),
          bounceType: sb
            .string()
            .maxLength(SCHEMA_LENGTH_MAX_INPUT)
            .trim()
            .default(null),
          bounceAt: sb.date().default(null),
          complaintAt: sb.date().default(null),
          language: sb
            .string()
            .required()
            .notNull()
            .maxLength(SCHEMA_LENGTH_MAX_LANG)
            .trim(),
          inviteSentAt: sb.date().default(null),
          reminderSentAt: sb.date().default(null),
          inviteQueuedAt: sb.date().default(null),
          reminderQueuedAt: sb.date().default(null),
          validFrom: sb.date().default(null),
          validTo: sb.date().default(null),
          attributes: sb
            .object()
            .strict(false)
            .default({})
            .matchAll(
              sb
                .string()
                .maxLength(SCHEMA_LENGTH_MAX_PARTICIPANT_ATTRIBUTE_VALUE),
            ),
          createdAt: sb.date().default('now'),
          updatedAt: sb.date().default('now'),
        })
        .build(),
    )
  }
}

export default SchemaSurveyParticipant
