import { Schema } from '@datacapy/schema'

export class SchemaJwtPreAuth extends Schema {
  constructor() {
    super({
      $name: 'jwtPreAuth',
      $strict: true,
      _id: {
        $type: 'string',
        $validate: { required: true, notNull: true },
      },
      clientId: {
        $type: 'string',
      },
      type: {
        $type: String,
        $filter: { defaultValue: 'pre-auth' },
      },
      ip: { $type: String },
      userAgent: { $type: String },
      deviceName: { $type: String },
      deviceSystem: { $type: String },
      deviceSystemVersion: { $type: String },
      buildNumber: { $type: String },
      buildVersion: { $type: String },
      notificationToken: { $type: String },
      requiresTwoFactorSetup: {
        $type: Boolean,
        $filter: { defaultValue: false },
      },
      iat: Number,
      exp: Number,
    })
  }
}

export default SchemaJwtPreAuth
