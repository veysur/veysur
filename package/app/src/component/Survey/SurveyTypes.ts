import type {
  ContentFormat,
  SurveyContent,
  SurveyQuestion,
  SurveySection,
  ValidationMessage,
} from 'veysur-common'

export type SurveyAnswers = {
  [questionCode: string]: unknown
}

export type QuestionWithGroup = {
  question: SurveyQuestion
  group: SurveySection
}

export type ContentWithSection = {
  element: SurveyContent
  // `SurveySection` is the `SurveySection` class today (kind-discriminated).
  section: SurveySection
}

/**
 * One row in the participant survey's ordered render list — a question or a
 * content element, interleaved in `survey.elementIds` order.
 */
export type SurveyRenderItem =
  | ({ kind: 'question' } & QuestionWithGroup)
  | ({ kind: 'content' } & ContentWithSection)

export const isQuestionItem = (
  item: SurveyRenderItem,
): item is { kind: 'question' } & QuestionWithGroup => item.kind === 'question'

export const isContentItem = (
  item: SurveyRenderItem,
): item is { kind: 'content' } & ContentWithSection => item.kind === 'content'

/**
 * Multiple choice answer stored as object format for direct property access.
 * Format: { [answerOptionCode: string]: true }
 * Example: { A001: true, A003: true } for selected options A001 and A003
 */
export type MultipleChoiceAnswerObject = { [answerOptionCode: string]: true }

export type ValidationErrors = {
  [questionCode: string]: ValidationMessage[] | undefined
}

export type SurveyFormatType = 'all' | 'group' | 'question'

export type SurveyPresentationConfig = {
  format?: SurveyFormatType | null
  noAnswer?: boolean | null
  title?: boolean | null
  progressBar?: boolean | null
  questionCount?: boolean | null
  groupName?: boolean | null
  groupDesc?: boolean | null
  questionNum?: boolean | null
  questionCode?: boolean | null
  questionIndex?: boolean | null
  backNav?: boolean | null
  navDelay?: number | null
  redirectEnd?: boolean | null
  welcomeMessage?: boolean | null
  print?: boolean | null
  thankYouLink?: boolean | null
}

export type SurveyPolicyConfig = {
  show?: boolean | null
  text?: { getLang: (lang: string) => string } | null
}

// The survey's effective content format/sanitization settings (survey-level
// override, falling back to the project default) - resolved once at the
// `Survey` component root via `resolveContentFormat(survey.getContentFormat(...))`
// and threaded down to every render site alongside `presentation`.
export type SurveyContentFormatConfig = {
  format: ContentFormat
  scriptTagsAllowed: boolean
}
