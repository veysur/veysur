import { useMutation } from '@tanstack/react-query'

import { useProjectDomain } from 'appAdmin/hook'
import { getImportExportApi } from 'appAdmin/component/ImportExport/registry'

export function useSurveyFullExport() {
  const project = useProjectDomain()

  const mutation = useMutation({
    mutationFn: async (surveyId: string) => {
      if (!project?._id) {
        throw new Error('Project not found')
      }

      const api = getImportExportApi()
      const { downloadUrl } = await api.exportEntity(
        'surveyFull',
        surveyId,
        'vssa',
      )

      window.open(downloadUrl, '_blank')
    },
  })

  return {
    exportSurveyFull: mutation.mutateAsync,
    isExportingFull: mutation.isPending,
    exportFullError: mutation.error?.message ?? null,
  }
}
