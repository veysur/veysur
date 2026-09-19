import { useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { useSurveyEditorStore } from './useSurveyEditorStore'

/**
 * UI preferences for the Survey Editor
 * These are persisted to localStorage and synced with Zustand
 */
export interface SurveyEditorUiPrefs {
  /** Whether to show question details in the structure panel */
  showQuestionDetails: boolean
  /** Currently selected language for editing */
  langEditing: string
  /** Set of collapsed group IDs in the structure panel */
  collapsedGroups: string[]
}

/**
 * Default UI preferences
 */
const getDefaultPrefs = (): SurveyEditorUiPrefs => ({
  showQuestionDetails: false,
  langEditing: '',
  collapsedGroups: [],
})

/**
 * Hook to manage Survey Editor UI preferences with persistence
 *
 * This hook:
 * - Loads persisted preferences from localStorage (via react-query)
 * - Syncs them to Zustand store on mount
 * - Saves Zustand changes back to react-query for persistence
 *
 * Usage: Call once in the SurveyEditor parent component
 * Access preferences anywhere via useSurveyEditorStore
 *
 * @param surveyId - Survey ID to scope preferences to
 */
export function useSurveyEditorUiPref(surveyId?: string) {
  const queryClient = useQueryClient()
  const setUiPrefs = useSurveyEditorStore((s) => s.setUiPrefs)
  const setLangEditing = useSurveyEditorStore((s) => s.setLangEditing)
  const setLangFetch = useSurveyEditorStore((s) => s.setLangFetch)

  const queryKey = useMemo(
    () => ['uiPrefs', 'surveyEditor', surveyId || 'global'],
    [surveyId],
  )

  const { data: persisted } = useQuery<SurveyEditorUiPrefs>({
    queryKey,
    queryFn: () => getDefaultPrefs(),
    initialData: getDefaultPrefs(),
    staleTime: Infinity, // Never refetch - this is local state only
    gcTime: 1000 * 60 * 60 * 24 * 90, // 90 days
    meta: {
      persistence: {
        enabled: true,
        storageType: 'local',
      },
    },
  })

  // Sync persisted preferences to Zustand on mount or survey change
  useEffect(() => {
    if (persisted) {
      setUiPrefs({
        showQuestionDetails: persisted.showQuestionDetails,
        collapsedGroups: new Set(persisted.collapsedGroups),
      })
      // Always restore langEditing, even if empty string
      // This ensures the persisted value takes precedence over survey defaults
      setLangEditing(persisted.langEditing)
      setLangFetch(persisted.langEditing)
    }
  }, [surveyId, persisted, setUiPrefs, setLangEditing, setLangFetch])

  // Subscribe to Zustand changes and save to react-query
  useEffect(() => {
    const unsubscribe = useSurveyEditorStore.subscribe((state) => {
      const prefs: SurveyEditorUiPrefs = {
        showQuestionDetails: state.uiPrefs.showQuestionDetails,
        langEditing: state.langEditing,
        collapsedGroups: Array.from(state.uiPrefs.collapsedGroups),
      }
      queryClient.setQueryData(queryKey, prefs)
    })
    return unsubscribe
  }, [queryKey, queryClient])

  return {
    isReady: !!persisted,
  }
}
