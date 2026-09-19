import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { EmailTemplate } from 'veysur-common'

import { useSettingSurveyOperations } from './useSettingSurveyOperations'

interface UseSurveySettingsSaveOperationsProps {
  save: () => Promise<void>
  cancel: () => void
  isDirty: boolean
  dirtyTemplates: Set<string>
  deletedTemplates: Set<string>
  emailTemplates: Map<string, EmailTemplate>
  operations: ReturnType<typeof useSettingSurveyOperations>['operations']
  revertEmailTemplates: () => void
  clearDirtyState: () => void
}

export const useSurveySettingsSaveOperations = ({
  save,
  cancel,
  isDirty,
  dirtyTemplates,
  deletedTemplates,
  emailTemplates,
  operations,
  revertEmailTemplates,
  clearDirtyState,
}: UseSurveySettingsSaveOperationsProps) => {
  const queryClient = useQueryClient()

  // Save wrapper that handles both settings and email templates
  const handleSave = useCallback(async () => {
    // Save settings first
    await save()

    // Save all dirty and deleted email templates in a single batch request
    if ((dirtyTemplates.size > 0 || deletedTemplates.size > 0) && operations) {
      // Collect update patches
      const updatePatches = Array.from(dirtyTemplates)
        .map((key) => {
          const template = emailTemplates.get(key)
          if (template) {
            return {
              type: 'emailTemplate' as const,
              action: 'update' as const,
              data: {
                type: template.type,
                lang: template.lang,
                subject: template.subject || '',
                body: template.body || '',
              },
            }
          }
          return null
        })
        .filter((p) => p !== null)

      // Collect deletion patches (to revert to system defaults)
      const deletionPatches = Array.from(deletedTemplates)
        .map((key) => {
          const [type, lang] = key.split('-')
          return {
            type: 'emailTemplate' as const,
            action: 'update' as const,
            data: {
              type,
              lang,
              subject: null,
              body: null,
            },
          }
        })
        .filter((p) => p !== null)

      const patches = [...updatePatches, ...deletionPatches]

      // Send all patches in a single API call
      if (patches.length > 0) {
        const { ProjectEmailTemplateApi } =
          await import('appAdmin/component/SurveySettingShared')
        const { getRestClient } = await import('registry')
        const api = new ProjectEmailTemplateApi(getRestClient())
        await api.patch(patches)

        // Invalidate email templates cache to ensure survey-specific
        // template editors see the updated project defaults immediately
        // Note: Survey email templates are fetched with project defaults in a single API call
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ['surveyEmailTemplates'],
            exact: false,
          }),
          // Also invalidate project email templates to refresh the UI
          queryClient.invalidateQueries({
            queryKey: ['projectEmailTemplates'],
          }),
        ])

        // Clear dirty state after successful save
        clearDirtyState()
      }
    }
  }, [
    save,
    dirtyTemplates,
    deletedTemplates,
    emailTemplates,
    operations,
    queryClient,
    clearDirtyState,
  ])

  // Cancel wrapper that reverts both settings and email templates
  const handleCancel = useCallback(() => {
    // Cancel settings changes
    cancel()

    // Revert email template changes
    revertEmailTemplates()
  }, [cancel, revertEmailTemplates])

  // Combined dirty state (settings + templates + deletions)
  const isAnythingDirty =
    isDirty || dirtyTemplates.size > 0 || deletedTemplates.size > 0

  return {
    handleSave,
    handleCancel,
    isAnythingDirty,
  }
}
