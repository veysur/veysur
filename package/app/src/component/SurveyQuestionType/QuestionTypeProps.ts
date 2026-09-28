import {
  SurveyQuestion,
  ExpressionContext,
  resolveTextExpressions,
} from 'veysur-common'

// Caps the width of single-line answer controls (text/number/date/time/select) so they
// don't stretch edge-to-edge on wide desktop survey columns. Wide-format question types
// (matrix, multi-part, ranking, image select, point-scale rows) intentionally opt out.
export const ANSWER_CONTROL_MAX_WIDTH = 'max-w-2xl'

// Shared hover/active feedback for toggleable answer items (checkboxes, radio buttons)
// to match the scale + colour affordance already used by the rating question types.
export const TOGGLE_HOVER_CLASS =
  'transition-transform duration-150 hover:scale-110 active:scale-95 data-[state=unchecked]:hover:border-primary data-[state=unchecked]:hover:bg-muted'

export type QuestionTypeProps = {
  question: SurveyQuestion
  // value shape varies per question type (string, number, array, matrix object, etc.)
  // across ~25 consumers; narrowing to a real union is a larger cross-cutting change
  // out of scope here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any
  langOptions?: string[]
  lang: string
  langDefault: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see value above
  onChange?: (value: any) => void
  /** answers/participant/response scope for `{{...}}` expressions in
   * subquestion text and answer-option labels - see
   * `SurveyQuestionRenderer`'s `expressionContext`, which this is the same
   * value as (already scoped to earlier-answered questions only). */
  expressionContext?: ExpressionContext
  /** Participant JWT - only `QuestionTypeFileUpload` uses it, to call the
   * participant file-upload endpoints. Undefined in admin preview. */
  authToken?: string
  /** Ensures a response row exists server-side before a file upload proceeds - only
   * `QuestionTypeFileUpload` uses it. No-op if a response has already been saved. */
  ensureResponseStarted?: () => Promise<void>
}

/**
 * Resolves `{{...}}` expressions in subquestion text / answer-option labels,
 * which render as plain React text (never `dangerouslySetInnerHTML`), so the
 * result must not be HTML-escaped - unlike question text/detail and group
 * description, which go through `sanitizeHtml`.
 */
export function resolveLabelText(
  text: string,
  expressionContext: ExpressionContext | undefined,
): string {
  return expressionContext
    ? resolveTextExpressions(text, expressionContext, { escape: 'none' })
    : text
}
