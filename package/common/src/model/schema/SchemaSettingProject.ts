import { Schema, sb } from '@datacapy/schema'

export class SchemaSettingProject extends Schema {
  constructor() {
    super(
      sb
        .schema('settingProject')
        .construct('SettingProject')
        .strict()
        .shape({
          _id: sb.string().required(),
          // Google Maps browser key; overrides the deployment key
          maps: {
            googleApiKey: String,
            provider: String,
          },
          // Bot check for the survey start step; secret keys never reach
          // participants or leave the API
          botProtection: {
            provider: String,
            cloudflare: {
              siteKey: String,
              secretKey: sb.string().encrypt(),
            },
            google: {
              siteKey: String,
              secretKey: sb.string().encrypt(),
            },
          },
          createdAt: sb.date().default('now'),
          updatedAt: sb.date().default('now'),
        }),
    )
  }
}
