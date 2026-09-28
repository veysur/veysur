import { useMutation } from '@tanstack/react-query'

import { useProjectDomain } from 'appAdmin/hook'
import { getImportExportApi } from 'appAdmin/component/ImportExport/registry'
import { useStartExportDownload } from 'appAdmin/component/ImportExport/hook/useStartExportDownload'

export function useSurveyFullExport() {
  const project = useProjectDomain()
  const startExportDownload = useStartExportDownload()

  const mutation = useMutation({
    mutationFn: async (surveyId: string) => {
      if (!project?._id) {
        throw new Error('Project not found')
      }

      const api = getImportExportApi()
      const result = await api.exportEntity('surveyFull', surveyId, 'vssa')
      await startExportDownload(result)
    },
  })

  return {
    exportSurveyFull: mutation.mutateAsync,
    isExportingFull: mutation.isPending,
    exportFullError: mutation.error?.message ?? null,
  }
}
