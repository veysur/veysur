import { useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Survey,
  ConditionParser,
  BUFFERED_PATCH_ACTION_UPDATE,
  Patch,
} from 'veysur-common'

import { useLatestRef } from 'hook'
import {
  SURVEY_ENTITY_TYPE_SECTION,
  SURVEY_ENTITY_TYPE_ELEMENT,
} from '../constant'
import { useSurveyEditorStore } from './useSurveyEditorStore'
import { useSurveyEditorUiPref } from './useSurveyEditorUiPref'
import { useSurveyPatchableState } from './useSurveyPatchableState'

type Props = {
  surveyId?: string
}

export function useSurveyEditor({ surveyId }: Props) {
  useSurveyEditorUiPref(surveyId)

  // Use new patchable state hook
  const {
    data: survey,
    isError,
    isLoading,
    isFetching,
    error,
    patchBuffer,
    bufferPatches,
    patchMutation,
    updateState,
    reset,
  } = useSurveyPatchableState({
    surveyId,
    onPatchBufferChange: (buffer) => {
      // Sync patch buffer to store for UI indicators
      const setPatchBuffer = useSurveyEditorStore.getState().setPatchBuffer
      setPatchBuffer?.(buffer)
    },
  })

  // Create backward-compatible patchBufferRef
  const patchBufferRef = useLatestRef(patchBuffer)

  // Create backward-compatible updateSurveyState function
  const updateSurveyState = useCallback(
    (updater: (survey: Survey) => Survey) => {
      updateState((rawData: Survey) => {
        const survey = rawData instanceof Survey ? rawData : new Survey(rawData)
        return updater(survey)
      })
    },
    [updateState],
  )

  // Create backward-compatible resetSurvey function
  const resetSurvey = useCallback(() => {
    reset()
  }, [reset])

  // Create backward-compatible loadSurvey function
  const loadSurvey = useCallback(
    (sid?: string) => {
      if (sid && (!survey?._id || sid != survey?._id)) {
        resetSurvey()
      }
    },
    [survey?._id, resetSurvey],
  )

  // Sync survey to store
  const setSurvey = useSurveyEditorStore((state) => state.setSurvey)
  const surveyInstance = useMemo(
    () => (survey ? new Survey(survey) : undefined),
    [survey],
  )
  useEffect(() => {
    setSurvey(surveyInstance)
  }, [surveyInstance, setSurvey])

  // Backfill `conditionReferences` for any question/group whose condition was
  // saved before this cache field existed. Runs once per loaded survey (keyed
  // on _id, not on every local mutation) so it doesn't re-run on each edit.
  const backfilledSurveyIdRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    const surveyId = surveyInstance?._id
    if (!surveyId || backfilledSurveyIdRef.current === surveyId) return

    const groupsNeedingBackfill = surveyInstance!.sections
      .groups()
      .filter(
        (group) => group.condition != null && group.conditionReferences == null,
      )
    const questionsNeedingBackfill = surveyInstance!.elements
      .questions()
      .filter(
        (question) =>
          question.condition != null && question.conditionReferences == null,
      )

    if (
      groupsNeedingBackfill.length === 0 &&
      questionsNeedingBackfill.length === 0
    ) {
      backfilledSurveyIdRef.current = surveyId
      return
    }

    const patches: Patch[] = []

    updateSurveyState((s) => {
      for (const group of groupsNeedingBackfill) {
        const conditionReferences = ConditionParser.getReferencedCodes(
          group.condition!,
        )
        s = s.updateSection(group._id, { conditionReferences })
        patches.push({
          type: SURVEY_ENTITY_TYPE_SECTION,
          action: BUFFERED_PATCH_ACTION_UPDATE,
          id: group._id,
          data: { conditionReferences },
        })
      }
      for (const question of questionsNeedingBackfill) {
        const conditionReferences = ConditionParser.getReferencedCodes(
          question.condition!,
        )
        s = s.updateQuestion(question._id, { conditionReferences })
        patches.push({
          type: SURVEY_ENTITY_TYPE_ELEMENT,
          action: BUFFERED_PATCH_ACTION_UPDATE,
          id: question._id,
          data: { conditionReferences },
        })
      }
      return s
    })

    if (patches.length > 0) {
      bufferPatches(patches)
    }
    backfilledSurveyIdRef.current = surveyId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyInstance?._id])

  // Sync loading states to store
  const setIsLoading = useSurveyEditorStore((state) => state.setIsLoading)
  const setIsFetching = useSurveyEditorStore((state) => state.setIsFetching)
  useEffect(() => {
    setIsLoading(isLoading)
  }, [isLoading, setIsLoading])
  useEffect(() => {
    setIsFetching(isFetching)
  }, [isFetching, setIsFetching])

  return {
    loadSurvey,
    surveyId,
    isLoading,
    isFetching,
    isError,
    error,
    updateSurveyState,
    patchBuffer,
    patchBufferRef,
    bufferPatches,
    patchMutation,
    survey: surveyInstance,
  }
}
