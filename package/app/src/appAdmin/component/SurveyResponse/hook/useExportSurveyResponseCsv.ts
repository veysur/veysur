import { useMutation } from '@tanstack/react-query'

import { useProjectDomain } from 'appAdmin/hook'
import { getImportExportApi } from 'appAdmin/component/ImportExport/registry'

export function useExportSurveyResponseCsv() {
  const project = useProjectDomain()

  const mutation = useMutation({
    mutationFn: async ({
      surveyId,
      publicationId,
      snapshotId,
      mergedFilter,
    }: {
      surveyId: string
      publicationId: string
      snapshotId: string
      mergedFilter?: 'all' | 'merged' | 'notMerged'
    }) => {
      if (!project?._id) {
        throw new Error('Project not found')
      }

      const api = getImportExportApi()
      const options: Record<string, string> = { publicationId, snapshotId }
      if (mergedFilter && mergedFilter !== 'all') {
        options.merged = mergedFilter
      }
      const { downloadUrl } = await api.exportEntity(
        'surveyResponse',
        surveyId,
        'csv',
        options,
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
