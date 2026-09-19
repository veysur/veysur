import { GroupInfo, QuestionInfo } from './types'
import { RESPONSE_FIELD_NAMES } from './responseFields'
import { questionTypeHasReferenceableAnswerOptions } from './answerOptionReferenceability'
import {
  answerOptionReferenceError,
  findGroup,
  findQuestion,
  forwardReferenceError,
} from './entityReferenceValidation'
import { isMatrixQuestionType } from '../../constructor/Survey/Matrix'
import { isMultiPartQuestionType } from '../../constructor/Survey/MultiPart'
import type { VariablePathReference } from '../SurveyExpression/SafeExpressionInterpreter'

/**
 * Structure the survey exposes to a variable path. `answerQuestions` is the
 * position-filtered list (the forward-reference rule applies to `answers.*` /
 * `answerLabels.*`); `allQuestions` / `allGroups` are the full survey
 * structure, used for `labels.*` existence checks, which are exempt from the
 * forward-reference rule.
 */
export interface VariablePathContext {
  answerQuestions: QuestionInfo[]
  allQuestions: QuestionInfo[]
  allGroups: GroupInfo[]
  position: number
  participantVariableNames?: Set<string>
}

// Non-code member accesses on a `labels.<code>` node (question text/detail,
// group name/description) - everything else after the code must be an entity
// code (answer option, matrix sub-question, or multi-part part).
const LABEL_TEXT_SUFFIXES = new Set(['name', 'detail', 'desc', 'text'])

function isSubquestionCode(question: QuestionInfo, code: string): boolean {
  return (question.subquestions ?? []).some((sub) => sub.code === code)
}

function trailingSegmentError(
  reference: VariablePathReference,
  fromIndex: number,
): string | null {
  const extra = reference.segments.slice(fromIndex).filter((s) => s !== '*')
  if (extra.length === 0) return null
  return `${reference.raw}: unexpected trailing path segment "${extra[0]}"`
}

function validateAnswerOrLabelPath(
  reference: VariablePathReference,
  ctx: VariablePathContext,
  { readable }: { readable: boolean },
): string | null {
  const [code, segment2, segment3] = reference.segments

  if (!code || code === '*') return null

  // Look the question up in the full survey list so a forward reference is
  // reported as such rather than as "unknown" (the position-filtered
  // `answerQuestions` list omits questions at or after `ctx.position`).
  const question =
    findQuestion(ctx.answerQuestions, code) ??
    findQuestion(ctx.allQuestions, code)
  if (!question) {
    return `Unknown question code "${code}" in ${reference.raw}`
  }

  const forward = forwardReferenceError(code, question.position, ctx.position)
  if (forward) return forward

  // `answers.Q` / `answerLabels.Q` - the whole (raw or readable) value.
  if (!segment2) return null
  if (segment2 === '*') return null

  if (isMatrixQuestionType(question.type)) {
    if (!isSubquestionCode(question, segment2)) {
      // An answer-option code where a sub-question code belongs, or an unknown
      // code - either way the addressable unit of a matrix is a single cell.
      // (Sub-questions and answer options are not "rows"/"columns" - matrix
      // orientation can be flipped in the survey.)
      return `${reference.raw} is not a valid matrix reference - address a matrix cell as ${reference.namespace}.${code}.<subQuestion>.<answerOption>, with the sub-question code before the answer-option code`
    }
    if (!segment3) {
      // `answers.Q.S001` alone has no single value; `answerLabels.Q.S001` is
      // the readable label for that sub-question and is fine.
      if (!readable) {
        return `${reference.raw} references a matrix sub-question, which has no single value - reference a specific cell (${reference.namespace}.${code}.${segment2}.<answerOption>), or answerLabels.${code}.${segment2} for the readable label`
      }
      return null
    }
    if (segment3 !== '*') {
      const cellError = answerOptionReferenceError(question, segment3)
      if (cellError) return cellError
    }
    return trailingSegmentError(reference, 3)
  }

  if (isMultiPartQuestionType(question.type)) {
    const partError = answerOptionReferenceError(question, segment2)
    if (partError) return partError
    return trailingSegmentError(reference, 2)
  }

  // Choice-style (or any type with addressable answer options).
  if (!questionTypeHasReferenceableAnswerOptions(question.type)) {
    return `${reference.raw}: ${code} (type: ${question.type}) has no addressable answer options`
  }
  const optionError = answerOptionReferenceError(question, segment2)
  if (optionError) return optionError
  return trailingSegmentError(reference, 2)
}

function validateLabelPath(
  reference: VariablePathReference,
  ctx: VariablePathContext,
): string | null {
  const [code, segment2, segment3] = reference.segments
  if (!code || code === '*') return null

  const group = findGroup(ctx.allGroups, code)
  const question = findQuestion(ctx.allQuestions, code)
  if (!group && !question) {
    return `labels.${code}: unknown question or group code "${code}"`
  }

  if (!segment2 || segment2 === '*') return null

  if (LABEL_TEXT_SUFFIXES.has(segment2)) {
    return trailingSegmentError(reference, 2)
  }

  if (!question) {
    return `labels.${code}.${segment2}: a group has no answer options`
  }

  // `labels.Q.A001` (answer-option label) or `labels.Q.S001`
  // (matrix sub-question / multi-part part text).
  if (!isSubquestionCode(question, segment2)) {
    const optionError = answerOptionReferenceError(question, segment2)
    if (optionError) return optionError
  }

  if (segment3 === '*') return null
  return trailingSegmentError(reference, 2)
}

/**
 * Validates a single predefined-variable path (from `extractVariablePaths`)
 * against the survey structure. Returns an error string, or `null` when the
 * whole path resolves. Shared by the text-expression validator
 * (`validateTextExpressions`) so an embedded `{{...}}` expression is held to
 * exactly the addressing rules the "Variable Paths" reference documents.
 */
export function validateVariablePath(
  reference: VariablePathReference,
  ctx: VariablePathContext,
): string | null {
  switch (reference.namespace) {
    case 'answers':
      return validateAnswerOrLabelPath(reference, ctx, { readable: false })
    case 'answerLabels':
      return validateAnswerOrLabelPath(reference, ctx, { readable: true })
    case 'labels':
      return validateLabelPath(reference, ctx)
    case 'participant': {
      const [name] = reference.segments
      if (!name || name === '*') return null
      if (
        ctx.participantVariableNames &&
        ctx.participantVariableNames.size > 0 &&
        !ctx.participantVariableNames.has(name)
      ) {
        return `participant.${name}: unknown participant attribute "${name}"`
      }
      return trailingSegmentError(reference, 1)
    }
    case 'response': {
      const [field] = reference.segments
      if (!field || field === '*') return null
      if (!RESPONSE_FIELD_NAMES.includes(field)) {
        return `response.${field}: unknown response field "${field}"`
      }
      return trailingSegmentError(reference, 1)
    }
    default:
      return null
  }
}
