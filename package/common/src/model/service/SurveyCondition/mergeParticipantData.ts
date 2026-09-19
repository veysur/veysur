import { ParticipantData } from '../SurveyExpression/types'

export interface ParticipantProfileForMerge {
  nameFirst?: string | null
  nameLast?: string | null
  email?: string | null
  language?: string | null
  token?: string | null
  attributes?: Record<string, string> | null
}

/**
 * Merges a participant's custom attributes with their root profile fields into a
 * single object for use as ParticipantData in condition evaluation. Root profile
 * fields (including internal ones such as token) win on name collision with a
 * custom attribute of the same name.
 */
export function mergeParticipantData(
  participant: ParticipantProfileForMerge | null | undefined,
): ParticipantData {
  if (!participant) return {}

  const { nameFirst, nameLast, email, language, token, attributes } =
    participant

  return {
    ...attributes,
    nameFirst,
    nameLast,
    email,
    language,
    token,
  }
}
