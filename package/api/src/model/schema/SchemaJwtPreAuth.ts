import { Schema, sb } from '@datacapy/schema'

export class SchemaJwtPreAuth extends Schema {
  constructor() {
    super(
      sb
        .schema('jwtPreAuth')
        .strict()
        .shape({
          _id: sb.string().required().notNull(),
          clientId: sb.string(),
          type: sb.string().default('pre-auth'),
          ip: sb.string(),
          userAgent: sb.string(),
          deviceName: sb.string(),
          deviceSystem: sb.string(),
          deviceSystemVersion: sb.string(),
          buildNumber: sb.string(),
          buildVersion: sb.string(),
          notificationToken: sb.string(),
          requiresTwoFactorSetup: sb.boolean().default(false),
          iat: sb.number(),
          exp: sb.number(),
        }),
    )
  }
}

export default SchemaJwtPreAuth
