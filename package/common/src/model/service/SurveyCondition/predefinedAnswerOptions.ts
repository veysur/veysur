import { getPredefinedAnswerOptions } from '../../constructor/Survey/questionType'
import { CHOICE_OTHER_CODE } from '../../constructor/Survey/attributeMeta/constants'
import { AnswerOptionInfo, QuestionInfo } from './types'

type QuestionForAnswerOptionCodes = {
  type: string
  answerOptions?: Iterable<{ code: string }>
  attributes?: Record<string, unknown>
}

/**
 * Stored `answerOptions` entries plus the synthetic `OTHER` entry when
 * "Other" is actually enabled on the question - the non-predefined half of
 * the answer-option merge rule shared by `buildAnswerOptionCodesForQuestion`
 * and `buildAnswerOptionsForQuestion`.
 */
function getStoredAnswerOptionEntries<AO extends { code: string }>(
  question: {
    answerOptions?: Iterable<AO>
    attributes?: Record<string, unknown>
  },
  getLabel: (answerOption: AO) => string | undefined,
): AnswerOptionInfo[] {
  return [
    ...(question.answerOptions
      ? Array.from(question.answerOptions).map((ao) => ({
          code: ao.code,
          label: getLabel(ao),
        }))
      : []),
    ...(question.attributes?.choiceOther
      ? [{ code: CHOICE_OTHER_CODE, label: 'Other' }]
      : []),
  ]
}

/**
 * Answer option codes addressable by a condition for a given question:
 * predefined codes for types like yesNo/starRating/point5/point10, or the
 * question's own stored `answerOptions` codes plus the synthetic `OTHER`
 * code when "Other" is actually enabled on the question.
 */
export function buildAnswerOptionCodesForQuestion(
  question: QuestionForAnswerOptionCodes,
): string[] {
  const predefined = getPredefinedAnswerOptions(question.type)
  if (predefined) {
    return predefined.map((o) => o.code)
  }

  return getStoredAnswerOptionEntries(question, () => undefined).map(
    (entry) => entry.code,
  )
}

/**
 * Answer options (code + label) addressable by a condition for a given
 * question: predefined options for types like yesNo/starRating/point5/
 * point10, or the question's own stored `answerOptions` plus the synthetic
 * `OTHER` option when "Other" is actually enabled on the question.
 *
 * `getLabel` resolves a stored answer option's localized label - callers
 * own L10n resolution (e.g. `ao.label?.getLang(lang, langDefault)`), since
 * this module has no notion of the currently-selected language.
 *
 * Point-scale types (star rating, point5, point10) carry an `answerOptions`
 * collection of optional author captions (`P1`..`PN`) alongside the
 * predefined options. When a caption is set it overrides the predefined
 * numeric label by matching code, so `{{answerLabels.Q003}}` renders the
 * caption ("Neutral") rather than the bare point value ("3").
 */
export function buildAnswerOptionsForQuestion<AO extends { code: string }>(
  question: {
    type: string
    answerOptions?: Iterable<AO>
    attributes?: Record<string, unknown>
  },
  getLabel: (answerOption: AO) => string | undefined,
): AnswerOptionInfo[] {
  const predefined = getPredefinedAnswerOptions(question.type)
  if (predefined) {
    const captionByCode = new Map<string, string>()
    for (const ao of question.answerOptions ?? []) {
      const caption = getLabel(ao)
      if (caption) captionByCode.set(ao.code, caption)
    }
    return predefined.map((o) => ({
      code: o.code,
      label: captionByCode.get(o.code) ?? o.label,
    }))
  }

  return getStoredAnswerOptionEntries(question, getLabel)
}

/**
 * The subset of `QuestionInfo` shared by every builder that derives it from a
 * `SurveyQuestion` (survey runtime, editor validity check, condition editor):
 * `code`/`type`/`position`, the addressable answer-option codes, and
 * subquestion code+type for matrix questions. Callers layer their own
 * language-resolved fields (`text`, `answerOptions`, `choiceFormat`,
 * `choiceOtherValue`, subquestion `text`) on top - this module has no notion
 * of the currently-selected language.
 */
export function buildQuestionInfoBase(
  question: QuestionForAnswerOptionCodes & {
    code: string
    subquestions?: Iterable<{ code: string; type: string }>
  },
  position: number,
): Pick<
  QuestionInfo,
  'code' | 'type' | 'position' | 'answerOptionCodes' | 'subquestions'
> {
  return {
    code: question.code,
    type: question.type,
    position,
    answerOptionCodes: buildAnswerOptionCodesForQuestion(question),
    subquestions: question.subquestions
      ? Array.from(question.subquestions).map((sq) => ({
          code: sq.code,
          type: sq.type,
        }))
      : undefined,
  }
}

/**
 * `QuestionInfo.choiceOtherValue` is `true` only when "Other" is actually
 * enabled on the question - `undefined` otherwise (not `false`), since
 * `ConditionValidator` checks it with a truthy test.
 */
export function getChoiceOtherValue(question: {
  attributes?: Record<string, unknown>
}): boolean | undefined {
  return question.attributes?.choiceOther ? true : undefined
}

/**
 * Builds a `{ "answers.Q002.YES": "true", "answers.Q003.P4": "4", ... }` map
 * across all questions with predefined answer options, for `ConditionEvaluator`
 * to rewrite dot-accessed predefined-option tokens into literal comparisons
 * before compiling a condition.
 */
export function buildPredefinedAnswerOptionLiterals(
  questionsInfo: QuestionInfo[],
): Record<string, string> {
  const literals: Record<string, string> = {}
  for (const question of questionsInfo) {
    const options = getPredefinedAnswerOptions(question.type)
    if (!options) continue
    for (const option of options) {
      literals[`answers.${question.code}.${option.code}`] = JSON.stringify(
        option.value,
      )
    }
  }
  return literals
}
