import { Schema, sb } from 'mzen-schema'

// Base field shape shared with the extension package veysur-common-cloud's
// own SchemaProject, which spreads this before adding its own multi-project
// fields (and may override a validator, e.g. a stricter `ownerId`/`timezone`).
export const projectBaseShape = {
  _id: sb.string().required(),
  name: sb.string().required(),
  timezone: sb.string().default('UTC'),
  ownerId: sb.string().default(''),
  createdAt: sb.date().default('now'),
  updatedAt: sb.date().default('now'),
}

export class SchemaProject extends Schema {
  constructor() {
    super(
      sb
        .schema('project')
        .construct('Project')
        .strict()
        .shape({ ...projectBaseShape })
        .build(),
    )
  }
}
