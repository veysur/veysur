import { getReservedEntityCodes } from '../model/constructor/Survey/attributeMeta/reservedEntityCodes'
import { getPointScaleCount } from '../model/constructor/Survey/questionType'
import {
  QUESTION_TYPE_TEXT,
  QUESTION_TYPE_NUMBER,
  QUESTION_TYPE_CHECKBOX,
  QUESTION_TYPE_DROPDOWN,
  QUESTION_TYPE_BUTTON,
  QUESTION_TYPE_IMAGE_SELECT,
  QUESTION_TYPE_YES_NO,
  QUESTION_TYPE_STAR_RATING,
  QUESTION_TYPE_POINT_5,
  QUESTION_TYPE_POINT_10,
  QUESTION_TYPE_SURVEY_LANG_SELECT,
  QUESTION_TYPE_DATE,
  QUESTION_TYPE_TIME,
  QUESTION_TYPE_DATETIME,
  QUESTION_TYPE_MATRIX_COMPOSITE,
  QUESTION_TYPE_MATRIX_TEXT,
  QUESTION_TYPE_MATRIX_NUMBER,
  QUESTION_TYPE_MATRIX_DATE,
  QUESTION_TYPE_MATRIX_TIME,
  QUESTION_TYPE_MATRIX_DATETIME,
  QUESTION_TYPE_MATRIX_CHECKBOX,
  QUESTION_TYPE_MATRIX_YES_NO,
  QUESTION_TYPE_RANKING,
  QUESTION_TYPE_MULTI_PART_TEXT,
  QUESTION_TYPE_MULTI_PART_NUMBER,
  QUESTION_TYPE_MULTI_PART_YES_NO,
  QUESTION_TYPE_MULTI_PART_STAR_RATING,
  QUESTION_TYPE_MULTI_PART_POINT_5,
  QUESTION_TYPE_MULTI_PART_POINT_10,
  QUESTION_TYPE_FILE_UPLOAD,
} from '../model/constructor/Survey/attributeMeta/types'
import {
  ELEMENT_KIND_CONTENT,
  CONTENT_TYPES,
} from '../model/constructor/Survey/SurveyContent'
import { ImportSurveyData } from './ImportSurveyData'

/**
 * Validation error details
 */
export interface ValidationError {
  type: 'schema' | 'reference' | 'elementType' | 'attributeType'
  entityType: 'survey' | 'section' | 'element'
  entityId: string
  field?: string
  message: string
  repairable: boolean
  details?: Record<string, unknown>
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/**
 * Valid question types
 */
const VALID_QUESTION_TYPES = [
  QUESTION_TYPE_TEXT,
  QUESTION_TYPE_NUMBER,
  QUESTION_TYPE_CHECKBOX,
  QUESTION_TYPE_DROPDOWN,
  QUESTION_TYPE_BUTTON,
  QUESTION_TYPE_IMAGE_SELECT,
  QUESTION_TYPE_YES_NO,
  QUESTION_TYPE_STAR_RATING,
  QUESTION_TYPE_POINT_5,
  QUESTION_TYPE_POINT_10,
  QUESTION_TYPE_SURVEY_LANG_SELECT,
  QUESTION_TYPE_DATE,
  QUESTION_TYPE_TIME,
  QUESTION_TYPE_DATETIME,
  QUESTION_TYPE_MATRIX_COMPOSITE,
  QUESTION_TYPE_MATRIX_TEXT,
  QUESTION_TYPE_MATRIX_NUMBER,
  QUESTION_TYPE_MATRIX_DATE,
  QUESTION_TYPE_MATRIX_TIME,
  QUESTION_TYPE_MATRIX_DATETIME,
  QUESTION_TYPE_MATRIX_CHECKBOX,
  QUESTION_TYPE_MATRIX_YES_NO,
  QUESTION_TYPE_RANKING,
  QUESTION_TYPE_MULTI_PART_TEXT,
  QUESTION_TYPE_MULTI_PART_NUMBER,
  QUESTION_TYPE_MULTI_PART_YES_NO,
  QUESTION_TYPE_MULTI_PART_STAR_RATING,
  QUESTION_TYPE_MULTI_PART_POINT_5,
  QUESTION_TYPE_MULTI_PART_POINT_10,
  QUESTION_TYPE_FILE_UPLOAD,
]

/**
 * Valid content-element types (`kind: 'content'`).
 */
const VALID_CONTENT_TYPES: readonly string[] = CONTENT_TYPES

/**
 * Survey Import Validator
 *
 * Validates imported survey data:
 * - Schema validation using existing schemas
 * - Question type validation
 * - Inter-entity reference validation
 */
export class SurveyImportValidator {
  private forceMode: boolean

  constructor(forceMode: boolean = false) {
    this.forceMode = forceMode
  }

  /**
   * Validate import data
   *
   * @param importData - Data to validate
   * @returns Validation result with errors
   */
  async validate(importData: ImportSurveyData): Promise<ValidationResult> {
    const errors: ValidationError[] = []

    // 1. Schema validation
    errors.push(...this.validateSchemas(importData))

    // 2. Element type validation
    errors.push(...this.validateElementTypes(importData))

    // 3. Reference validation
    errors.push(...this.validateReferences(importData))

    // 4. Reserved code validation
    errors.push(...this.validateReservedCodes(importData))

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate data against schemas
   */
  private validateSchemas(data: ImportSurveyData): ValidationError[] {
    const errors: ValidationError[] = []

    // Validate survey (basic validation - schemas handle complex validation)
    if (!data.survey._id) {
      errors.push({
        type: 'schema',
        entityType: 'survey',
        entityId: 'unknown',
        field: '_id',
        message: 'Survey must have an _id',
        repairable: false,
      })
    }

    // Validate sections
    if (!Array.isArray(data.sections)) {
      errors.push({
        type: 'schema',
        entityType: 'survey',
        entityId: data.survey._id,
        field: 'sections',
        message: 'Sections must be an array',
        repairable: false,
      })
    } else {
      for (const section of data.sections) {
        if (!section._id) {
          errors.push({
            type: 'schema',
            entityType: 'section',
            entityId: 'unknown',
            field: '_id',
            message: 'Section must have an _id',
            repairable: false,
          })
        }
      }
    }

    // Validate elements
    if (!Array.isArray(data.elements)) {
      errors.push({
        type: 'schema',
        entityType: 'survey',
        entityId: data.survey._id,
        field: 'elements',
        message: 'Elements must be an array',
        repairable: false,
      })
    } else {
      for (const element of data.elements) {
        if (!element._id) {
          errors.push({
            type: 'schema',
            entityType: 'element',
            entityId: 'unknown',
            field: '_id',
            message: 'Element must have an _id',
            repairable: false,
          })
        }
      }
    }

    return errors
  }

  /**
   * Validate element types. Content elements (`kind: 'content'`) carry a
   * content-type namespace that is validated separately; only question
   * elements are checked against the question-type list here.
   */
  private validateElementTypes(data: ImportSurveyData): ValidationError[] {
    const errors: ValidationError[] = []

    if (!Array.isArray(data.elements)) {
      return errors // Already reported in schema validation
    }

    for (const element of data.elements) {
      // Treat an element as content when its kind says so, or when its type is
      // a known content type (defensive: an ORM round-trip can drop `kind`).
      const isContent =
        element.kind === ELEMENT_KIND_CONTENT ||
        (!!element.type && VALID_CONTENT_TYPES.includes(element.type))

      if (!element.type) {
        errors.push({
          type: 'elementType',
          entityType: 'element',
          entityId: element._id || 'unknown',
          field: 'type',
          message: isContent
            ? 'Content element must have a type'
            : 'Question must have a type',
          repairable: false,
        })
        continue
      }

      if (isContent) {
        if (!VALID_CONTENT_TYPES.includes(element.type)) {
          errors.push({
            type: 'elementType',
            entityType: 'element',
            entityId: element._id,
            field: 'type',
            message: `Invalid content element type: ${element.type}`,
            repairable: false,
            details: {
              invalidType: element.type,
              validTypes: VALID_CONTENT_TYPES,
            },
          })
        }
        continue
      }

      if (!VALID_QUESTION_TYPES.includes(element.type)) {
        errors.push({
          type: 'elementType',
          entityType: 'element',
          entityId: element._id,
          field: 'type',
          message: `Invalid question type: ${element.type}`,
          repairable: false,
          details: {
            invalidType: element.type,
            validTypes: VALID_QUESTION_TYPES,
          },
        })
      }
    }

    return errors
  }

  /**
   * Validate that no entity code collides with an internally reserved code
   */
  private validateReservedCodes(data: ImportSurveyData): ValidationError[] {
    const errors: ValidationError[] = []
    const reserved = new Set(getReservedEntityCodes())

    for (const section of data.sections ?? []) {
      if (section.code && reserved.has(section.code.toUpperCase())) {
        errors.push({
          type: 'schema',
          entityType: 'section',
          entityId: section._id,
          field: 'code',
          message: `"${section.code}" is a reserved code`,
          repairable: false,
        })
      }
    }

    for (const question of data.elements ?? []) {
      if (question.code && reserved.has(question.code.toUpperCase())) {
        errors.push({
          type: 'schema',
          entityType: 'element',
          entityId: question._id,
          field: 'code',
          message: `"${question.code}" is a reserved code`,
          repairable: false,
        })
      }
      const pointScaleCount = getPointScaleCount(question.type)
      for (const ao of question.answerOptions ?? []) {
        const isOwnPointScaleLabelCode =
          pointScaleCount !== undefined &&
          ao.code &&
          new RegExp(`^P([1-9][0-9]*)$`, 'i').test(ao.code) &&
          Number(ao.code.slice(1)) <= pointScaleCount
        if (
          ao.code &&
          reserved.has(ao.code.toUpperCase()) &&
          !isOwnPointScaleLabelCode
        ) {
          errors.push({
            type: 'schema',
            entityType: 'element',
            entityId: question._id,
            field: 'answerOptions.code',
            message: `Answer option "${ao.code}" in question "${question.code}" is a reserved code`,
            repairable: false,
          })
        }
      }
      for (const sq of question.subquestions ?? []) {
        if (sq.code && reserved.has(sq.code.toUpperCase())) {
          errors.push({
            type: 'schema',
            entityType: 'element',
            entityId: question._id,
            field: 'subquestions.code',
            message: `Subquestion "${sq.code}" in question "${question.code}" is a reserved code`,
            repairable: false,
          })
        }
      }
    }

    return errors
  }

  /**
   * Validate inter-entity references
   */
  private validateReferences(data: ImportSurveyData): ValidationError[] {
    const errors: ValidationError[] = []

    const surveyId = data.survey._id
    const sectionIds = new Set(data.sections.map((s) => s._id))
    const elementIds = new Set(data.elements.map((e) => e._id))

    // Validate sections
    for (const section of data.sections) {
      // Section surveyId must match survey
      if (section.surveyId !== surveyId) {
        errors.push({
          type: 'reference',
          entityType: 'section',
          entityId: section._id,
          field: 'surveyId',
          message: `Section surveyId (${section.surveyId}) does not match survey (${surveyId})`,
          repairable: true,
          details: {
            expected: surveyId,
            actual: section.surveyId,
          },
        })
      }

      // Section elementIds must reference existing elements
      if (Array.isArray(section.elementIds)) {
        for (const eid of section.elementIds) {
          if (!elementIds.has(eid)) {
            errors.push({
              type: 'reference',
              entityType: 'section',
              entityId: section._id,
              field: 'elementIds',
              message: `Section references non-existent element: ${eid}`,
              repairable: true,
              details: {
                invalidElementId: eid,
              },
            })
          }
        }
      }
    }

    // Validate elements
    for (const element of data.elements) {
      // Element surveyId must match survey
      if (element.surveyId !== surveyId) {
        errors.push({
          type: 'reference',
          entityType: 'element',
          entityId: element._id,
          field: 'surveyId',
          message: `Element surveyId (${element.surveyId}) does not match survey (${surveyId})`,
          repairable: true,
          details: {
            expected: surveyId,
            actual: element.surveyId,
          },
        })
      }

      // Element sectionId must reference existing section
      if (element.sectionId && !sectionIds.has(element.sectionId)) {
        errors.push({
          type: 'reference',
          entityType: 'element',
          entityId: element._id,
          field: 'sectionId',
          message: `Element references non-existent section: ${element.sectionId}`,
          repairable: true,
          details: {
            invalidSectionId: element.sectionId,
          },
        })
      }
    }

    // Validate survey sectionIds array
    if (Array.isArray(data.survey.sectionIds)) {
      for (const sid of data.survey.sectionIds) {
        if (!sectionIds.has(sid)) {
          errors.push({
            type: 'reference',
            entityType: 'survey',
            entityId: surveyId,
            field: 'sectionIds',
            message: `Survey references non-existent section: ${sid}`,
            repairable: true,
            details: {
              invalidSectionId: sid,
            },
          })
        }
      }
    }

    // Validate survey elementIds array
    if (Array.isArray(data.survey.elementIds)) {
      for (const eid of data.survey.elementIds) {
        if (!elementIds.has(eid)) {
          errors.push({
            type: 'reference',
            entityType: 'survey',
            entityId: surveyId,
            field: 'elementIds',
            message: `Survey references non-existent element: ${eid}`,
            repairable: true,
            details: {
              invalidElementId: eid,
            },
          })
        }
      }
    }

    return errors
  }
}
