import { ExpressionContext, ExpressionResult } from './types'
import {
  checkExpressionSafety,
  evaluateSafeExpression,
} from './SafeExpressionInterpreter'

export type { ExpressionResult }

/**
 * Structural preflight check ("would this parse into an allowed
 * expression") - not the security boundary itself. See
 * `SafeExpressionInterpreter.evaluateSafeExpression` (the actual execution
 * path) for why `window`/`Function`/`this`/etc. are unreachable regardless
 * of what this check catches ahead of time.
 */
export function isSafeExpression(expression: string): boolean {
  return checkExpressionSafety(expression)
}

/**
 * Safely evaluates a JS expression against `answers`/`participant`/
 * `response`. The single execution path (and safety boundary) shared by the
 * condition builder (`ConditionEvaluator`, which boolean-coerces the
 * result) and by expressions embedded in survey text (which substitute the
 * result into HTML) - see `package/common/docs/survey-conditions.md` and
 * `package/common/docs/template-variables.md`.
 *
 * Parses into a restricted-grammar AST and interprets it with a hand-rolled
 * evaluator that only ever resolves `answers`/`participant`/`response` and a
 * small explicit allowlist of members/calls, rather than compiling the raw
 * string with `new Function`.
 */
export function evaluateJsExpression(
  expression: string,
  context: ExpressionContext,
): ExpressionResult {
  return evaluateSafeExpression(expression, context)
}
