import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

import { SCHEMA_LENGTH_MAX_INTERNAL_ID } from './constant'
import { SchemaSurvey } from './SchemaSurvey'

export const surveySnapshotShape = {
  _id: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  snapshotId: sb.string().required().maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
  survey: sb.ref(() => new SchemaSurvey()),
}

export class SchemaSurveySnapshot extends Schema<typeof surveySnapshotShape> {
  constructor() {
    super(
      sb
        .schema('surveySnapshot')
        .construct('SurveySnapshot')
        .strict()
        .shape(surveySnapshotShape),
    )
  }
}

export default SchemaSurveySnapshot
