import { ExpressionContext, ParticipantData } from './types'
import { buildPredefinedAnswerOptionLiterals } from '../SurveyCondition/predefinedAnswerOptions'
import { isMultiPartQuestionType } from '../../constructor/Survey/MultiPart'
import { GroupInfo, QuestionInfo } from '../SurveyCondition/types'
import { makeStringNode, resolveAnswerLabelValue } from './resolveAnswerLabels'

export interface SurveyAnswer {
  questionCode: string
  value: unknown
}

export class ExpressionContextBuilder {
  /**
   * Builds an execution context from survey state
   *
   * @param participantData - Data about the survey participant
   * @param answers - Array of answers provided so far
   * @param questionsInfo - Information about all questions
   * @param response - Metadata about the response itself (e.g.
   *                   `{ language: 'zh' }`, the live survey-taking language) -
   *                   exposed as `response.<field>`, a container kept
   *                   separate from `answers` (question-code-keyed answers)
   *                   so the two can never collide.
   * @returns Context object ready for expression evaluation
   */
  static build(
    participantData: ParticipantData,
    answers: SurveyAnswer[],
    questionsInfo: QuestionInfo[],
    response?: Record<string, unknown>,
    groups?: GroupInfo[],
  ): ExpressionContext {
    const context: ExpressionContext = {
      participant: { ...participantData },
      answers: {},
      answerLabels: {},
      labels: {},
      response: response ?? {},
      answerOptionCodes: [],
      answerOptionLiterals: buildPredefinedAnswerOptionLiterals(questionsInfo),
    }

    // Initialize every question code so it exists as a real key in the context,
    // even when unanswered. Checkbox/multi-choice questions get an empty object
    // so that property access like Q002.A002 returns undefined (falsy) rather than
    // throwing; other question types get undefined so direct comparisons like
    // Q001 === 'Liverpool' evaluate to false instead of throwing a ReferenceError.
    // Matrix questions store answers as { [subquestionCode]: { [answerOptionCode]: value } }
    // (see MatrixResponseData), so the skeleton needs an empty object per subquestion -
    // otherwise Q001.S001.A005 throws on the unanswered `.A005` access into `undefined`.
    // Multi-Part questions store answers flat, { [partCode]: value } (see
    // MultiPartResponseData) - a part is addressed directly as Q001.P001, so its
    // skeleton default must be undefined (falsy), not an empty object.
    for (const question of questionsInfo) {
      if (question.subquestions && question.subquestions.length > 0) {
        context.answers[question.code] = isMultiPartQuestionType(question.type)
          ? Object.fromEntries(
              question.subquestions.map((sq) => [sq.code, undefined]),
            )
          : Object.fromEntries(question.subquestions.map((sq) => [sq.code, {}]))
      } else {
        context.answers[question.code] =
          question.answerOptionCodes && question.answerOptionCodes.length > 0
            ? {}
            : undefined
      }
    }

    // Build question code to answer value mapping (overrides the empty defaults above).
    // Matrix questions store answers sparsely - a subquestion row is only present once
    // the participant has interacted with it - so a wholesale replace of the skeleton
    // would drop the `{}` placeholder for untouched rows, causing Q001.S002.A005 to throw
    // when only S001 has been answered. Merge per-subquestion instead so every row keeps
    // its skeleton object.
    const questionInfoByCode = new Map(questionsInfo.map((q) => [q.code, q]))
    for (const answer of answers) {
      const question = questionInfoByCode.get(answer.questionCode)
      const isMatrixShaped =
        question?.subquestions &&
        question.subquestions.length > 0 &&
        !isMultiPartQuestionType(question.type)

      if (isMatrixShaped && answer.value && typeof answer.value === 'object') {
        context.answers[answer.questionCode] = {
          ...(context.answers[answer.questionCode] as Record<string, unknown>),
          ...(answer.value as Record<string, unknown>),
        }
      } else {
        context.answers[answer.questionCode] = answer.value
      }
    }

    // Collect all answer option codes from all questions
    const allOptionCodes = new Set<string>()
    for (const question of questionsInfo) {
      if (question.answerOptionCodes) {
        for (const code of question.answerOptionCodes) {
          allOptionCodes.add(code)
        }
      }
    }
    context.answerOptionCodes = Array.from(allOptionCodes)

    // `answerLabels.<Q>` - a human-readable rendering of each answer, keyed
    // by question code. Resolved from the raw answer value already merged
    // into `context.answers` above, so matrix sparse-merge is respected.
    // `labels.<Q>` - the static question text/detail plus per-option labels,
    // as a `String`-wrapper node (bare form = question text).
    for (const question of questionsInfo) {
      context.answerLabels![question.code] = resolveAnswerLabelValue(
        question,
        context.answers[question.code],
      )

      // Absent facets of an existing question resolve to '' (not the literal
      // token) - the question exists, this part of it is just empty.
      const labelProps: Record<string, unknown> = {
        name: question.text ?? '',
        detail: question.detail ?? '',
      }
      for (const option of question.answerOptions ?? []) {
        labelProps[option.code] = option.label ?? option.code
      }
      // Matrix row / Multi-Part part text: `labels.Q005.S001`.
      for (const subquestion of question.subquestions ?? []) {
        labelProps[subquestion.code] = subquestion.text ?? ''
      }
      context.labels![question.code] = makeStringNode(
        question.text ?? '',
        labelProps,
      )
    }

    // `labels.<G>` - group name/description. `name`/`desc` are also attached
    // so `{{labels.G001.name}}` / `{{labels.G001.desc}}` resolve.
    for (const group of groups ?? []) {
      context.labels![group.code] = makeStringNode(group.name ?? '', {
        name: group.name ?? '',
        desc: group.desc ?? '',
      })
    }

    return context
  }

  /**
   * Creates an empty context (for validation purposes)
   */
  static buildEmpty(): ExpressionContext {
    return {
      participant: {},
      answers: {},
      answerLabels: {},
      labels: {},
      response: {},
      answerOptionCodes: [],
      answerOptionLiterals: {},
    }
  }
}
