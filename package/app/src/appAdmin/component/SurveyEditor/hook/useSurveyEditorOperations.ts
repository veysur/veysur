import { useEffect, useRef, useCallback, useMemo } from 'react'
import { Survey, Iso639v1 } from 'veysur-common'

import { useSurveyEditor } from './useSurveyEditor'
import { useSurveyEditorStore } from './useSurveyEditorStore'
import { useSurveyEditorFocus } from './useSurveyEditorFocus'
import { createSurveyOperations } from './createSurveyOperations'
import { useValidateAndBuffer } from '../validation/useValidateAndBuffer'

type Props = {
  surveyId?: string
  useSurveyEditorState: ReturnType<typeof useSurveyEditor>
}

export function useSurveyEditorOperations({
  surveyId,
  useSurveyEditorState,
}: Props) {
  const {
    survey,
    updateSurveyState,
    patchBuffer,
    patchBufferRef,
    bufferPatches,
    patchMutation,
  } = useSurveyEditorState
  const setPatchBuffer = useSurveyEditorStore((state) => state.setPatchBuffer)

  const { validateAndBuffer } = useValidateAndBuffer({ bufferPatches })

  const updateSurvey = useCallback(
    (updater: (s: Survey) => Survey) => updateSurveyState(updater),
    [updateSurveyState],
  )

  const { surveyFocus, setSurveyFocus, getFocusedEntity } =
    useSurveyEditorFocus()
  const surveyFocusedEntity = survey && getFocusedEntity(survey)

  const setLangEditing = useSurveyEditorStore((state) => state.setLangEditing)
  const setLangFetch = useSurveyEditorStore((state) => state.setLangFetch)
  const langEditing = useSurveyEditorStore((state) => state.langEditing)
  const initializedLangForSurvey = useRef<string | undefined>(undefined)

  useEffect(() => {
    // Only set default language if:
    // 1. We haven't initialized for this survey yet
    // 2. Current langEditing is invalid
    // 3. Survey has a default language
    const surveyChanged = initializedLangForSurvey.current !== surveyId
    const langIsInvalid =
      !langEditing || !Object.keys(Iso639v1).includes(langEditing)

    if (surveyChanged && langIsInvalid && survey?.language?.default) {
      setLangEditing(survey.language.default)
      setLangFetch(survey.language.default)
      initializedLangForSurvey.current = surveyId
    } else if (surveyChanged && !langIsInvalid) {
      // Language is valid (possibly from persisted prefs), just mark as initialized.
      // Reset langFetch so the survey is fetched for the current editing language.
      setLangFetch(langEditing)
      initializedLangForSurvey.current = surveyId
    }
  }, [survey, surveyId, langEditing, setLangEditing, setLangFetch])

  const operations = useMemo(
    () =>
      createSurveyOperations(
        updateSurvey,
        bufferPatches,
        setSurveyFocus,
        validateAndBuffer,
      ),
    [updateSurvey, bufferPatches, setSurveyFocus, validateAndBuffer],
  )

  // Sync operations and patchMutation to store
  const setOperations = useSurveyEditorStore((state) => state.setOperations)
  const setPatchMutationStore = useSurveyEditorStore(
    (state) => state.setPatchMutation,
  )

  // Initialize patchBuffer in store on mount
  useEffect(() => {
    setPatchBuffer(patchBufferRef.current)
  }, [setPatchBuffer, patchBufferRef])

  useEffect(() => {
    setOperations(operations)
  }, [operations, setOperations])
  useEffect(() => {
    setPatchMutationStore(patchMutation)
  }, [patchMutation, setPatchMutationStore])

  return {
    surveyFocus,
    setSurveyFocus,
    surveyFocusedEntity,
    patchBuffer,
    patchMutation,
    operations,
  }
}
