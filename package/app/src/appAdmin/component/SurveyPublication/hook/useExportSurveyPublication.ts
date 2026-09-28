import { useMutation } from '@tanstack/react-query'

import { useProjectDomain } from 'appAdmin/hook'
import { getImportExportApi } from 'appAdmin/component/ImportExport/registry'
import { useStartExportDownload } from 'appAdmin/component/ImportExport/hook/useStartExportDownload'

export function useExportSurveyPublication() {
  const project = useProjectDomain()
  const startExportDownload = useStartExportDownload()

  const mutation = useMutation({
    mutationFn: async ({
      surveyId,
      publicationId,
    }: {
      surveyId: string
      publicationId: string
    }) => {
      if (!project?._id) {
        throw new Error('Project not found')
      }

      const api = getImportExportApi()
      const result = await api.exportEntity(
        'surveyPublication',
        surveyId,
        'vssp',
        { publicationId },
      )
      await startExportDownload(result)
    },
  })

  return {
    exportPublication: mutation.mutateAsync,
    isExporting: mutation.isPending,
    exportError: mutation.error?.message ?? null,
  }
}
