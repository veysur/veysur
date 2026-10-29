import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

export class SchemaJwtAdmin extends Schema {
  constructor() {
    super(
      sb
        .schema('jwtAdmin')
        .construct('JwtAdmin')
        .strict()
        .shape({
          _id: sb.string().required().notNull(),
          clientId: sb.string().required().notNull(),
          type: sb.string().default('admin'),
          nameFirst: sb.string().required().notNull().maxLength(64).trim(),
          nameLast: sb.string().required().notNull().maxLength(64).trim(),
          email: sb
            .string()
            .required()
            .notNull()
            .email()
            .maxLength(256)
            .lowercase()
            .trim(),
          project: sb
            .object()
            .strict(false)
            .matchAll(
              sb.object().shape({ name: sb.string(), owner: sb.boolean() }),
            ),
          role: sb.string().default('admin'),
          twoFactorEnabled: sb.boolean().default(false),
          iat: sb.number(),
          exp: sb.number(),
        }),
    )
  }
}

export default SchemaJwtAdmin
