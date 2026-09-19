import { useQuery, useQueryClient } from '@tanstack/react-query'

import { getAuthParticipantApi } from 'appSurvey/registry'
import { KEY_STATE_SURVEY_AUTH } from 'appSurvey/common/keyState'
import { ErrorRest } from 'model'
import i18next from '../i18n'

export const ERROR_REG_REQUIRED = 'ERROR_REG_REQUIRED'
export const ERROR_INVALID_TOKEN = 'ERROR_INVALID_TOKEN'
export const ERROR_AUTH_FAIL = 'ERROR_AUTH_FAIL'
export const ERROR_SURVEY_NOT_STARTED = 'ERROR_SURVEY_NOT_STARTED'
export const ERROR_SURVEY_ENDED = 'ERROR_SURVEY_ENDED'

export type AuthData = {
  jwt?: string
  created?: Date
  expires?: Date
  reset?: boolean
  error?: ErrorRest
} | null

export function useSurveyAuth(
  surveyId?: string,
  token?: string,
  emailVerifyToken?: string,
) {
  const queryClient = useQueryClient()

  const queryKey = [KEY_STATE_SURVEY_AUTH, surveyId, token, emailVerifyToken]

  const {
    data: auth,
    isLoading,
    isError,
    error,
  } = useQuery<AuthData>(
    {
      queryKey,
      queryFn: async () => authenticate(surveyId, token, emailVerifyToken),
      staleTime: Infinity,
      gcTime: Infinity,
      enabled: !!surveyId,
      retry: false,
      retryOnMount: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    queryClient,
  )

  const authenticate = async (
    surveyId?: string,
    token?: string,
    emailVerifyToken?: string,
  ) => {
    if (!surveyId) {
      return {
        error: new ErrorRest({ userMessage: 'Survey ID is required' }),
      }
    }

    try {
      const authApi = getAuthParticipantApi()
      const response = await authApi.authenticate(
        surveyId,
        token,
        emailVerifyToken,
      )

      if (!response.jwt) {
        throw new ErrorRest({ message: 'Failed to obtain JWT' })
      }
      return {
        jwt: response.jwt,
        created: new Date(response.created),
        expires: new Date(response.expires),
        reset: response.reset,
      }
    } catch (err) {
      if (err instanceof ErrorRest) {
        throw err
      }
      const errWithMeta = err as { ref?: string; userMessage?: string } | null
      throw new ErrorRest({
        ref: errWithMeta?.ref,
        message: (err as Error)?.message,
        userMessage:
          errWithMeta?.userMessage ||
          i18next.t('error.authenticationFailed', { ns: 'app-survey' }),
      })
    }
  }

  return {
    jwt: auth?.jwt,
    created: auth?.created,
    expires: auth?.expires,
    reset: auth?.reset,
    error: error
      ? new ErrorRest({
          ref: (error as ErrorRest).ref,
          message: error.message,
          userMessage: (error as ErrorRest).userMessage,
        })
      : null,
    isLoading,
    isError,
  }
}
