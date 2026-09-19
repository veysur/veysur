export type ParticipantData = Record<string, unknown>

export interface ExpressionResult {
  value: unknown
  error?: string
}

/**
 * The variables available to a JS expression - shared by the condition
 * builder (skip/display logic) and by expressions embedded in survey text
 * (`{{...}}` tokens in group/question/subquestion/answer-option text and the
 * thank-you message). Building this context once and reusing it everywhere
 * is what keeps "same variables as the condition builder" true by
 * construction rather than by convention.
 */
export interface ExpressionContext {
  participant: ParticipantData
  answers: { [questionCode: string]: unknown }
  /**
   * Human-readable rendering of each answer, addressed as
   * `answerLabels.<questionCode>` (and sub-paths). Where `answers.*` exposes
   * the raw stored value (`{ A001: true }`, `"42"`, an ISO date string),
   * `answerLabels.*` resolves the selected option label(s) - `", "`-joined
   * for multi-select, the scalar value for text/number/date/time, and `""`
   * when the question is unanswered. A question with an answer-option or
   * subquestion axis is stored as an object (so `answerLabels.Q.A001`
   * member access never throws); a pure scalar question is stored as a bare
   * string. Populated only when the builder is given question `text`/
   * `answerOptions` - empty otherwise. Never read by condition evaluation.
   *
   * Optional only so hand-built contexts (chiefly tests) need not spell it
   * out; `ExpressionContextBuilder` always populates it.
   */
  answerLabels?: { [questionCode: string]: unknown }
  /**
   * Static survey text, addressed as `labels.<questionCode>` /
   * `labels.<groupCode>` (bare form = question text / group name) plus the
   * suffixes `.detail` / `.desc` / `.name` and `.<answerOptionCode>` for an
   * option label. Named for symmetry with `answerLabels.*`: `labels.*` is the
   * static label, `answerLabels.*` the label(s) the participant selected.
   * Each value is a `String`-wrapper object: `String(value)` in
   * `resolveTextExpressions` unwraps it to the primary text for the bare
   * form, and member access reads an attached own-property. Answer-independent
   * (obeys the same forward-reference rule as `answers.*` purely for
   * predictability). Never read by condition evaluation.
   *
   * Optional only so hand-built contexts (chiefly tests) need not spell it
   * out; `ExpressionContextBuilder` always populates it.
   */
  labels?: { [code: string]: unknown }
  /**
   * Metadata about the response itself, addressed as `response.<field>`
   * in expressions - a container deliberately separate from `answers`
   * (which is keyed by question code) so a question can never be coded the
   * same as a metadata field name (e.g. `language`) and shadow it, or vice
   * versa. Currently just `language` (the live survey-taking language); more
   * fields may be added over time - see `SurveyCondition/responseFields.ts`.
   */
  response: Record<string, unknown>
  answerOptionCodes: string[]
  /**
   * Maps a dot-accessed predefined-option token (e.g. "Q002.YES") to the JS
   * literal it stands for (e.g. "true"), for types like yesNo/starRating/
   * point5/point10 whose answer is stored as a raw boolean/number rather
   * than an options-object. See `ExpressionEvaluator.evaluateJsExpression`.
   */
  answerOptionLiterals?: Record<string, string>
}
