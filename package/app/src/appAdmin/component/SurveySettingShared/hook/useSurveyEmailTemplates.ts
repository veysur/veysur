import { useMemo, useCallback } from 'react'
import { EmailTemplate, PatchBuffer } from 'veysur-common'

import { useEmailTemplatePatchableState } from './useEmailTemplatePatchableState'
import { useEmailTemplateEditorStore } from './useEmailTemplateEditorStore'

/**
 * Email template management using independent patchable state
 *
 * Email templates manage their own lifecycle independently from survey data,
 * providing clean separation of concerns and eliminating synchronization complexity.
 *
 * Makes a single API call to fetch both survey templates and project defaults.
 *
 * Returns:
 * - templateCollection: Survey-specific template overrides (patchable)
 * - projectTemplates: Project-level defaults (read-only)
 * - getEffectiveTemplate: Helper to get effective template (override or default)
 * - bufferPatches: Function to buffer template patches for persistence
 */
export function useSurveyEmailTemplates(surveyId: string | undefined) {
  // Stable callback to sync patch buffer to store for navigation blocking
  const handlePatchBufferChange = useCallback((buffer: PatchBuffer) => {
    const setPatchBuffer = useEmailTemplateEditorStore.getState().setPatchBuffer
    setPatchBuffer?.(buffer)
  }, [])

  // Get survey-specific templates (patchable), project defaults, and system defaults (read-only)
  // from a single API call
  const {
    data: templateCollection,
    projectTemplates,
    systemTemplates,
    projectDefaultLang,
    isLoading: isLoadingTemplates,
    isFetching: isFetchingTemplates,
    isError: isErrorTemplates,
    error: errorTemplates,
    bufferPatches,
  } = useEmailTemplatePatchableState({
    surveyId,
    onPatchBufferChange: handlePatchBufferChange,
  })

  // Helper to get effective template (survey override OR project default)
  const getEffectiveTemplate = useMemo(
    () =>
      (type: string, lang: string): EmailTemplate | null => {
        // First try survey-specific override
        const surveyTemplate = templateCollection?.get(type, lang)
        if (surveyTemplate) return surveyTemplate

        // Fall back to project default
        const projectTemplate = projectTemplates?.getByKey(`${type}-${lang}`)
        return projectTemplate ?? null
      },
    [templateCollection, projectTemplates],
  )

  return {
    // Survey-specific templates
    templateCollection,

    // Project defaults
    projectTemplates,

    // System defaults
    systemTemplates,

    // Project default language
    projectDefaultLang,

    // Helper to get effective template
    getEffectiveTemplate,

    // Operations
    bufferPatches,

    // Loading states (single API call, so no need to combine states)
    isLoading: isLoadingTemplates,
    isFetching: isFetchingTemplates,
    isError: isErrorTemplates,
    error: errorTemplates,
  }
}
