import { GroupInfo, QuestionInfo } from './types'
import {
  CHOICE_OTHER_CODE,
  CHOICE_OTHER_VALUE_KEY,
} from '../../constructor/Survey/attributeMeta/constants'
import { isMultiPartQuestionType } from '../../constructor/Survey/MultiPart'
import { isMatrixQuestionType } from '../../constructor/Survey/Matrix'
import { questionTypeHasReferenceableAnswerOptions } from './answerOptionReferenceability'

/**
 * Shared primitives for "does this survey-entity reference resolve, and is it
 * allowed from here" - the existence + forward-reference checks common to the
 * condition validator (`ConditionValidator`) and the text-expression
 * validator (`validateTextExpressions`). Keeping the rule in one place is
 * what makes "a text expression can never offer, or accept, a reference the
 * condition builder would reject" true by construction.
 */

export function findQuestion(
  questions: QuestionInfo[],
  code: string,
): QuestionInfo | undefined {
  return questions.find((question) => question.code === code)
}

export function findGroup(
  groups: GroupInfo[],
  code: string,
): GroupInfo | undefined {
  return groups.find((group) => group.code === code)
}

/**
 * `null` when `position` is strictly before `currentPosition`; an error
 * string otherwise. A reference to an element at or after the referring
 * element's own position is a forward reference.
 */
export function forwardReferenceError(
  code: string,
  position: number,
  currentPosition: number,
): string | null {
  if (position >= currentPosition) {
    return `Forward reference not allowed: ${code} (position ${position}) cannot be referenced from position ${currentPosition}`
  }
  return null
}

/**
 * Validates that `optionCode` is an addressable answer option (or
 * subquestion/part, or the "Other" pseudo-codes) of `question`. Returns an
 * error string or `null`.
 */
export function answerOptionReferenceError(
  question: QuestionInfo,
  optionCode: string,
): string | null {
  if (isMultiPartQuestionType(question.type)) {
    const parts = question.subquestions ?? []
    if (parts.length > 0 && !parts.some((part) => part.code === optionCode)) {
      return `Unknown part ${optionCode} for question ${question.code}`
    }
    return null
  }

  // Every matrix type addresses its cell axis by answer-option code, whether the
  // columns are user-defined (composite/checkbox/text/number/date) or predefined
  // (yes/no). `questionTypeHasReferenceableAnswerOptions` only covers a subset of
  // those, so a matrix cell is validated directly against the question's codes.
  if (isMatrixQuestionType(question.type)) {
    const codes = new Set(question.answerOptionCodes ?? [])
    if (codes.size > 0 && !codes.has(optionCode)) {
      return `Unknown answer option code: ${optionCode} for question ${question.code}`
    }
    return null
  }

  if (
    optionCode === CHOICE_OTHER_CODE ||
    optionCode === CHOICE_OTHER_VALUE_KEY
  ) {
    if (!question.choiceOtherValue) {
      return `${question.code} references the "Other" option, but it is not enabled`
    }
    return null
  }

  if (!questionTypeHasReferenceableAnswerOptions(question.type)) {
    return `${question.code} does not have addressable answer options (type: ${question.type})`
  }

  const codes = new Set(question.answerOptionCodes ?? [])
  if (codes.size > 0 && !codes.has(optionCode)) {
    return `Unknown answer option code: ${optionCode} for question ${question.code}`
  }
  return null
}

/**
 * Validates that `subquestionCode` is a subquestion (matrix row) of
 * `question`. Returns an error string or `null`.
 */
export function subquestionReferenceError(
  question: QuestionInfo,
  subquestionCode: string,
): string | null {
  const subquestions = question.subquestions ?? []
  if (
    subquestions.length > 0 &&
    !subquestions.some((subquestion) => subquestion.code === subquestionCode)
  ) {
    return `Unknown subquestion ${subquestionCode} for question ${question.code}`
  }
  return null
}
