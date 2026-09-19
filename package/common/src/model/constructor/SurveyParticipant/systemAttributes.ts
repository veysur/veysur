export interface SurveyParticipantSystemAttributeMeta {
  label: string
  description?: string
  required: boolean
  internal: boolean
  example?: string
}

export const SURVEY_PARTICIPANT_SYSTEM_ATTRIBUTE_METADATA: Record<
  string,
  SurveyParticipantSystemAttributeMeta
> = {
  nameFirst: { label: 'First Name', required: true, internal: false },
  nameLast: { label: 'Last Name', required: true, internal: false },
  email: { label: 'Email', required: true, internal: false },
  language: { label: 'Language', required: true, internal: false },
  token: { label: 'Token', required: false, internal: true },
}

export const SURVEY_PARTICIPANT_SYSTEM_ATTRIBUTE_NAMES: readonly string[] =
  Object.keys(SURVEY_PARTICIPANT_SYSTEM_ATTRIBUTE_METADATA)
