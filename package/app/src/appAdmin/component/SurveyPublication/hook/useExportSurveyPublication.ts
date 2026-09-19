import { useMutation } from '@tanstack/react-query'

import { useProjectDomain } from 'appAdmin/hook'
import { getImportExportApi } from 'appAdmin/component/ImportExport/registry'

export function useExportSurveyPublication() {
  const project = useProjectDomain()

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
      const { downloadUrl } = await api.exportEntity(
        'surveyPublication',
        surveyId,
        'vssp',
        { publicationId },
      )

      window.open(downloadUrl, '_blank')
    },
  })

  return {
    exportPublication: mutation.mutateAsync,
    isExporting: mutation.isPending,
    exportError: mutation.error?.message ?? null,
  }
}
