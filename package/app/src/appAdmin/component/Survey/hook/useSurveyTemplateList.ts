import { useQueryClient } from '@tanstack/react-query'
import { useAuthdQuery } from 'hook/useAuthdQuery'

import { KEY_STATE_SURVEY_TEMPLATE_LIST } from 'appAdmin/common'
import { useProjectDomain } from 'appAdmin/hook'

import { SurveyTemplateSummary } from '../model'
import { getSurveyApi } from '../registry'

const TEMPLATE_STALE_MS = 60 * 60 * 1000

export function useSurveyTemplateList() {
  const queryClient = useQueryClient()
  const project = useProjectDomain()

  const { data, isLoading, error } = useAuthdQuery<
    SurveyTemplateSummary[] | undefined
  >(
    {
      enabled: !!project?._id,
      queryKey: [KEY_STATE_SURVEY_TEMPLATE_LIST],
      queryFn: async () => {
        if (!project?._id) return
        return getSurveyApi().getTemplates()
      },
      staleTime: TEMPLATE_STALE_MS,
    },
    queryClient,
  )

  return {
    templates: data ?? [],
    isLoading,
    error: error instanceof Error ? error.message : null,
  }
}
