import { useQueryClient } from '@tanstack/react-query'
import { useAuthdQuery } from 'hook/useAuthdQuery'
import {
  SurveyParticipantAttributeDefinition,
  SURVEY_PARTICIPANT_SYSTEM_ATTRIBUTE_METADATA,
  SurveyParticipantAttributeLanguageData,
} from 'veysur-common'

import { KEY_STATE_SURVEY_PARTICIPANT_ATTRIBUTE_LIST } from 'appAdmin/common'
import { useProjectDomain } from 'appAdmin/hook'

import { getSurveyParticipantAttributeApi } from '../registry'

export interface SurveyParticipantAttributeRow {
  kind: 'system' | 'custom'
  name: string
  tempId?: string
  attribute?: SurveyParticipantAttributeDefinition
  required: boolean
  internal: boolean
  example?: string | null
  label: string
  description?: string
  languages: Record<string, SurveyParticipantAttributeLanguageData>
}

export function useSurveyParticipantAttributeList(surveyId: string) {
  const queryClient = useQueryClient()
  const project = useProjectDomain()

  const { data, isLoading, isFetching } = useAuthdQuery(
    {
      enabled: !!project?._id && !!surveyId,
      queryKey: [KEY_STATE_SURVEY_PARTICIPANT_ATTRIBUTE_LIST, surveyId],
      queryFn: async () => {
        if (!project?._id || !surveyId) return
        return getSurveyParticipantAttributeApi().getAll(surveyId)
      },
      // Attribute definitions rarely change during an editing session, and
      // every create/delete/batch-save mutation invalidates
      // KEY_STATE_SURVEY_PARTICIPANT_ATTRIBUTE_LIST. `refetchOnMount: 'always'`
      // here fired a fresh request on every mount - and this hook mounts per
      // survey-editor row (via useTextExpressionVariablePicker), so scrolling
      // rows in and out of the virtualised list produced a burst of identical
      // GET /api/survey-participant-attribute/<id> requests.
      staleTime: 60_000,
    },
    queryClient,
  )

  const systemAttributes: SurveyParticipantAttributeRow[] = Object.entries(
    SURVEY_PARTICIPANT_SYSTEM_ATTRIBUTE_METADATA,
  ).map(([name, meta]) => ({
    kind: 'system',
    name,
    required: meta.required,
    internal: meta.internal,
    example: meta.example,
    label: meta.label,
    description: meta.description,
    languages: {},
  }))

  const customAttributes: SurveyParticipantAttributeRow[] =
    data?.attributes?.map((attribute) => ({
      kind: 'custom',
      name: attribute.name,
      attribute,
      required: attribute.required,
      internal: attribute.internal,
      example: attribute.example,
      label: attribute.languages?.en?.label || attribute.name,
      description: attribute.languages?.en?.description,
      languages: attribute.languages || {},
    })) || []

  return {
    systemAttributes,
    customAttributes,
    isLoading,
    isFetching,
  }
}
