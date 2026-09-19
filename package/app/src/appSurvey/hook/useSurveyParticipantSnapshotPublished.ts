import { useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Survey, SettingSurvey } from 'veysur-common'
import { PropsOf } from 'mzen-schema'

import { KEY_STATE_SURVEY_SNAPSHOT_PUBLISHED } from 'appSurvey/common'
import { getSurveyParticipantSnapshotApi } from 'appSurvey/registry'
import { decodeJwtPayload } from 'common'

export function useSurveyParticipantSnapshotPublished(
  surveyId?: string,
  jwt?: string,
  lang?: string,
) {
  const queryClient = useQueryClient()

  // Use ref to track if query has been enabled in this mount lifecycle
  // This prevents enabled flag toggling from causing multiple fetches
  // but allows fresh fetches on new mounts (e.g., page refresh)
  const hasBeenEnabledRef = useRef(false)
  const lastFetchedKeyRef = useRef<string | undefined>(undefined)
  const cachedDataRef = useRef<{
    survey: PropsOf<Survey> | undefined
    settingSurvey: PropsOf<SettingSurvey> | undefined
  }>({ survey: undefined, settingSurvey: undefined })

  // Cache-key on the snapshot the JWT actually resolves to (rather than just
  // surveyId/lang) so that a resumed/reset JWT — which can point at a
  // different snapshot without surveyId or lang changing — always triggers
  // a refetch instead of silently serving a previously cached snapshot.
  const snapshotId = jwt
    ? (decodeJwtPayload<{ snapshotId?: string }>(jwt)?.snapshotId ?? jwt)
    : undefined

  const shouldEnable = !!surveyId && !!jwt
  /* eslint-disable react-hooks/refs --
   * Intentional render-time ref mutation: this is a monotonic, idempotent
   * latch (once true it never resets), so re-running this on a re-render
   * or a StrictMode double-invoke is a no-op. Converting to
   * useState+useEffect would delay `queryEnabled` becoming true by one
   * extra render, deferring the initial survey fetch. Disabled for the
   * whole block below since the tainted value flows into useQuery's config.
   */
  if (shouldEnable && !hasBeenEnabledRef.current) {
    hasBeenEnabledRef.current = true
  }
  const queryEnabled = shouldEnable && hasBeenEnabledRef.current

  const { data, isError, isLoading, isFetching, error } = useQuery<{
    survey: PropsOf<Survey> | undefined
    settingSurvey: PropsOf<SettingSurvey> | undefined
  }>(
    {
      enabled: queryEnabled,
      queryKey: [
        KEY_STATE_SURVEY_SNAPSHOT_PUBLISHED,
        surveyId,
        lang,
        snapshotId,
      ],
      staleTime: 0,
      gcTime: Infinity,
      retry: false,
      queryFn: async () => {
        if (!surveyId || !jwt) {
          return Promise.reject(
            'Survey ID and authentication token are required',
          )
        }

        const fetchKey = `${surveyId}:${lang ?? ''}:${snapshotId ?? ''}`
        if (lastFetchedKeyRef.current === fetchKey) {
          return cachedDataRef.current
        }
        lastFetchedKeyRef.current = fetchKey

        const response =
          await getSurveyParticipantSnapshotApi().getSurveySnapshot(
            surveyId,
            jwt,
            lang,
          )

        const result = {
          survey: response.snapshotData?.survey,
          settingSurvey: response.settingSurveyData,
        }
        cachedDataRef.current = result
        return result
      },
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    queryClient,
  )
  /* eslint-enable react-hooks/refs */

  return {
    surveyId,
    survey: data?.survey ? new Survey(data.survey) : undefined,
    settingSurvey: data?.settingSurvey
      ? new SettingSurvey(data.settingSurvey)
      : undefined,
    loading: isLoading,
    error: isError
      ? (error as Error)?.message || 'Failed to load survey'
      : null,
    isLoading,
    isFetching,
    isError,
  }
}
