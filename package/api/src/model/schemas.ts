import { Schema } from '@datacapy/server'

import * as schemasCommon from 'veysur-common/model/schema'

import { classArrayInstantiate } from './classArrayInstantiate'
import * as schemasLocal from './schema'

const schemaConstructors = Object.values({
  ...schemasCommon,
  ...schemasLocal,
}).filter((schema) => {
  return typeof schema == 'function'
})

export const schemas = classArrayInstantiate(Schema, schemaConstructors)

export default schemas
