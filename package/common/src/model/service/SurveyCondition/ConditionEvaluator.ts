import { QuestionInfo } from './types'
import { ConditionValidator } from './ConditionValidator'
import { ExpressionContext } from '../SurveyExpression/types'
import { evaluateJsExpression } from '../SurveyExpression/ExpressionEvaluator'

export interface EvaluationResult {
  shouldShow: boolean
  error?: string
}

export class ConditionEvaluator {
  /**
   * Evaluates a condition expression against a context
   *
   * @param condition - The condition expression to evaluate
   * @param context - The evaluation context with participant data and answers
   * @returns Result indicating whether the element should be shown
   */
  static evaluate(
    condition: string | null,
    context: ExpressionContext,
  ): EvaluationResult {
    // No condition means always show
    if (!condition || condition.trim() === '') {
      return { shouldShow: true }
    }

    const { value, error } = evaluateJsExpression(condition, context)
    if (error) {
      // isSafeExpression rejection vs. a runtime error both fail open
      // (show the element), matching the previous behaviour - the "unsafe
      // constructs" message is preserved verbatim since callers/tests match
      // on its text.
      return {
        shouldShow: true,
        error:
          error === 'Expression contains unsafe constructs'
            ? 'Condition contains unsafe constructs'
            : error,
      }
    }

    // Coerce to boolean
    return { shouldShow: Boolean(value) }
  }

  /**
   * Evaluates a condition only if it is structurally valid (correct syntax,
   * no forward references, all referenced codes exist). An invalid condition
   * fails open — the gated element always shows — without ever invoking the
   * runtime evaluator, keeping `evaluate`'s runtime-error fail-open behaviour
   * separate from structural invalidity.
   *
   * @param condition - The condition expression to evaluate
   * @param context - The evaluation context with participant data and answers
   * @param availableQuestions - Questions available for reference (ordered by position)
   * @param position - Position of the element with this condition
   * @param participantVariableNames - Optional set of known participant variable names
   */
  static evaluateIfValid(
    condition: string | null,
    context: ExpressionContext,
    availableQuestions: QuestionInfo[],
    position: number,
    participantVariableNames?: Set<string>,
  ): EvaluationResult {
    if (!condition || condition.trim() === '') {
      return { shouldShow: true }
    }

    const validation = ConditionValidator.validate(
      condition,
      availableQuestions,
      position,
      participantVariableNames,
    )

    if (!validation.isValid) {
      return {
        shouldShow: true,
        error: validation.errors.join('; '),
      }
    }

    return this.evaluate(condition, context)
  }

  /**
   * Evaluates multiple conditions, returning true only if all pass
   * Useful for checking both group and question conditions
   */
  static evaluateAll(
    conditions: (string | null)[],
    context: ExpressionContext,
  ): EvaluationResult {
    for (const condition of conditions) {
      const result = this.evaluate(condition, context)
      if (!result.shouldShow) {
        return result
      }
      if (result.error) {
        // Continue but track error
        console.warn('Condition evaluation error:', result.error)
      }
    }
    return { shouldShow: true }
  }
}
