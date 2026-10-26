import { Schema, sb } from '@datacapy/schema'

export class SchemaJwtParticipant extends Schema {
  constructor() {
    super(
      sb
        .schema('jwtParticipant')
        .construct('JwtParticipant')
        .strict()
        .shape({
          participantId: sb.string().default(null),
          sessionId: sb.string().default(null),
          type: sb.string().default('participant'),
          surveyId: sb.string().required().notNull(),
          snapshotId: sb.string().required().notNull(),
          publicationId: sb.string().required().notNull(),
          projectId: sb.string().required().notNull(),
          botRequired: sb.boolean().default(null),
          botVerified: sb.boolean().default(null),
          iat: sb.number(),
          exp: sb.number(),
        }),
    )
  }
}

export default SchemaJwtParticipant
