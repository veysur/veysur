import { useQuery, useQueryClient } from '@tanstack/react-query'

import { KEY_STATE_SURVEY_RESPONSE } from 'appSurvey/common'
import { getSurveyParticipantResponseApi } from 'appSurvey/registry'
import type { SurveyAnswers } from 'component/Survey/SurveyTypes'
import { ErrorRest } from 'model'
import i18next from '../i18n'

export interface SurveyParticipantResponse {
  answers: SurveyAnswers
  randomSeeds?: Record<string, number>
  completed?: boolean
  completedAt?: Date | null
}

// Unlike useSurveyResponsePersistence (which errors on an already-completed
// response to redirect the in-progress survey flow), this hook is for
// read-only views of a completed response, e.g. the print-my-answers page.
// It shares the same query key/cache so a response saved via
// useSurveyResponsePersistence is picked up immediately.
export function useSurveyParticipantResponse(
  surveyId?: string,
  authToken?: string,
) {
  const queryClient = useQueryClient()

  const { data, isLoading, isError, error } =
    useQuery<SurveyParticipantResponse | null>(
      {
        queryKey: [KEY_STATE_SURVEY_RESPONSE, surveyId],
        queryFn: async () => {
          if (!surveyId || !authToken) {
            return null
          }
          try {
            const api = getSurveyParticipantResponseApi()
            const restResponse = await api.getResponse(surveyId, authToken)
            return restResponse?.response || null
          } catch (err) {
            const userMessage =
              err instanceof ErrorRest
                ? err.userMessage ||
                  i18next.t('error.loadAnswersFailed', { ns: 'app-survey' })
                : i18next.t('error.loadAnswersFailed', { ns: 'app-survey' })
            throw new ErrorRest({ userMessage })
          }
        },
        enabled: !!surveyId && !!authToken,
        staleTime: 0,
        gcTime: Infinity,
        retry: false,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      queryClient,
    )

  return {
    response: data,
    isLoading,
    isError,
    error: isError
      ? (error as ErrorRest)?.userMessage ||
        i18next.t('error.loadAnswersFailed', { ns: 'app-survey' })
      : null,
  }
}
