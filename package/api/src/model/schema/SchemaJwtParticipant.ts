import { Schema } from '@datacapy/schema'

export class SchemaJwtParticipant extends Schema {
  constructor() {
    super({
      $name: 'jwtParticipant',
      $construct: 'JwtParticipant',
      $strict: true,
      participantId: {
        $type: 'string',
        $filter: { defaultValue: null },
      },
      sessionId: {
        $type: 'string',
        $filter: { defaultValue: null },
      },
      type: {
        $type: String,
        $filter: { defaultValue: 'participant' },
      },
      surveyId: {
        $type: 'string',
        $validate: { required: true, notNull: true },
      },
      snapshotId: {
        $type: 'string',
        $validate: { required: true, notNull: true },
      },
      publicationId: {
        $type: 'string',
        $validate: { required: true, notNull: true },
      },
      projectId: {
        $type: 'string',
        $validate: { required: true, notNull: true },
      },
      iat: Number,
      exp: Number,
    })
  }
}

export default SchemaJwtParticipant
