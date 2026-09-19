import {
  QuestionType,
  QUESTION_TYPE_TEXT,
  QUESTION_TYPE_NUMBER,
  QUESTION_TYPE_DATE,
  QUESTION_TYPE_TIME,
  QUESTION_TYPE_DATETIME,
  QUESTION_TYPE_CHECKBOX,
  QUESTION_TYPE_DROPDOWN,
  QUESTION_TYPE_BUTTON,
  QUESTION_TYPE_IMAGE_SELECT,
  QUESTION_TYPE_YES_NO,
  QUESTION_TYPE_STAR_RATING,
  QUESTION_TYPE_POINT_5,
  QUESTION_TYPE_POINT_10,
  QUESTION_TYPE_MATRIX_COMPOSITE,
  QUESTION_TYPE_MATRIX_TEXT,
  QUESTION_TYPE_MATRIX_NUMBER,
  QUESTION_TYPE_MATRIX_DATE,
  QUESTION_TYPE_MATRIX_TIME,
  QUESTION_TYPE_MATRIX_DATETIME,
  QUESTION_TYPE_MATRIX_CHECKBOX,
  QUESTION_TYPE_MATRIX_YES_NO,
} from './attributeMeta/types'

export type MatrixCellType = 'number' | 'string' | 'boolean'
export type MatrixCellValue = number | string | boolean

/**
 * The stored value type of a matrix cell, derived from its subquestion (row) type.
 */
export function getMatrixCellType(subquestionType: string): MatrixCellType {
  if (subquestionType === QUESTION_TYPE_NUMBER) return 'number'
  if (
    subquestionType === QUESTION_TYPE_CHECKBOX ||
    subquestionType === QUESTION_TYPE_YES_NO
  )
    return 'boolean'
  return 'string'
}

export function isMatrixCellTypeBoolean(subquestionType: string): boolean {
  return getMatrixCellType(subquestionType) === 'boolean'
}

export const MATRIX_SUBQUESTION_TYPES = [
  QUESTION_TYPE_TEXT,
  QUESTION_TYPE_NUMBER,
  QUESTION_TYPE_DATE,
  QUESTION_TYPE_TIME,
  QUESTION_TYPE_DATETIME,
  QUESTION_TYPE_CHECKBOX,
  QUESTION_TYPE_YES_NO,
]

/**
 * All matrix question types (generic + typed variants)
 */
export const MATRIX_QUESTION_TYPES: QuestionType[] = [
  QUESTION_TYPE_MATRIX_COMPOSITE,
  QUESTION_TYPE_MATRIX_TEXT,
  QUESTION_TYPE_MATRIX_NUMBER,
  QUESTION_TYPE_MATRIX_DATE,
  QUESTION_TYPE_MATRIX_TIME,
  QUESTION_TYPE_MATRIX_DATETIME,
  QUESTION_TYPE_MATRIX_CHECKBOX,
  QUESTION_TYPE_MATRIX_YES_NO,
]

export interface MatrixTypeConfig {
  defaultSubquestionType: QuestionType
}

export const MATRIX_TYPE_CONFIG: Record<string, MatrixTypeConfig> = {
  [QUESTION_TYPE_MATRIX_TEXT]: {
    defaultSubquestionType: QUESTION_TYPE_TEXT,
  },
  [QUESTION_TYPE_MATRIX_NUMBER]: {
    defaultSubquestionType: QUESTION_TYPE_NUMBER,
  },
  [QUESTION_TYPE_MATRIX_DATE]: {
    defaultSubquestionType: QUESTION_TYPE_DATE,
  },
  [QUESTION_TYPE_MATRIX_TIME]: {
    defaultSubquestionType: QUESTION_TYPE_TIME,
  },
  [QUESTION_TYPE_MATRIX_DATETIME]: {
    defaultSubquestionType: QUESTION_TYPE_DATETIME,
  },
  [QUESTION_TYPE_MATRIX_CHECKBOX]: {
    defaultSubquestionType: QUESTION_TYPE_CHECKBOX,
  },
  [QUESTION_TYPE_MATRIX_YES_NO]: {
    defaultSubquestionType: QUESTION_TYPE_YES_NO,
  },
}

export function isMatrixQuestionType(type: string): boolean {
  return MATRIX_QUESTION_TYPES.includes(type as QuestionType)
}

/**
 * Question types that have discrete answer options (non-matrix)
 */
export const CHOICE_QUESTION_TYPES: QuestionType[] = [
  QUESTION_TYPE_CHECKBOX,
  QUESTION_TYPE_DROPDOWN,
  QUESTION_TYPE_BUTTON,
  QUESTION_TYPE_IMAGE_SELECT,
  QUESTION_TYPE_YES_NO,
  QUESTION_TYPE_STAR_RATING,
  QUESTION_TYPE_POINT_5,
  QUESTION_TYPE_POINT_10,
]

export function isChoiceQuestionType(type: string): boolean {
  return CHOICE_QUESTION_TYPES.includes(type as QuestionType)
}

/**
 * Matrix question types whose cell values aggregate naturally into the
 * stats page's count/percentage/average model.
 */
export const MATRIX_STATS_COMPATIBLE_TYPES: QuestionType[] = [
  QUESTION_TYPE_MATRIX_CHECKBOX,
  QUESTION_TYPE_MATRIX_YES_NO,
  QUESTION_TYPE_MATRIX_NUMBER,
]

export function isMatrixStatsCompatibleType(type: string): boolean {
  return MATRIX_STATS_COMPATIBLE_TYPES.includes(type as QuestionType)
}

export function getMatrixTypeConfig(
  type: string,
): MatrixTypeConfig | undefined {
  return MATRIX_TYPE_CONFIG[type]
}

export function getMatrixDefaultSubquestionType(type: string): QuestionType {
  return (
    MATRIX_TYPE_CONFIG[type]?.defaultSubquestionType ?? QUESTION_TYPE_CHECKBOX
  )
}

/**
 * Returns true if at least one cell in a matrix response has a filled value.
 * A cell is considered filled when it is not null, undefined, or an empty string.
 * This includes false (a valid yes/no answer) and 0 (a valid number answer).
 */
export function hasAnyMatrixCellFilled(matrixValue: unknown): boolean {
  if (typeof matrixValue !== 'object' || matrixValue === null) return false
  for (const rowKey of Object.keys(matrixValue)) {
    const row = (matrixValue as Record<string, unknown>)[rowKey]
    if (typeof row !== 'object' || row === null) continue
    for (const cellKey of Object.keys(row)) {
      const val = (row as Record<string, unknown>)[cellKey]
      if (val !== null && val !== undefined && val !== '') return true
    }
  }
  return false
}

/**
 * Sparse response data for a matrix question.
 * Outer key = subquestion.code
 * Inner key = answerOption.code
 */
export interface MatrixResponseData {
  [subquestionCode: string]: {
    [answerOptionCode: string]: MatrixCellValue
  }
}
