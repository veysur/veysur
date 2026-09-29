import { Schema } from '@datacapy/schema'

export class SchemaJwtAdmin extends Schema {
  constructor() {
    super({
      $name: 'jwtAdmin',
      $construct: 'JwtAdmin',
      $strict: true,
      _id: {
        $type: 'string',
        $validate: { required: true, notNull: true },
      },
      clientId: {
        $type: 'string',
        $validate: { required: true, notNull: true },
      },
      type: {
        $type: String,
        $filter: { defaultValue: 'admin' },
      },
      nameFirst: {
        $type: String,
        $validate: { required: true, notNull: true, valueLength: { max: 64 } },
        $filter: { trim: true },
      },
      nameLast: {
        $type: String,
        $validate: { required: true, notNull: true, valueLength: { max: 64 } },
        $filter: { trim: true },
      },
      email: {
        $type: String,
        $validate: {
          required: true,
          notNull: true,
          email: true,
          valueLength: { max: 256 },
        },
        $filter: { lowercase: true, trim: true },
      },
      project: {
        $strict: false,
        '*': {
          name: String,
          owner: Boolean,
        },
      },
      role: {
        $type: String,
        $filter: { defaultValue: 'admin' },
      },
      twoFactorEnabled: {
        $type: Boolean,
        $filter: { defaultValue: false },
      },
      iat: Number,
      exp: Number,
    })
  }
}

export default SchemaJwtAdmin
