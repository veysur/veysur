import { useCallback, useMemo } from 'react'
import { SurveyContent } from 'veysur-common'

import {
  useSurveyEditorStore,
  useTextExpressionVariablePicker,
  useSurveyContentFormat,
} from '../hook'
import { useSurveyEditorValidation } from '../validation'

/**
 * State and handlers for a content element's L10n `text` field, shared by every
 * content type edit component (the body of a text element, the caption of a
 * video).
 */
export function useContentTextEdit(element: SurveyContent) {
  const { getFieldError } = useSurveyEditorValidation()
  const langEditing = useSurveyEditorStore((state) => state.langEditing)
  const langDefault = useSurveyEditorStore((state) => state.langDefault)
  const updateContentText = useSurveyEditorStore(
    (state) => state.operations?.updateContentText,
  )
  const { variablePickerGroups } = useTextExpressionVariablePicker(element)
  const { format: contentFormat } = useSurveyContentFormat()

  const onChange = useCallback(
    (text: string) => {
      updateContentText?.(element._id, text, langEditing, langDefault)
    },
    [updateContentText, element._id, langEditing, langDefault],
  )

  const value = useMemo(
    () => element.text?.getLang(langEditing, '') ?? '',
    [element.text, langEditing],
  )
  const errors =
    getFieldError('content', element._id, `text.${langEditing}`) ?? []

  return {
    langEditing,
    value,
    errors,
    onChange,
    variablePickerGroups,
    contentFormat,
  }
}
