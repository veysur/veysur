// cspell:ignore quot
import { ExpressionContext } from './types'
import { evaluateJsExpression, isSafeExpression } from './ExpressionEvaluator'
import {
  extractVariablePaths,
  firstUnknownRootIdentifier,
} from './SafeExpressionInterpreter'
import { ConditionValidator } from '../SurveyCondition/ConditionValidator'
import { GroupInfo, QuestionInfo } from '../SurveyCondition/types'
import { validateVariablePath } from '../SurveyCondition/variablePathValidation'

export interface ResolveTextExpressionsOptions {
  /**
   * `'html'` (default) HTML-escapes every resolved value before splicing it
   * into the template - literal template text is left untouched. This is
   * what stops an expression's *output* becoming a script-injection vector,
   * since the token scan runs on raw HTML before `sanitizeHtml`/DOMPurify.
   * `'markdown'` additionally backslash-escapes CommonMark punctuation, so a
   * resolved value cannot become a Markdown link/image/etc. when the template
   * is later rendered by `renderMarkdownToHtml` - use this at markdown-format
   * render sites (see `expressionEscapeForContentFormat`).
   * `'none'` is opt-in, for contexts where escaping would corrupt the output.
   */
  escape?: 'html' | 'markdown' | 'none'
}

// Non-greedy: allows arbitrary expression content (`{{answers.Q001 + 1}}`),
// not just the dotted-path-only tokens `resolveTemplate`'s piping supports.
const TOKEN_PATTERN = /\{\{\s*(.+?)\s*\}\}/g

/**
 * Regex source for a `{{expression}}` token, shared so other token-detection
 * consumers (e.g. the admin-only expression-pill preview in `package/app`)
 * never drift out of sync with what `resolveTextExpressions`/
 * `validateTextExpressions` actually treat as a token. Exposed as a source
 * string plus a factory rather than the regex instance itself, since a `g`
 * -flagged `RegExp` is stateful (`lastIndex`) and must not be shared as a
 * single mutable instance across independent callers.
 */
export const EXPRESSION_TOKEN_SOURCE = TOKEN_PATTERN.source

export function createExpressionTokenPattern(): RegExp {
  return new RegExp(EXPRESSION_TOKEN_SOURCE, 'g')
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Backslash-escapes every ASCII-punctuation character CommonMark allows
 * escaping, so `value` renders as literal text through `renderMarkdownToHtml`
 * - no link, image, emphasis, heading, blockquote, pipe-table cell, or
 * auto-linked bare URL (`:` and `/` are escaped, so `linkify` no longer
 * matches). HTML-dangerous characters (`<`, `>`, `&`, `"`) are in that set
 * too, and markdown-it (configured `html: false`) HTML-escapes them in its
 * text output - so this must NOT `escapeHtml` first: pre-escaping `'` to
 * `&#39;` and then backslash-escaping the `&` makes markdown-it re-encode it
 * to `&amp;#39;`, which renders as the literal text `&#39;`.
 */
export function escapeMarkdown(value: string): string {
  return value.replace(/[!-/:-@[-`{-~]/g, '\\$&')
}

/**
 * Resolves every `{{expression}}` token in `html` by evaluating it as a JS
 * expression against `context` (`answers`, `participant`, `response` - the
 * same variables the condition builder exposes). An unsafe expression, a
 * runtime error, or `undefined`/`null` result leaves the token as literal
 * text (fail open) - matching `ConditionEvaluator`'s fail-open behaviour on
 * runtime errors, so a bad expression never blanks out survey text.
 */
export function resolveTextExpressions(
  html: string,
  context: ExpressionContext,
  options: ResolveTextExpressionsOptions = {},
): string {
  if (!html) return html

  const escape = options.escape ?? 'html'

  return html.replace(TOKEN_PATTERN, (match, expression: string) => {
    const { value, error } = evaluateJsExpression(expression, context)
    if (error || value === undefined || value === null) {
      return match
    }
    const str = String(value)
    if (escape === 'markdown') return escapeMarkdown(str)
    if (escape === 'html') return escapeHtml(str)
    return str
  })
}

export interface TextExpressionValidationError {
  expression: string
  message: string
}

/**
 * Structurally validates every `{{expression}}` token in `html` (syntax,
 * unknown/misused variable paths, forward references) without evaluating it -
 * the text-field counterpart of `ConditionValidator.validate`, run at
 * admin-save time and by `SurveyValidation` so authors get feedback before
 * previewing/taking the survey.
 *
 * Every predefined-variable path (`answers.*`, `answerLabels.*`, `labels.*`,
 * `participant.*`, `response.*`) is checked end-to-end by `validateVariablePath`
 * so a path of the wrong depth for the question type, or with trailing
 * nonsense segments, is rejected. `ConditionValidator.validate` still runs for
 * JS syntax and operator-grammar checks.
 *
 * `ctx.position` is the position of the question the containing text element
 * is scoped to (for a group name/description, the position of the group's
 * first question; for the welcome message, `0`; for the thank-you message, a
 * position past the last question so nothing counts as a forward reference).
 * `ctx.allQuestions` / `ctx.allGroups` are the full (not position-filtered)
 * survey structure used for `labels.*` existence checks - `labels.*` is exempt
 * from the forward-reference rule; they default to the position-filtered lists
 * when omitted.
 */
export interface ValidateTextExpressionsContext {
  /** Position-filtered questions (the `answers.*` / `answerLabels.*` axis). */
  availableQuestions: QuestionInfo[]
  position: number
  participantVariableNames?: Set<string>
  /** Position-filtered groups. Defaults to `[]`. */
  availableGroups?: GroupInfo[]
  /** Full question list for `labels.*` checks. Defaults to `availableQuestions`. */
  allQuestions?: QuestionInfo[]
  /** Full group list for `labels.*` checks. Defaults to `availableGroups`. */
  allGroups?: GroupInfo[]
}

export function validateTextExpressions(
  html: string,
  ctx: ValidateTextExpressionsContext,
): TextExpressionValidationError[] {
  if (!html) return []

  const availableGroups = ctx.availableGroups ?? []
  const errorCtx: ExpressionErrorContext = {
    availableQuestions: ctx.availableQuestions,
    allQuestions: ctx.allQuestions ?? ctx.availableQuestions,
    allGroups: ctx.allGroups ?? availableGroups,
    position: ctx.position,
    participantVariableNames: ctx.participantVariableNames,
  }

  const errors: TextExpressionValidationError[] = []
  for (const match of html.matchAll(TOKEN_PATTERN)) {
    const expression = match[1]
    const message = firstExpressionError(expression, errorCtx)
    if (message) errors.push({ expression, message })
  }
  return errors
}

interface ExpressionErrorContext {
  availableQuestions: QuestionInfo[]
  allQuestions: QuestionInfo[]
  allGroups: GroupInfo[]
  position: number
  participantVariableNames?: Set<string>
}

/**
 * Returns the first validation problem with a single `{{expression}}` body, or
 * `undefined` when it is valid. Checks stop at the first failure - one message
 * per expression, in priority order (specific path errors, then unknown
 * variables, then JS-grammar errors) rather than a `; `-joined pile where a
 * single mistake surfaces as several differently-worded complaints.
 */
function firstExpressionError(
  expression: string,
  ctx: ExpressionErrorContext,
): string | undefined {
  for (const reference of extractVariablePaths(expression)) {
    const pathError = validateVariablePath(reference, {
      answerQuestions: ctx.availableQuestions,
      allQuestions: ctx.allQuestions,
      allGroups: ctx.allGroups,
      position: ctx.position,
      participantVariableNames: ctx.participantVariableNames,
    })
    if (pathError) return pathError
  }

  if (!isSafeExpression(expression)) {
    const unknown = firstUnknownRootIdentifier(expression)
    return unknown
      ? `Unknown variable: ${unknown}`
      : 'Expression contains unsafe constructs'
  }

  // `answerLabels.*` / `labels.*` are text-expression-only namespaces the
  // condition-builder grammar (`ConditionParser`) does not understand - it
  // would misread their segments as bare answer codes. `extractVariablePaths`
  // + `validateVariablePath` fully cover those tokens; only run the condition
  // validator (for JS syntax + operator grammar) when no text-only namespace
  // is present.
  if (!/\b(?:answerLabels|labels)\./.test(expression)) {
    const conditionResult = ConditionValidator.validate(
      expression,
      ctx.availableQuestions,
      ctx.position,
      ctx.participantVariableNames,
    )
    if (!conditionResult.isValid) return conditionResult.errors[0]
  }

  return undefined
}
