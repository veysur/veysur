import { Schema, sb } from '@datacapy/schema'

export class SchemaUserAccessToken extends Schema {
  constructor() {
    super(
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
              type: sb.string(), // Point
              coordinates: sb.array(Number), // [long, lat]
            }),
          }),
          createdAt: sb.date(),
          expiresAt: sb.date(),
        })
        .build(),
    )
  }
}

export default SchemaUserAccessToken
