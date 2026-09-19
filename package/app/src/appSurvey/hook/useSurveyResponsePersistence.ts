import { useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { KEY_STATE_SURVEY_RESPONSE } from 'appSurvey/common'
import { getSurveyParticipantResponseApi } from 'appSurvey/registry'
import type { SurveyAnswers } from 'component/Survey/SurveyTypes'
import { ErrorRest } from 'model'
import i18next from '../i18n'

export const ERROR_SURVEY_COMPLETED = 'SURVEY_COMPLETED'

export interface UseSurveyResponsePersistenceProps {
  surveyId?: string
  authToken?: string
  enabled: boolean
}

export interface LoadedResponse {
  answers: SurveyAnswers
  randomSeeds?: Record<string, number>
  completed?: boolean
  completedAt?: Date | null
}

const getSurveyResponseQueryKey = (surveyId?: string) => [
  KEY_STATE_SURVEY_RESPONSE,
  surveyId,
]

export function useSurveyResponsePersistence({
  surveyId,
  authToken,
  enabled,
}: UseSurveyResponsePersistenceProps) {
  const queryClient = useQueryClient()
  const saveQueueRef = useRef<SurveyAnswers | null>(null)
  // Use ref for synchronous state tracking to prevent race conditions when queuing saves.
  // saveMutation.isPending updates asynchronously and could allow duplicate mutations.
  const isSavingRef = useRef(false)

  // Track if we've completed the survey in this session
  // Used to prevent showing "already completed" error right after user completes survey
  const completedInSessionRef = useRef(false)

  // Use ref to track if query has been enabled in this mount lifecycle
  // This prevents enabled flag toggling from causing multiple fetches
  // but allows fresh fetches on new mounts (e.g., page refresh)
  const hasBeenEnabledRef = useRef(false)
  const hasFetchedRef = useRef(false)
  const cachedResponseRef = useRef<LoadedResponse | null>(null)

  const shouldEnable = enabled && !!surveyId && !!authToken
  if (shouldEnable && !hasBeenEnabledRef.current) {
    hasBeenEnabledRef.current = true
  }
  const queryEnabled = shouldEnable && hasBeenEnabledRef.current

  const {
    data: loadedResponse,
    isLoading,
    error: loadError,
  } = useQuery<LoadedResponse | null, ErrorRest>({
    queryKey: getSurveyResponseQueryKey(surveyId),
    staleTime: 0,
    gcTime: Infinity,
    retry: false,
    queryFn: async (): Promise<LoadedResponse | null> => {
      if (!surveyId || !authToken) {
        return null
      }

      // Only fetch once per mount lifecycle to prevent duplicate requests
      if (hasFetchedRef.current) {
        return cachedResponseRef.current
      }
      hasFetchedRef.current = true

      try {
        const api = getSurveyParticipantResponseApi()
        const restResponse = await api.getResponse(surveyId, authToken)
        const response = restResponse?.response || null

        // Check if survey is already completed
        // Only throw error if NOT completed in this session
        // (to allow thank you screen)
        if (response?.completed && !completedInSessionRef.current) {
          throw new ErrorRest({
            ref: ERROR_SURVEY_COMPLETED,
            userMessage: i18next.t('error.surveyCompleted', {
              ns: 'app-survey',
            }),
          })
        }

        cachedResponseRef.current = response
        return response
      } catch (error) {
        if (error instanceof ErrorRest) {
          throw error
        }
        const errorMessage =
          error instanceof ErrorRest
            ? error.userMessage ||
              i18next.t('error.loadAnswersFailed', { ns: 'app-survey' })
            : i18next.t('error.loadAnswersFailed', { ns: 'app-survey' })
        throw new ErrorRest({ userMessage: errorMessage })
      }
    },
    enabled: queryEnabled,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const response = loadedResponse?.answers || {}
  const isCompleted = !!loadedResponse?.completed

  const saveMutation = useMutation<
    void,
    Error,
    {
      surveyId: string
      answers: SurveyAnswers
      randomSeeds?: Record<string, number>
      authToken: string
      completedAt?: boolean
      language?: string
    }
  >({
    mutationFn: async ({
      surveyId,
      answers,
      randomSeeds,
      authToken,
      completedAt,
      language,
    }) => {
      try {
        const api = getSurveyParticipantResponseApi()
        await api.saveResponse(
          surveyId,
          { answers, randomSeeds, completedAt, language },
          authToken,
        )
      } catch (error) {
        const errorMessage =
          error instanceof ErrorRest
            ? error.userMessage ||
              i18next.t('error.saveAnswersFailed', { ns: 'app-survey' })
            : i18next.t('error.saveAnswersFailed', { ns: 'app-survey' })
        throw new Error(errorMessage, { cause: error })
      }
    },
    onSuccess: async (_, variables) => {
      if (saveQueueRef.current) {
        const queuedAnswers = saveQueueRef.current
        saveQueueRef.current = null
        isSavingRef.current = false
        await saveResponse(queuedAnswers)
      } else {
        isSavingRef.current = false
      }

      if (variables.completedAt) {
        completedInSessionRef.current = true
      }

      const updatedResponse: LoadedResponse = {
        answers: variables.answers,
        randomSeeds: variables.randomSeeds,
        completed: !!variables.completedAt,
        completedAt: variables.completedAt ? new Date() : null,
      }

      queryClient.setQueryData(
        getSurveyResponseQueryKey(variables.surveyId),
        updatedResponse,
      )
    },
    onError: (error) => {
      isSavingRef.current = false
      console.error('Failed to save survey response:', error)
    },
  })

  const saveResponse = useCallback(
    async (
      answers: SurveyAnswers,
      completedAt?: boolean,
      randomSeeds?: Record<string, number>,
      language?: string,
    ) => {
      if (!surveyId || !enabled || !authToken) {
        return
      }

      if (isSavingRef.current) {
        saveQueueRef.current = answers
        return
      }

      isSavingRef.current = true
      await saveMutation.mutateAsync({
        surveyId,
        answers,
        randomSeeds,
        authToken,
        completedAt,
        language,
      })
    },
    [surveyId, enabled, authToken, saveMutation],
  )

  const clearSaveError = useCallback(() => {
    saveMutation.reset()
  }, [saveMutation])

  const clearLoadError = useCallback(() => {
    queryClient.resetQueries({
      queryKey: getSurveyResponseQueryKey(surveyId),
    })
  }, [queryClient, surveyId])

  return {
    saveResponse,
    response,
    loadedResponse,
    isCompleted,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error?.message || null,
    clearSaveError,
    isLoading,
    loadError,
    clearLoadError,
  }
}
