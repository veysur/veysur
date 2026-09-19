import { useCallback } from 'react'

import { useSurveyEditorStore } from 'appAdmin/component/SurveyEditor'

/**
 * Shared `updateAnswerOptionLabel` binding for point-scale answer-option
 * labels — used by both `PointScaleLabelEdit`'s stacked rows and
 * `MultiPartPointScaleHeader`'s column headers, which otherwise differ only
 * in layout.
 */
export function usePointScaleLabelHandler(
  questionId: string,
  langDefault: string,
) {
  const operations = useSurveyEditorStore((state) => state.operations)
  const langEditing = useSurveyEditorStore((state) => state.langEditing)

  return useCallback(
    (answerId: string, text: string) =>
      operations?.updateAnswerOptionLabel?.(
        questionId,
        answerId,
        text,
        langEditing,
        langDefault,
      ),
    [operations, questionId, langEditing, langDefault],
  )
}
