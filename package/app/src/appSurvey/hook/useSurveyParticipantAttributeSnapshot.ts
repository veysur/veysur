import { useQuery, useQueryClient } from '@tanstack/react-query'

import { KEY_STATE_SURVEY_PARTICIPANT_ATTRIBUTE_SNAPSHOT } from 'appSurvey/common'
import { getSurveyParticipantAttributeSnapshotApi } from 'appSurvey/registry'
import { ParticipantAttributeDefinition } from 'appSurvey/api/SurveyParticipantAttributeSnapshotApi'

export function useSurveyParticipantAttributeSnapshot(
  surveyId: string,
  lang?: string,
) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery(
    {
      enabled: !!surveyId,
      queryKey: [
        KEY_STATE_SURVEY_PARTICIPANT_ATTRIBUTE_SNAPSHOT,
        surveyId,
        lang,
      ],
      queryFn: async () => {
        return getSurveyParticipantAttributeSnapshotApi().get(surveyId, lang)
      },
    },
    queryClient,
  )

  const attributes: ParticipantAttributeDefinition[] = data?.attributes ?? []
  const languageDefault: string = data?.languageDefault ?? 'en'
  const languageOptions: string[] = data?.languageOptions ?? ['en']

  return { attributes, languageDefault, languageOptions, isLoading }
}
