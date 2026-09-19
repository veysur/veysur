import { SCHEMA_LENGTH_MAX_INPUT } from 'veysur-common'
import { Schema } from 'mzen-schema'

export class SurveySchemaNew extends Schema {
  constructor() {
    super({
      $strict: true,
      name: {
        $type: String,
        $validate: {
          notEmpty: { message: 'Name is required' },
          valueLength: { max: SCHEMA_LENGTH_MAX_INPUT },
        },
      },
    })
  }
}

export default SurveySchemaNew
