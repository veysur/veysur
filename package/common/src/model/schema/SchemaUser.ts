import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import type { ShapeInput } from '@datacapy/schema'

import {
  SCHEMA_LENGTH_MAX_INPUT,
  SCHEMA_LENGTH_MAX_INTERNAL_ID,
} from './constant'
import { USER_ROLE_CUSTOMER, USER_ROLE_PLATFORM_ADMIN } from '../../constants'
import { verifyTokenArray, metaHistoryVerifiableShape } from './SchemaUserSpec'
import { SchemaUserClient } from './SchemaUserClient'

export const userShape = {
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
  emailMeta: sb.object(metaHistoryVerifiableShape),
  password: sb.string().privateValue(),
  passwordMeta: sb
    .object({ reset: sb.object({ token: verifyTokenArray }) })
    .private(),
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
    .of(() => new SchemaUserClient()),
  maxClients: sb.number().default(null).privateValue(),
  role: sb
    .string()
    .inArray([USER_ROLE_CUSTOMER, USER_ROLE_PLATFORM_ADMIN])
    .default(USER_ROLE_CUSTOMER),
  createdAt: sb.date().default('now'),
  deletedAt: sb.date().default(null),
  deletionReminderSentAt: sb.date().default(null),
  anonymizedAt: sb.date().default(null),
}

export class SchemaUser<
  E extends ShapeInput = Record<never, never>,
> extends Schema<typeof userShape & E> {
  /**
   * @param extraShape Fields an extension adds to the `user` schema. The schema
   * is strict, so any stored field must be declared here or by the extension.
   */
  constructor(extraShape?: E) {
    super(
      sb
        .schema('user')
        .construct('User')
        .strict()
        .shape({ ...userShape, ...extraShape }),
    )
  }
}

export default SchemaUser
