import { useQueryClient } from '@tanstack/react-query'
import { Survey, PatchApplierSurvey, Patch, PatchBuffer } from 'veysur-common'

import {
  KEY_STATE_SURVEY_EDITING,
  KEY_STATE_PUBLICATION_HAS_CHANGES,
} from 'appAdmin/common'
import { useAuth, useProjectDomain } from 'appAdmin/hook'
import { getSurveyApi } from 'appAdmin/component/Survey'
import { usePatchableState } from 'hook'
import { useSurveyEditorStore } from './useSurveyEditorStore'

import { useSurveyEditorRefetchInterval } from './useSurveyEditorRefetchInterval'
import { preApiRequestAuthCheck } from './preApiRequestAuthCheck'

type SurveyPatch = Patch

// Matches REFETCH_INTERVAL_ACTIVE in useSurveyEditorRefetchInterval — data fetched
// within this window is treated as fresh, avoiding a redundant network round trip
// when re-entering the survey editor route tree.
const STALE_TIME_MS = 20 * 1000

type Props = {
  surveyId?: string
  onPatchBufferChange?: (buffer: PatchBuffer) => void
}

/**
 * Survey-specific adapter for usePatchableState hook
 *
 * Provides patchable state management for Survey entities with:
 * - Automatic data fetching from survey API
 * - Patch buffering and persistence
 * - Optimistic updates
 * - Automatic retry logic
 * - Related query invalidation
 *
 * @example
 * ```typescript
 * const { data: survey, bufferPatches, patchBuffer } = useSurveyPatchableState({ surveyId })
 * ```
 */
export function useSurveyPatchableState({
  surveyId,
  onPatchBufferChange,
}: Props) {
  const { refetchInterval } = useSurveyEditorRefetchInterval()
  const queryClient = useQueryClient()
  const { auth } = useAuth()
  const project = useProjectDomain()
  const langFetch = useSurveyEditorStore((state) => state.langFetch)
  const langDefault = useSurveyEditorStore((state) => state.langDefault)

  return usePatchableState<Survey, SurveyPatch>({
    queryKey: [KEY_STATE_SURVEY_EDITING, surveyId, langFetch, langDefault],
    entityId: surveyId,

    // Fetch survey data from API
    fetchFn: async () => {
      const promiseReject = preApiRequestAuthCheck(auth)
      if (promiseReject) return promiseReject
      if (!project?._id || !surveyId) {
        return Promise.reject('Invalid project or survey ID')
      }
      const survey = await getSurveyApi().getOne(surveyId, {
        lang: langFetch || undefined,
        defaultLang: langDefault || undefined,
      })
      return new Survey(survey)
    },

    // Apply patches to survey data
    applyPatchesFn: (patches, data) => {
      const survey = data instanceof Survey ? data : new Survey(data)
      return PatchApplierSurvey.applyPatches(patches, survey)
    },

    // Persist patches to server
    persistPatchesFn: async (patches) => {
      const promiseReject = preApiRequestAuthCheck(auth)
      if (promiseReject) return promiseReject
      if (!project?._id || !surveyId) {
        return Promise.reject('Invalid project or survey ID')
      }
      await getSurveyApi().patch(surveyId, patches)
    },

    // Configuration
    enabled: !!project?._id && !!surveyId,
    refetchInterval,
    refetchOnMount: true,
    staleTime: STALE_TIME_MS,
    refetchOnWindowFocus: true,
    debounceMs: 2000,

    // Callbacks
    onPatchBufferChange,
    onPersistSuccess: async () => {
      // Invalidate comparison cache when survey is modified
      // This ensures the publish modal shows updated comparison results
      await queryClient.invalidateQueries({
        queryKey: ['surveySnapshot', 'compare', surveyId],
      })
      // Invalidate the "has unpublished changes" badge/button so it re-checks
      // content against the published snapshot after every autosave - fixes
      // it staying stuck "changed" after a reorder that nets out to a no-op.
      await queryClient.invalidateQueries({
        queryKey: [KEY_STATE_PUBLICATION_HAS_CHANGES, surveyId],
      })
    },
  })
}
