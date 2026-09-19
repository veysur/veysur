import { useCallback } from 'react'
import type { SurveyQuestion } from 'veysur-common'

import { useTextExpressionVariablePicker } from './useTextExpressionVariablePicker'

/**
 * `getErrors(html)` returns the `{{expression}}` validation messages for a
 * label / sub-question / part text belonging to `question`, for inline
 * `<FieldError>` display in the question-type editors. Held to the same
 * variable-addressing rules as the publish gate (`SurveyValidation`) - a
 * label / sub-question / part shares its parent question's survey position.
 */
export function useLabelExpressionErrors(question: SurveyQuestion) {
  const { validate } = useTextExpressionVariablePicker(question)

  return useCallback(
    (html: string | null | undefined): string[] =>
      html ? validate(html).map((error) => error.message) : [],
    [validate],
  )
}
