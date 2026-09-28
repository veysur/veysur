import { useMutation } from '@tanstack/react-query'

import { useProjectDomain } from 'appAdmin/hook'
import { getImportExportApi } from 'appAdmin/component/ImportExport/registry'
import { useStartExportDownload } from 'appAdmin/component/ImportExport/hook/useStartExportDownload'

export function useExportSurveyResponseCsv() {
  const project = useProjectDomain()
  const startExportDownload = useStartExportDownload()

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
      const result = await api.exportEntity(
        'surveyResponse',
        surveyId,
        'csv',
        options,
      )
      await startExportDownload(result)
    },
  })

  return {
    exportResponses: mutation.mutateAsync,
    isExporting: mutation.isPending,
    exportError: mutation.error?.message ?? null,
  }
}
