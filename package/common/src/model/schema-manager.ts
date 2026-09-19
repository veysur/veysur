import { SchemaManager } from 'mzen-schema'

import * as constructorsCommon from './constructor'
import * as schemasCommon from './schema'

export const schemaManager = new SchemaManager()
schemaManager.addConstructors(constructorsCommon)
schemaManager.addSchemas(
  // We need create schema instances before adding them
  Object.values(schemasCommon)
    .map((schema) => {
      return typeof schema == 'function' ? new schema() : undefined
    })
    .filter((schema) => !!schema),
)
schemaManager.init()

export default schemaManager
