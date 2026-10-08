import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SettingSurvey, Survey } from 'veysur-common'

import {
  KEY_STATE_SURVEY_EMBED_ARTEFACT,
  KEY_STATE_SURVEY_EMBED_POINTER,
} from 'appSurvey/common/keyState'

import { embedArtefactUrl, embedPointerUrl } from './embedPaths'
import { pickEmbedLanguage } from './pickEmbedLanguage'
import type { SurveyEmbedArtefact, SurveyEmbedPointer } from './types'

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }
  return response.json()
}

// Unauthenticated: reads the static files written at publish time, so a
// passive page view makes no API call.
export function useSurveyEmbed(
  projectId: string,
  surveyId: string,
  requestedLanguage?: string,
) {
  const pointerQuery = useQuery({
    queryKey: [KEY_STATE_SURVEY_EMBED_POINTER, projectId, surveyId],
    queryFn: () =>
      fetchJson<SurveyEmbedPointer>(embedPointerUrl(projectId, surveyId)),
    retry: false,
    refetchOnWindowFocus: false,
  })
  const pointer = pointerQuery.data

  const language = pointer
    ? pickEmbedLanguage(
        requestedLanguage,
        navigator.languages ?? [],
        pointer.languages,
        pointer.defaultLanguage,
      )
    : undefined

  const artefactQuery = useQuery({
    queryKey: [
      KEY_STATE_SURVEY_EMBED_ARTEFACT,
      surveyId,
      pointer?.snapshotId,
      language,
    ],
    queryFn: () => {
      if (!pointer || !language) {
        return Promise.reject(new Error('Embed pointer not loaded'))
      }
      return fetchJson<SurveyEmbedArtefact>(
        embedArtefactUrl(projectId, surveyId, pointer.snapshotId, language),
      )
    },
    enabled: !!pointer && !!language,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  })
  const surveyData = artefactQuery.data?.snapshotData.survey

  const survey = useMemo(() => {
    if (!surveyData || !pointer) {
      return undefined
    }
    // The artefact is immutable, so branding entitlement is applied from the
    // pointer, which reflects the project's current plan.
    return new Survey(
      pointer.noBrandAvailable || !surveyData.presentation?.noBrand
        ? surveyData
        : {
            ...surveyData,
            presentation: { ...surveyData.presentation, noBrand: false },
          },
    )
  }, [surveyData, pointer])

  const settingSurvey = useMemo(
    () =>
      pointer?.settingSurveyData
        ? new SettingSurvey(pointer.settingSurveyData)
        : undefined,
    [pointer],
  )

  return {
    pointer,
    language,
    survey,
    settingSurvey,
    isLoading: pointerQuery.isLoading || artefactQuery.isLoading,
    isError: pointerQuery.isError || artefactQuery.isError,
  }
}
