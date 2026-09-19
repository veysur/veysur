import { Schema, sb } from 'mzen-schema'

import {
  SCHEMA_LENGTH_MAX_INPUT,
  SCHEMA_LENGTH_MAX_INTERNAL_ID,
} from './constant'
import { USER_ROLE_CUSTOMER, USER_ROLE_PLATFORM_ADMIN } from '../../constants'
import {
  specVerifyTokenArray,
  specMetaHistoryVerifiable,
} from './SchemaUserSpec'

export class SchemaUser extends Schema {
  constructor() {
    super(
      sb
        .schema('user')
        .construct('User')
        .strict()
        .shape({
          _id: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          nameFirst: sb.string().required().notNull().maxLength(64).trim(),
          nameLast: sb.string().required().notNull().maxLength(64).trim(),
          email: sb
            .string()
            .required()
            .notNull()
            .email()
            .maxLength(SCHEMA_LENGTH_MAX_INPUT)
            .lowercase()
            .trim(),
          emailMeta: specMetaHistoryVerifiable,
          password: sb.string().privateValue(),
          passwordMeta: {
            $filter: { private: true },
            reset: {
              token: specVerifyTokenArray,
            },
          },
          billingAddress: sb.object({
            line1: sb.string().maxLength(140).trim(),
            line2: sb.string().maxLength(140).trim(),
            city: sb.string().maxLength(140).trim(),
            state: sb.string().maxLength(70).trim(),
            postcode: sb.string().maxLength(30).trim(),
            country: sb.string().maxLength(2).trim(),
          }),
          taxId: sb.string().maxLength(50).trim(),
          businessName: sb.string().maxLength(140).trim(),
          twoFactorSecret: sb.string().privateValue().encrypt(),
          twoFactorMeta: sb.object({
            enabled: sb.boolean().default(false),
            enabledAt: sb.date(),
            prompt: sb.object({
              dismissed: sb.boolean().default(false),
            }),
          }),
          client: sb
            .array()
            .relation()
            .private()
            .construct('Collection')
            .ofSchema('userClient'),
          role: sb
            .string()
            .inArray([USER_ROLE_CUSTOMER, USER_ROLE_PLATFORM_ADMIN])
            .default(USER_ROLE_CUSTOMER),
          stripeCustomerId: sb.string(),
          createdAt: sb.date().default('now'),
          deletedAt: sb.date().default(null),
          deletionReminderSentAt: sb.date().default(null),
          anonymizedAt: sb.date().default(null),
        })
        .build(),
    )
  }
}

export default SchemaUser
