// Generated from UserAccessToken.ts by datacapy-gen. Do not edit.
// cspell:disable
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import type { AssertSchema } from '@datacapy/schema'
import type { UserAccessToken } from './UserAccessToken'

export class SchemaUserAccessToken extends Schema.from(
  sb
    .schema('userAccessToken')
    .construct('UserAccessToken')
    .shape({
      token: sb.string(),
      ttl: sb.number(),
      ip: sb.string(),
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
      createdAt: sb.date(),
      expiresAt: sb.date(),
    }),
) {}

const _checkSchemaUserAccessToken: AssertSchema<
  SchemaUserAccessToken,
  Pick<
    UserAccessToken,
    'token' | 'ttl' | 'ip' | 'geo' | 'createdAt' | 'expiresAt'
  >
> = true
void _checkSchemaUserAccessToken
