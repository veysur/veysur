// Generated from UserClient.ts by datacapy-gen. Do not edit.
// cspell:disable
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import type { AssertSchema, SpecFor } from '@datacapy/schema'
import type { UserClientData } from './UserClient'
import { SchemaUserAccessToken } from '../schema/SchemaUserAccessToken'
import type { UserAccessTokenData } from './UserAccessToken'

export class SchemaUserClient extends Schema.from(
  sb.schema('userClient').shape({
    _id: sb.string().required(),
    userId: sb.string().required(),
    user: sb.mixed().relation(),
    name: sb.string().default(null).maxLength(300).trim(),
    system: sb.string().default(null).maxLength(40).trim(),
    systemVersion: sb.string().default(null).maxLength(40).trim(),
    buildNumber: sb.string().default(null).maxLength(40).trim(),
    buildVersion: sb.string().default(null).maxLength(40).trim(),
    userAgent: sb.string().default(null).maxLength(1024).trim(),
    notificationToken: sb.string().default(null).maxLength(1024).trim(),
    geo: sb.object({
      country: sb.string(),
      countryCode: sb.string(),
      region: sb.string(),
      regionCode: sb.string(),
      timezone: sb.string(),
      city: sb.string(),
      location: sb.object({
        type: sb.string(),
        coordinates: sb.array(sb.number().required()),
      }),
    }),
    accessToken: sb
      .array(
        sb
          .refTo<SpecFor<UserAccessTokenData>>(
            (): unknown => new SchemaUserAccessToken(),
          )
          .required(),
      )
      .constructCollection('Collection')
      .private(),
    createdAt: sb.date().default('now'),
    updatedAt: sb.date().default('now'),
  }),
) {}

const _checkSchemaUserClient: AssertSchema<SchemaUserClient, UserClientData> =
  true
void _checkSchemaUserClient
