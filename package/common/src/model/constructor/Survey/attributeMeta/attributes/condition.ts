import { SchemaSpec } from '@datacapy/schema'

import {
  AttributeMeta,
  SURVEY_ENTITY_TYPE_SECTION,
  SURVEY_ENTITY_TYPE_ELEMENT,
  SURVEY_ENTITY_TYPE_CONTENT,
} from '../types'
import { ATTRIBUTE_CONDITION } from '../constants'

// Semantic validation (question/answer code references, participant variable
// names, forward references, syntax) is performed by ConditionEditor before
// it ever calls onChange - it has access to the survey's full, live set of
// participant variable names (system + custom attributes), which this
// schema-level spec does not. Keep this to a basic type/length check only,
// so a since-fixed mismatch between the two validators can't silently reject
// (and drop) an otherwise-valid condition.
export const conditionMeta: AttributeMeta = {
  id: ATTRIBUTE_CONDITION,
  entityTypes: [
    SURVEY_ENTITY_TYPE_SECTION,
    SURVEY_ENTITY_TYPE_ELEMENT,
    SURVEY_ENTITY_TYPE_CONTENT,
  ],
  name: 'Display Condition',
  description: 'Conditional display',
  typesLimit: [],
  initialValue: null,
  isEntityProp: true,
  getValue: (entity) => {
    return (entity as { condition?: string | null })?.condition ?? null
  },
  getSchemaSpec: (): SchemaSpec => {
    return {
      $type: String,
      $name: 'Display Condition',
      $validate: { valueLength: { max: 2000 } },
    } as SchemaSpec
  },
}
