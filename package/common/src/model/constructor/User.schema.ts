// Generated from User.ts by datacapy-gen. Do not edit.
// cspell:disable
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import type { AssertSchema, SpecFor } from '@datacapy/schema'
import type { UserData } from './User'
import { SchemaUserClient } from './UserClient.schema'
import type { UserClientData } from './UserClient'

export class SchemaUser extends Schema.from(
  sb
    .schema('user')
    .construct('User')
    .strict()
    .shape({
      _id: sb.string().required().maxLength(17),
      nameFirst: sb.string().required().maxLength(64).notNull().trim(),
      nameLast: sb.string().required().maxLength(64).notNull().trim(),
      email: sb
        .string()
        .required()
        .maxLength(255)
        .email()
        .notNull()
        .trim()
        .lowercase(),
      emailMeta: sb.object({
        verify: sb.object({
          status: sb.object({
            isVerified: sb.boolean().required().default(false),
            isVerifiedAt: sb.date().required().default(null),
          }),
          token: sb
            .array(
              sb
                .object({
                  token: sb.string().privateValue(),
                  ttl: sb.number(),
                  createdAt: sb.date(),
                  expiresAt: sb.date(),
                  failCount: sb.number(),
                })
                .required(),
            )
            .constructCollection('Collection'),
        }),
        history: sb
          .array(
            sb
              .object({
                prevValue: sb.string().required().trim(),
                verifyStatus: sb.object({
                  isVerified: sb.boolean().required().default(false),
                  isVerifiedAt: sb.date().required().default(null),
                }),
                clientId: sb.string().required().trim().privateValue(),
                createdAt: sb.date().default('now'),
              })
              .required(),
          )
          .private(),
      }),
      password: sb.string().privateValue(),
      passwordMeta: sb
        .object({
          reset: sb.object({
            token: sb
              .array(
                sb
                  .object({
                    token: sb.string().privateValue(),
                    ttl: sb.number(),
                    createdAt: sb.date(),
                    expiresAt: sb.date(),
                    failCount: sb.number(),
                  })
                  .required(),
              )
              .constructCollection('Collection'),
          }),
        })
        .private(),
      twoFactorSecret: sb.string().privateValue().encrypt(),
      twoFactorMeta: sb.object({
        enabled: sb.boolean().default(false),
        enabledAt: sb.date(),
        prompt: sb.object({ dismissed: sb.boolean().default(false) }),
      }),
      client: sb
        .array(
          sb
            .refTo<SpecFor<UserClientData>>(
              (): unknown => new SchemaUserClient(),
            )
            .required(),
        )
        .constructCollection('Collection')
        .private()
        .relation(),
      maxClients: sb.number().default(null).privateValue(),
      role: sb
        .string()
        .default('customer')
        .inArray<string>(['customer', 'platformAdmin']),
      createdAt: sb.date().default('now'),
      deletedAt: sb.date().default(null),
      deletionReminderSentAt: sb.date().default(null),
      anonymizedAt: sb.date().default(null),
    }),
) {}

const _checkSchemaUser: AssertSchema<SchemaUser, UserData> = true
void _checkSchemaUser
