import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

export const userAccessTokenShape = {
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
      type: sb.string(), // Point
      coordinates: sb.array(Number), // [long, lat]
    }),
  }),
  createdAt: sb.date(),
  expiresAt: sb.date(),
}

export class SchemaUserAccessToken extends Schema<typeof userAccessTokenShape> {
  constructor() {
    super(
      sb
        .schema('userAccessToken')
        .construct('UserAccessToken')
        .shape(userAccessTokenShape),
    )
  }
}

export default SchemaUserAccessToken
