import { QuestionInfo } from '../SurveyCondition/types'
import {
  isMatrixCellTypeBoolean,
  isMatrixQuestionType,
} from '../../constructor/Survey/Matrix'
import {
  getMultiPartDefaultSubquestionType,
  isMultiPartQuestionType,
} from '../../constructor/Survey/MultiPart'
import { getPredefinedAnswerOptions } from '../../constructor/Survey/questionType'
import {
  CHOICE_OTHER_CODE,
  CHOICE_OTHER_VALUE_KEY,
} from '../../constructor/Survey/attributeMeta/constants'
import { QUESTION_TYPE_YES_NO } from '../../constructor/Survey/attributeMeta/types'

/** Fixed multi-select / multi-part join separator (locked with product). */
export const ANSWER_LABEL_JOIN = ', '

/**
 * A `String` primitive wrapper carrying extra own-properties. `String(node)`
 * unwraps to `primary` (so `{{answerLabels.Q005}}` / `{{text.Q005}}` render
 * the primary text) while member access reads an attached property (so
 * `{{answerLabels.Q005.A001}}` / `{{text.Q005.desc}}` resolve without the
 * bare-form access throwing on a plain string). This is the one deliberate
 * boundary where the expression-context builders step outside plain data.
 */
export function makeStringNode(
  primary: string | null | undefined,
  props: Record<string, unknown> = {},
): unknown {
  return Object.assign(new String(primary ?? ''), props)
}

function optionLabelMap(question: QuestionInfo): Map<string, string> {
  const map = new Map<string, string>()
  for (const option of question.answerOptions ?? []) {
    map.set(option.code, option.label || option.code)
  }
  for (const option of getPredefinedAnswerOptions(question.type) ?? []) {
    map.set(option.code, option.label)
  }
  return map
}

/**
 * Author per-point captions (point scales) and any other author-set labels
 * live on the parent question as `answerOptions` rows, blank by default -
 * only the ones actually set are exposed.
 */
function captionByCode(question: QuestionInfo): Map<string, string> {
  const map = new Map<string, string>()
  for (const option of question.answerOptions ?? []) {
    if (option.label) map.set(option.code, option.label)
  }
  return map
}

/**
 * Matches a stored answer value against a predefined option's `value`,
 * tolerating a string/number/boolean mismatch (legacy DB rows store rating
 * values and yes/no as strings; the app normalises on load but old data and
 * server-side calls may not be normalised).
 */
function matchesPredefinedValue(
  optionValue: unknown,
  rawValue: unknown,
): boolean {
  return optionValue === rawValue || String(optionValue) === String(rawValue)
}

function isEmptyCell(value: unknown): boolean {
  return value === undefined || value === null || value === ''
}

/** Maps a yes/no matrix cell's raw boolean to its "Yes" / "No" label. */
function resolveYesNoCellLabel(value: unknown): string {
  const options = getPredefinedAnswerOptions(QUESTION_TYPE_YES_NO) ?? []
  const match = options.find((option) =>
    matchesPredefinedValue(option.value, value),
  )
  return match ? match.label : String(value)
}

function questionHasAxis(question: QuestionInfo): boolean {
  return Boolean(
    (question.answerOptions && question.answerOptions.length > 0) ||
    (question.answerOptionCodes && question.answerOptionCodes.length > 0) ||
    (question.subquestions && question.subquestions.length > 0) ||
    getPredefinedAnswerOptions(question.type),
  )
}

// Matrix: { S001: { A001: <cell>, ... }, ... } - each row (subquestion) is
// rendered per its own cell type:
//  - yesNo row     -> "Yes" / "No" per set column, empty columns omitted
//  - checkbox row  -> the label of each ticked column, unticked omitted
//  - any other row -> the raw cell value via String(), empty cells omitted
//                     (a numeric 0 is a real answer and is kept)
// matrixComposite needs no special-case: its rows carry their own types.
function resolveMatrixAnswerLabels(
  question: QuestionInfo,
  rawValue: unknown,
): unknown {
  const columnLabels = optionLabelMap(question)
  const rows =
    rawValue && typeof rawValue === 'object'
      ? (rawValue as Record<string, unknown>)
      : {}
  const props: Record<string, unknown> = {}
  for (const subquestion of question.subquestions ?? []) {
    const row = rows[subquestion.code]
    const cells =
      row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
    const isYesNoRow = subquestion.type === QUESTION_TYPE_YES_NO
    const isBooleanRow = isMatrixCellTypeBoolean(subquestion.type)

    const cellProps: Record<string, unknown> = {}
    const rowValues: string[] = []
    for (const [code, columnLabel] of columnLabels) {
      const cell = cells[code]
      let rendered: string | undefined
      if (isYesNoRow) {
        rendered = isEmptyCell(cell) ? undefined : resolveYesNoCellLabel(cell)
      } else if (isBooleanRow) {
        rendered = cell ? columnLabel : undefined
      } else {
        rendered = isEmptyCell(cell) ? undefined : String(cell)
      }
      cellProps[code] = rendered
      if (rendered !== undefined) rowValues.push(rendered)
    }
    props[subquestion.code] = makeStringNode(
      rowValues.join(ANSWER_LABEL_JOIN),
      cellProps,
    )
  }
  // No meaningful whole-question label for a matrix.
  return makeStringNode('', props)
}

// Multi-Part: { P001: 'x', P002: true, P003: 4 } - one flat value per part.
function resolveMultiPartAnswerLabels(
  question: QuestionInfo,
  rawValue: unknown,
): unknown {
  const parts =
    rawValue && typeof rawValue === 'object'
      ? (rawValue as Record<string, unknown>)
      : {}
  // Every part shares the one fixed part type; Multi-Part types themselves
  // aren't registered, so resolve predefined options via the part type.
  const partOptions =
    getPredefinedAnswerOptions(
      getMultiPartDefaultSubquestionType(question.type),
    ) ?? []
  const captions = captionByCode(question)

  const props: Record<string, unknown> = {}
  const values: string[] = []
  for (const part of question.subquestions ?? []) {
    const partValue = parts[part.code]
    if (partValue === undefined || partValue === null || partValue === '') {
      props[part.code] = undefined
      continue
    }
    const match = partOptions.find((option) =>
      matchesPredefinedValue(option.value, partValue),
    )
    const label = match
      ? (captions.get(match.code) ?? match.label)
      : String(partValue)
    props[part.code] = label
    values.push(label)
  }
  return makeStringNode(values.join(ANSWER_LABEL_JOIN), props)
}

// Predefined-option scalar (yesNo / starRating / point5 / point10): the answer
// is a raw boolean / number, NOT an options object.
function resolvePredefinedScalarAnswerLabels(
  question: QuestionInfo,
  rawValue: unknown,
): unknown {
  const predefined = getPredefinedAnswerOptions(question.type) ?? []
  const captions = captionByCode(question)
  const props: Record<string, unknown> = {}
  for (const option of predefined) {
    props[option.code] = captions.get(option.code) ?? option.label
  }
  if (rawValue === undefined || rawValue === null) {
    return makeStringNode('', props)
  }
  const match = predefined.find((option) =>
    matchesPredefinedValue(option.value, rawValue),
  )
  const label = match
    ? (captions.get(match.code) ?? match.label)
    : String(rawValue)
  return makeStringNode(label, props)
}

// Choice (single / multi / with "Other"): { A001: true, OTHER_VALUE: 'x' }
function resolveChoiceAnswerLabels(
  question: QuestionInfo,
  rawValue: unknown,
): unknown {
  const labels = optionLabelMap(question)
  const obj =
    rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)
      ? (rawValue as Record<string, unknown>)
      : {}
  const props: Record<string, unknown> = {}
  // Every option label is exposed statically, selected or not.
  for (const [code, label] of labels) props[code] = label

  const selected: string[] = []
  for (const [code, label] of labels) {
    // The "Other" option is represented in the whole-question label by its
    // free-text value (below), not the generic "Other" label - so skip the
    // `{ OTHER: true }` flag here to avoid "Other, <typed text>".
    if (code === CHOICE_OTHER_CODE) continue
    if (
      obj[code] ||
      (Array.isArray(rawValue) && rawValue.map(String).includes(code))
    ) {
      selected.push(label)
    }
  }
  const other = obj[CHOICE_OTHER_VALUE_KEY]
  if (typeof other === 'string' && other) {
    props[CHOICE_OTHER_VALUE_KEY] = other
    selected.push(other)
  }
  return makeStringNode(selected.join(ANSWER_LABEL_JOIN), props)
}

/**
 * Resolves the `answerLabels.<questionCode>` node for one question from its
 * raw stored answer value (`undefined` when unanswered). Questions with an
 * answer-option or subquestion axis return a `String`-wrapper node whose
 * attached keys are the per-option / per-row labels; a pure scalar question
 * returns a bare string. See the per-question-type table in
 * `package/common/docs/survey-expressions.md`.
 *
 * Branch order matters: the predefined-scalar check must come before the
 * generic choice branch because star / point-scale questions also carry an
 * `answerOptions` collection - the author's per-point captions on `P1..PN` -
 * which would otherwise send them down the choice branch and resolve to "".
 */
export function resolveAnswerLabelValue(
  question: QuestionInfo,
  rawValue: unknown,
): unknown {
  if (isMatrixQuestionType(question.type)) {
    return resolveMatrixAnswerLabels(question, rawValue)
  }

  if (isMultiPartQuestionType(question.type)) {
    return resolveMultiPartAnswerLabels(question, rawValue)
  }

  const predefined = getPredefinedAnswerOptions(question.type)
  if (predefined && predefined.length > 0) {
    return resolvePredefinedScalarAnswerLabels(question, rawValue)
  }

  if (question.answerOptions && question.answerOptions.length > 0) {
    return resolveChoiceAnswerLabels(question, rawValue)
  }

  // Pure scalar: text / number / date / time.
  if (
    rawValue === undefined ||
    rawValue === null ||
    typeof rawValue === 'object'
  ) {
    return questionHasAxis(question) ? makeStringNode('', {}) : ''
  }
  return String(rawValue)
}
