import { Schema, sb } from '@datacapy/schema'

import {
  SCHEMA_LENGTH_MAX_INPUT,
  SCHEMA_LENGTH_MAX_INTERNAL_ID,
} from './constant'
import { USER_ROLE_CUSTOMER, USER_ROLE_PLATFORM_ADMIN } from '../../constants'
import {
  specVerifyTokenArray,
  specMetaHistoryVerifiable,
} from './SchemaUserSpec'

type SchemaShape = Parameters<ReturnType<typeof sb.schema>['shape']>[0]

export class SchemaUser extends Schema {
  /**
   * @param extraShape Fields an extension adds to the `user` schema. The schema
   * is strict, so any stored field must be declared here or by the extension.
   */
  constructor(extraShape: SchemaShape = {}) {
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
          createdAt: sb.date().default('now'),
          deletedAt: sb.date().default(null),
          deletionReminderSentAt: sb.date().default(null),
          anonymizedAt: sb.date().default(null),
          ...extraShape,
        })
        .build(),
    )
  }
}

export default SchemaUser
