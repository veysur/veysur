import { useMutation } from '@tanstack/react-query'

import { useProjectDomain } from 'appAdmin/hook'
import { getImportExportApi } from 'appAdmin/component/ImportExport/registry'
import { useStartExportDownload } from 'appAdmin/component/ImportExport/hook/useStartExportDownload'

export function useSurveyExport() {
  const project = useProjectDomain()
  const startExportDownload = useStartExportDownload()

  const mutation = useMutation({
    mutationFn: async (surveyId: string) => {
      if (!project?._id) {
        throw new Error('Project not found')
      }

      const api = getImportExportApi()
      const result = await api.exportEntity('survey', surveyId, 'vsst')
      await startExportDownload(result)
    },
  })

  return {
    exportSurvey: mutation.mutateAsync,
    isExporting: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
