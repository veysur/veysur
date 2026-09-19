import { useMutation } from '@tanstack/react-query'

import { useProjectDomain } from 'appAdmin/hook'
import { downloadFile } from 'common'

import { getSurveyParticipantApi } from '../registry'

export function useSurveyParticipantExport(surveyId: string) {
  const project = useProjectDomain()

  const mutation = useMutation({
    mutationFn: async (ids?: string[]) => {
      if (!project?._id || !surveyId) {
        throw new Error('Project or survey not found')
      }

      const { url, headers } = getSurveyParticipantApi().getExportUrl(
        surveyId,
        ids,
      )
      await downloadFile(url, headers)
    },
  })

  return {
    exportParticipants: mutation.mutateAsync,
    isExporting: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
