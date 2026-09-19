import {
  CHOICE_OTHER_CODE,
  CHOICE_OTHER_VALUE_KEY,
  RANKING_ORDER_KEY,
} from './constants'
import { getAllPredefinedAnswerOptionCodes } from '../questionType'

/**
 * Entity codes reserved across the whole survey (never assignable as a
 * question/group code): the fixed OTHER/OTHER_VALUE/ORDER pseudo-codes, plus
 * every predefined answer option code currently registered by a question
 * type (yesNo's YES/NO, the point-scale types' P1..P10, and any
 * dynamically-registered custom type's own codes). Computed from the
 * `questionType` registry so it never drifts out of sync with what's
 * actually registered - see `model/constructor/Survey/questionType`.
 */
export function getReservedEntityCodes(): string[] {
  return [
    CHOICE_OTHER_CODE,
    CHOICE_OTHER_VALUE_KEY,
    RANKING_ORDER_KEY,
    ...getAllPredefinedAnswerOptionCodes(),
  ]
}
