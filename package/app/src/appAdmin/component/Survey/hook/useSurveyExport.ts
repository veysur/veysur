import { useMutation } from '@tanstack/react-query'

import { useProjectDomain } from 'appAdmin/hook'
import { getImportExportApi } from 'appAdmin/component/ImportExport/registry'

export function useSurveyExport() {
  const project = useProjectDomain()

  const mutation = useMutation({
    mutationFn: async (surveyId: string) => {
      if (!project?._id) {
        throw new Error('Project not found')
      }

      const api = getImportExportApi()
      const { downloadUrl } = await api.exportEntity('survey', surveyId, 'vsst')

      // Open presigned URL in blank page to trigger download
      window.open(downloadUrl, '_blank')
    },
  })

  return {
    exportSurvey: mutation.mutateAsync,
    isExporting: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
