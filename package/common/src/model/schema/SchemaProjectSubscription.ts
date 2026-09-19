import { Schema, sb } from 'mzen-schema'
import {
  SCHEMA_LENGTH_MAX_INTERNAL_ID,
  SCHEMA_LENGTH_MAX_ENTITY_NAME,
} from './constant'

/**
 * ProjectSubscription Schema
 * Validates project subscription assignment data
 */
export class SchemaProjectSubscription extends Schema {
  constructor() {
    super(
      sb
        .schema('projectSubscription')
        .construct('ProjectSubscription')
        .strict()
        .shape({
          _id: sb.string().default('').maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          projectId: sb
            .string()
            .required()
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          createdById: sb
            .string()
            .required()
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          subscriptionCode: sb
            .string()
            .uppercase()
            .trim()
            .required()
            .maxLength(50),
          subscriptionName: sb
            .string()
            .trim()
            .required()
            .maxLength(SCHEMA_LENGTH_MAX_ENTITY_NAME),
          startedAt: sb.date().default('now'),
          endedAt: sb.date().default(null),
          payment: sb.object({
            period: sb.string().inArray(['month', 'year']).required(),
            priceStd: sb.number().required(),
            price: sb.number().required(),
            dueNextAt: sb.date().default(null),
            day: sb.number().required(),
            reminderSentAt: sb.date().default(null),
          }),
          feature: sb.object().matchAll(
            sb.object({
              available: sb.boolean().required(),
              unlimited: sb.boolean().default(false),
              limit: sb.number().default(null),
              range: sb
                .object({
                  min: sb.number().default(null),
                  max: sb.number().default(null),
                })
                .default(null),
            }),
          ),
          createdAt: sb.date().default('now'),
          updatedAt: sb.date().default('now'),
          resourceLimitWarningSentAt: sb.date().default(null),
          responsesStartedThisPeriod: sb.number().default(0),
          responsesStartedPeriodStartMs: sb.number().default(null),
          queuedOnDelete: sb.boolean().default(false),
        })
        .build(),
    )
  }
}
