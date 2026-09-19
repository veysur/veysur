import Schema, { sb } from 'mzen-schema'

export class SchemaUserClient extends Schema {
  constructor() {
    super(
      sb
        .schema('userClient')
        .shape({
          _id: sb.string().required(),
          userId: sb.string().required(),
          user: { $relation: true },
          name: sb.string().maxLength(300).trim().default(null),
          system: sb.string().maxLength(40).trim().default(null),
          systemVersion: sb.string().maxLength(40).trim().default(null),
          buildNumber: sb.string().maxLength(40).trim().default(null),
          buildVersion: sb.string().maxLength(40).trim().default(null),
          userAgent: sb.string().maxLength(1024).trim().default(null),
          notificationToken: sb.string().maxLength(1024).trim().default(null),
          geo: sb.object({
            country: sb.string(),
            countryCode: sb.string(),
            region: sb.string(),
            regionCode: sb.string(),
            timezone: sb.string(),
            city: sb.string(),
            location: sb.object({
              type: sb.string(),
              coordinates: sb.array(Number),
            }),
          }),
          accessToken: sb
            .array()
            .construct('Collection')
            .private()
            .ofSchema('userAccessToken'),
          createdAt: sb.date().default('now'),
          updatedAt: sb.date().default('now'),
        })
        .build(),
    )
  }
}

export default SchemaUserClient
