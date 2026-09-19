import {
  QUESTION_TYPE_CHECKBOX,
  QUESTION_TYPE_DROPDOWN,
  QUESTION_TYPE_BUTTON,
  QUESTION_TYPE_IMAGE_SELECT,
  QUESTION_TYPE_RANKING,
  QUESTION_TYPE_MATRIX_COMPOSITE,
  QUESTION_TYPE_MATRIX_CHECKBOX,
  QUESTION_TYPE_MATRIX_YES_NO,
} from '../../constructor/Survey/attributeMeta/types'
import { questionTypeHasPredefinedAnswerOptions } from '../../constructor/Survey/questionType'

/**
 * Question types whose `answerOptions` collection is referenceable by code in a
 * condition (e.g. `Q001.A001`). Types outside this set either have no answer
 * options at all, or have their addressable options predefined by the type
 * itself rather than stored on the question - see `questionTypeHasPredefinedAnswerOptions`.
 *
 * Single source of truth shared by `ConditionValidator` (live/publish-time
 * validity checks) and `SurveyStructuralChangeImpact` (pre-change warnings) so
 * the two never drift out of sync on which types actually support AO-code
 * references.
 */
export const QUESTION_TYPES_WITH_REFERENCEABLE_ANSWER_OPTIONS = new Set([
  QUESTION_TYPE_CHECKBOX,
  QUESTION_TYPE_DROPDOWN,
  QUESTION_TYPE_BUTTON,
  QUESTION_TYPE_IMAGE_SELECT,
  QUESTION_TYPE_RANKING,
  QUESTION_TYPE_MATRIX_COMPOSITE,
  QUESTION_TYPE_MATRIX_CHECKBOX,
  QUESTION_TYPE_MATRIX_YES_NO,
])

export function questionTypeHasReferenceableAnswerOptions(
  type: string,
): boolean {
  return (
    QUESTION_TYPES_WITH_REFERENCEABLE_ANSWER_OPTIONS.has(type) ||
    questionTypeHasPredefinedAnswerOptions(type)
  )
}

/**
 * Question types whose `answerOptions` collection is populated with user-entered
 * data (as opposed to types with no options, or types with predefined options
 * generated from the type itself - see `questionTypeHasPredefinedAnswerOptions`).
 *
 * Distinct from `questionTypeHasReferenceableAnswerOptions`: predefined-option
 * types are condition-referenceable but do NOT store data in `answerOptions`, so
 * content validation (e.g. checking stored answer option labels have a
 * default-language translation) must use this narrower check, not the OR'd one -
 * otherwise a leftover `answerOptions` collection on a type that no longer reads
 * it (orphaned after a question type change) would be flagged as if it were
 * live data.
 */
export function questionTypeHasStoredAnswerOptions(type: string): boolean {
  return QUESTION_TYPES_WITH_REFERENCEABLE_ANSWER_OPTIONS.has(type)
}

// Note: point5/point10/starRating (and their Multi-Part variants) also now
// populate a real `answerOptions` collection (see
// `questionType/pointScale.ts#buildPointScaleAnswerOptions`), purely to carry
// optional per-point display labels - but they must NOT be added to
// `QUESTION_TYPES_WITH_REFERENCEABLE_ANSWER_OPTIONS`. Doing so would (a) make
// `ConditionEvaluator`'s `Q001.P3`-style tokens stop being rewritten to a
// literal scalar comparison and start resolving via property access instead,
// silently breaking existing conditions, and (b) make `SurveyValidation`'s
// stored-answer-option label check require every point to be labelled before
// publish, when labelling is deliberately optional per point.
