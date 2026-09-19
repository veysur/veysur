import { useMutation } from '@tanstack/react-query'

import { useProjectDomain } from 'appAdmin/hook'
import { getImportExportApi } from 'appAdmin/component/ImportExport/registry'

export function useExportSurveyResponse() {
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
        'surveyResponse',
        surveyId,
        'json',
        { publicationId },
      )

      window.open(downloadUrl, '_blank')
    },
  })

  return {
    exportResponses: mutation.mutateAsync,
    isExporting: mutation.isPending,
    exportError: mutation.error?.message ?? null,
  }
}
