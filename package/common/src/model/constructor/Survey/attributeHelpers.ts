import { QuestionType } from '../Survey'
import {
  attributesMetadata,
  QUESTION_TYPE_TEXT,
  AttributeMeta,
  SurveyAttributes,
  SurveyEntityType,
  SURVEY_ENTITY_TYPE_ELEMENT,
  SURVEY_ENTITY_TYPE_SUBQUESTION,
} from './attributeMeta'

/**
 * Get default attributes for a question type
 *
 * Returns an object with all valid attributes for the given question type,
 * each set to its initial value from metadata.
 *
 * @param questionType - The question type to get defaults for
 * @returns Object mapping attribute IDs to their initial values
 */
export function getDefaultAttributesForType(
  questionType: QuestionType = QUESTION_TYPE_TEXT,
): SurveyAttributes {
  return attributesMetadata
    .filter(
      (attr: AttributeMeta) =>
        !attr.isEntityProp &&
        attr.entityTypes.includes(SURVEY_ENTITY_TYPE_ELEMENT) &&
        (attr.typesLimit.length === 0 ||
          attr.typesLimit.includes(questionType)),
    )
    .reduce((acc: SurveyAttributes, attr: AttributeMeta) => {
      acc[attr.id] = attr.initialValue
      return acc
    }, {})
}

/**
 * Transition attributes when question type changes
 *
 * When a question changes from one type to another:
 * 1. Keeps existing attribute values that are valid for the new type
 * 2. Adds missing attributes with their default values
 * 3. Removes attributes that are not valid for the new type
 *
 * This preserves user-set values where possible while ensuring type safety.
 *
 * @param currentAttributes - The question's current attributes
 * @param fromType - The previous question type (unused but kept for future enhancements)
 * @param toType - The new question type
 * @returns New attributes object for the question
 */
export function transitionAttributes(
  currentAttributes: SurveyAttributes = {},
  fromType: QuestionType,
  toType: QuestionType,
): SurveyAttributes {
  const newDefaults = getDefaultAttributesForType(toType)
  const validAttrIds = Object.keys(newDefaults)

  // Start with defaults for the new type
  const result = { ...newDefaults }

  // Preserve existing values where still valid
  for (const [key, value] of Object.entries(currentAttributes)) {
    if (validAttrIds.includes(key)) {
      result[key] = value // Preserve existing value
    }
  }

  return result
}

/**
 * Get attribute metadata by ID
 *
 * @param attributeId - The attribute ID to look up
 * @returns The attribute metadata, or undefined if not found
 */
export function getAttributeMeta(
  attributeId: string,
): AttributeMeta | undefined {
  return attributesMetadata.find((attr) => attr.id === attributeId)
}

/**
 * Check if an attribute is valid for a question type
 *
 * @param attributeId - The attribute ID to check
 * @param questionType - The question type to check against
 * @returns True if the attribute is valid for the question type
 */
export function isAttributeValidForType(
  attributeId: string,
  questionType: QuestionType,
): boolean {
  const meta = getAttributeMeta(attributeId)
  if (!meta) return false
  return meta.typesLimit.length === 0 || meta.typesLimit.includes(questionType)
}

/**
 * Get attributes by entity type and optional question type
 *
 * @param entityType - The entity type to filter by
 * @param questionType - Optional question type to further filter attributes
 * @returns Array of attribute metadata matching the criteria
 */
export function getAttributesForEntity(
  entityType: SurveyEntityType,
  questionType?: QuestionType,
): AttributeMeta[] {
  return attributesMetadata.filter((attr) => {
    // Check if attribute applies to this entity type
    if (!attr.entityTypes.includes(entityType)) {
      return false
    }

    // If a question type is specified, check type restrictions
    if (
      questionType &&
      attr.typesLimit.length > 0 &&
      !attr.typesLimit.includes(questionType)
    ) {
      return false
    }

    return true
  })
}

/**
 * Get default attributes for a subquestion type
 */
export function getDefaultAttributesForSubquestionType(
  subquestionType: QuestionType,
): SurveyAttributes {
  return attributesMetadata
    .filter(
      (attr: AttributeMeta) =>
        !attr.isEntityProp &&
        attr.entityTypes.includes(SURVEY_ENTITY_TYPE_SUBQUESTION) &&
        (attr.typesLimit.length === 0 ||
          attr.typesLimit.includes(subquestionType)),
    )
    .reduce((acc: SurveyAttributes, attr: AttributeMeta) => {
      acc[attr.id] =
        'subquestionInitialValue' in attr
          ? attr.subquestionInitialValue
          : attr.initialValue
      return acc
    }, {})
}

/**
 * Transition attributes when subquestion type changes
 */
export function transitionSubquestionAttributes(
  currentAttributes: SurveyAttributes = {},
  fromType: QuestionType,
  toType: QuestionType,
): SurveyAttributes {
  const newDefaults = getDefaultAttributesForSubquestionType(toType)
  const result = { ...newDefaults }
  for (const [key, value] of Object.entries(currentAttributes)) {
    if (key in newDefaults) {
      result[key] = value
    }
  }
  return result
}

/**
 * Get attributes by multiple IDs with optional filtering
 *
 * @param attributeIds - Array of attribute IDs to retrieve
 * @param entityType - Optional entity type to filter by
 * @param questionType - Optional question type to filter by
 * @returns Array of attribute metadata matching the criteria
 */
export function getAttributes(
  attributeIds: string[],
  entityType?: SurveyEntityType,
  questionType?: QuestionType,
): AttributeMeta[] {
  return attributesMetadata.filter((attr) => {
    // Must be in the requested IDs
    if (!attributeIds.includes(attr.id)) {
      return false
    }

    // If entity type specified, must match
    if (entityType && !attr.entityTypes.includes(entityType)) {
      return false
    }

    // If question type specified, must match or have no type restrictions
    if (
      questionType &&
      attr.typesLimit.length > 0 &&
      !attr.typesLimit.includes(questionType)
    ) {
      return false
    }

    return true
  })
}
