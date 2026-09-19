import { SCHEMA_LENGTH_MAX_ATTRIBUTE_NAME } from '../../schema/constant'
import { SURVEY_PARTICIPANT_SYSTEM_ATTRIBUTE_NAMES } from './systemAttributes'

export const ATTRIBUTE_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/

export const JS_RESERVED_PROPERTY_NAMES: readonly string[] = [
  'constructor',
  'prototype',
  '__proto__',
  'toString',
  'toLocaleString',
  'valueOf',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
]

export interface ValidateAttributeNameResult {
  valid: boolean
  reason?: string
}

export const isValidCustomAttributeName = (
  name: string,
): ValidateAttributeNameResult => {
  if (!name || !ATTRIBUTE_NAME_PATTERN.test(name)) {
    return {
      valid: false,
      reason:
        'Name must start with a letter or underscore, and contain only letters, numbers and underscores',
    }
  }

  if (name.length > SCHEMA_LENGTH_MAX_ATTRIBUTE_NAME) {
    return {
      valid: false,
      reason: `Name must not exceed ${SCHEMA_LENGTH_MAX_ATTRIBUTE_NAME} characters`,
    }
  }

  if (SURVEY_PARTICIPANT_SYSTEM_ATTRIBUTE_NAMES.includes(name)) {
    return { valid: false, reason: 'Name collides with a system attribute' }
  }

  if (JS_RESERVED_PROPERTY_NAMES.includes(name)) {
    return { valid: false, reason: 'Name is a reserved property name' }
  }

  return { valid: true }
}
