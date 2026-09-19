import {
  QuestionType,
  QUESTION_TYPE_TEXT,
  QUESTION_TYPE_NUMBER,
  QUESTION_TYPE_YES_NO,
  QUESTION_TYPE_STAR_RATING,
  QUESTION_TYPE_POINT_5,
  QUESTION_TYPE_POINT_10,
  QUESTION_TYPE_MULTI_PART_TEXT,
  QUESTION_TYPE_MULTI_PART_NUMBER,
  QUESTION_TYPE_MULTI_PART_YES_NO,
  QUESTION_TYPE_MULTI_PART_STAR_RATING,
  QUESTION_TYPE_MULTI_PART_POINT_5,
  QUESTION_TYPE_MULTI_PART_POINT_10,
} from './attributeMeta/types'

/**
 * All Multi-Part question types. Unlike Matrix, Multi-Part questions have no
 * answer-option axis — each is a flat list of independently-answered parts
 * (reusing `SurveySubquestion`/`SurveySubquestionCollection` as-is).
 */
export const MULTI_PART_QUESTION_TYPES: QuestionType[] = [
  QUESTION_TYPE_MULTI_PART_TEXT,
  QUESTION_TYPE_MULTI_PART_NUMBER,
  QUESTION_TYPE_MULTI_PART_YES_NO,
  QUESTION_TYPE_MULTI_PART_STAR_RATING,
  QUESTION_TYPE_MULTI_PART_POINT_5,
  QUESTION_TYPE_MULTI_PART_POINT_10,
]

export interface MultiPartTypeConfig {
  /**
   * The single, fixed answer type every part (subquestion) of this
   * Multi-Part question type must have — set once when a part is created
   * and never changeable afterwards, mirroring Matrix's fixed subquestion
   * type rule.
   */
  partType: QuestionType
}

export const MULTI_PART_TYPE_CONFIG: Record<string, MultiPartTypeConfig> = {
  [QUESTION_TYPE_MULTI_PART_TEXT]: {
    partType: QUESTION_TYPE_TEXT,
  },
  [QUESTION_TYPE_MULTI_PART_NUMBER]: {
    partType: QUESTION_TYPE_NUMBER,
  },
  [QUESTION_TYPE_MULTI_PART_YES_NO]: {
    partType: QUESTION_TYPE_YES_NO,
  },
  [QUESTION_TYPE_MULTI_PART_STAR_RATING]: {
    partType: QUESTION_TYPE_STAR_RATING,
  },
  [QUESTION_TYPE_MULTI_PART_POINT_5]: {
    partType: QUESTION_TYPE_POINT_5,
  },
  [QUESTION_TYPE_MULTI_PART_POINT_10]: {
    partType: QUESTION_TYPE_POINT_10,
  },
}

export function isMultiPartQuestionType(type: string): boolean {
  return MULTI_PART_QUESTION_TYPES.includes(type as QuestionType)
}

/**
 * Multi-Part question types whose part values aggregate naturally into the
 * stats page's count/percentage/average model. Mirrors
 * `MATRIX_STATS_COMPATIBLE_TYPES` - every Multi-Part type except Text (no
 * standalone Text stats support either).
 */
export const MULTI_PART_STATS_COMPATIBLE_TYPES: QuestionType[] = [
  QUESTION_TYPE_MULTI_PART_NUMBER,
  QUESTION_TYPE_MULTI_PART_YES_NO,
  QUESTION_TYPE_MULTI_PART_STAR_RATING,
  QUESTION_TYPE_MULTI_PART_POINT_5,
  QUESTION_TYPE_MULTI_PART_POINT_10,
]

export function isMultiPartStatsCompatibleType(type: string): boolean {
  return MULTI_PART_STATS_COMPATIBLE_TYPES.includes(type as QuestionType)
}

export function getMultiPartTypeConfig(
  type: string,
): MultiPartTypeConfig | undefined {
  return MULTI_PART_TYPE_CONFIG[type]
}

export function getMultiPartDefaultSubquestionType(type: string): QuestionType {
  return MULTI_PART_TYPE_CONFIG[type]?.partType ?? QUESTION_TYPE_TEXT
}

export type MultiPartValue = string | number | boolean

/**
 * Flat response data for a Multi-Part question — one value per part, keyed
 * by the part's (subquestion's) code. Contrast with `MatrixResponseData`,
 * which nests a second key for the answer-option axis that Multi-Part
 * questions don't have.
 */
export interface MultiPartResponseData {
  [partCode: string]: MultiPartValue
}

/**
 * Returns true if at least one part in a Multi-Part response has a filled
 * value. A part is considered filled when it is not null, undefined, or an
 * empty string — this includes false (a valid yes/no answer) and 0 (a valid
 * number answer).
 */
export function hasAnyMultiPartFilled(multiPartValue: unknown): boolean {
  if (typeof multiPartValue !== 'object' || multiPartValue === null) {
    return false
  }
  for (const key of Object.keys(multiPartValue as Record<string, unknown>)) {
    const val = (multiPartValue as Record<string, unknown>)[key]
    if (val !== null && val !== undefined && val !== '') return true
  }
  return false
}
