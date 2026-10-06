import { useMutation } from '@tanstack/react-query'

import { useProjectDomain } from 'appAdmin/hook'

import { getImportExportApi } from '../registry'
import { useStartExportDownload } from './useStartExportDownload'

export function useProjectSettingsExport() {
  const project = useProjectDomain()
  const startExportDownload = useStartExportDownload()

  const mutation = useMutation({
    mutationFn: async () => {
      if (!project?._id) {
        throw new Error('Project not found')
      }

      const result = await getImportExportApi().exportEntity(
        'project',
        project._id,
        'vsps',
      )
      await startExportDownload(result)
    },
  })

  return {
    exportProjectSettings: mutation.mutateAsync,
    isExporting: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
