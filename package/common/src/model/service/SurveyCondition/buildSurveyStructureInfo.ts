import { GroupInfo, QuestionInfo } from './types'
import type { SurveyAttributes } from '../../constructor/Survey/attributeMeta'
import { isSurveyQuestion } from '../../constructor/Survey/SurveyQuestion'
import { isGroupSection } from '../../constructor/Survey/SurveySection'
import {
  buildAnswerOptionsForQuestion,
  buildQuestionInfoBase,
  getChoiceOtherValue,
} from './predefinedAnswerOptions'

/**
 * The `QuestionInfo[]` / `GroupInfo[]` view of a survey that both the
 * publish-time validator (`SurveyValidation`) and the editor's variable
 * picker / text-expression validator (`useTextExpressionVariablePicker`)
 * need. Keeping the derivation in one place is what makes "the editor offers
 * exactly what the publish gate accepts" true by construction - a change to
 * which questions/answer options are referenceable lands in both at once.
 */
export interface SurveyStructureInfo {
  questionsInfo: QuestionInfo[]
  groupsInfo: GroupInfo[]
  /**
   * Group `_id` -> position of its first question in survey order (`0` for a
   * group with no questions). The single source of truth for the group side
   * of the forward-reference rule, shared by every caller that would
   * otherwise re-derive it from `survey.elements`.
   */
  groupPositionById: Map<string, number>
}

interface L10nLike {
  getLang(languageCode: string, defaultLanguageCode?: string): string
}

interface AnswerOptionLike {
  code: string
  label?: L10nLike | null
}

interface SubquestionLike {
  code: string
  type: string
  text?: L10nLike | null
}

interface QuestionLike {
  code: string
  type: string
  kind?: string
  sectionId?: string
  attributes?: SurveyAttributes
  answerOptions?: Iterable<AnswerOptionLike>
  subquestions?: Iterable<SubquestionLike>
  text?: L10nLike | null
  detail?: L10nLike | null
}

interface SectionLike {
  _id: string
  code: string
  kind?: string
  name?: L10nLike | null
  desc?: L10nLike | null
}

interface SurveyLike {
  elements: Iterable<QuestionLike>
  sections: Iterable<SectionLike>
}

export interface BuildSurveyStructureInfoOptions {
  /**
   * When set, localized text fields (`text`/`detail`, answer-option labels,
   * subquestion text, group `name`/`desc`) are resolved for this language and
   * layered onto the structural info - the editor needs them for the variable
   * picker labels. Omit for structure-only publish validation.
   */
  lang?: string
  langDefault?: string
  /**
   * Publish validation keeps every section; the editor picker drops sections
   * that contain no questions. Defaults to `false` (editor behaviour).
   */
  includeEmptyGroups?: boolean
}

export function buildSurveyStructureInfo(
  survey: SurveyLike,
  options: BuildSurveyStructureInfoOptions = {},
): SurveyStructureInfo {
  const { lang, langDefault, includeEmptyGroups = false } = options
  const resolve = (l10n: L10nLike | null | undefined): string | undefined =>
    lang ? l10n?.getLang(lang, langDefault || 'en') : undefined

  const questions = Array.from(survey.elements).filter((element) =>
    isSurveyQuestion(element),
  )
  const groups = Array.from(survey.sections).filter((section) =>
    isGroupSection(section),
  )

  const firstIndexByGroup = new Map<string, number>()
  questions.forEach((question, index) => {
    if (question.sectionId && !firstIndexByGroup.has(question.sectionId)) {
      firstIndexByGroup.set(question.sectionId, index)
    }
  })

  const groupPositionById = new Map<string, number>()
  for (const group of groups) {
    groupPositionById.set(group._id, firstIndexByGroup.get(group._id) ?? 0)
  }

  const questionsInfo: QuestionInfo[] = questions.map((question, index) => ({
    ...buildQuestionInfoBase(question, index),
    choiceFormat: question.attributes?.choiceFormat,
    choiceOtherValue: getChoiceOtherValue(question),
    ...(lang
      ? {
          text: resolve(question.text),
          detail: resolve(question.detail),
          answerOptions: buildAnswerOptionsForQuestion(
            question,
            (answerOption) => resolve(answerOption.label),
          ),
          subquestions: question.subquestions
            ? Array.from(question.subquestions).map((subquestion) => ({
                code: subquestion.code,
                type: subquestion.type,
                text: resolve(subquestion.text),
              }))
            : undefined,
        }
      : {}),
  }))

  const groupsInfo: GroupInfo[] = groups
    .filter((group) => includeEmptyGroups || firstIndexByGroup.has(group._id))
    .map((group) => ({
      code: group.code,
      position: groupPositionById.get(group._id) ?? 0,
      ...(lang ? { name: resolve(group.name), desc: resolve(group.desc) } : {}),
    }))

  return { questionsInfo, groupsInfo, groupPositionById }
}
