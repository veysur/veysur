import { Schema, sb } from 'mzen-schema'

import { SurveyParticipantAttributeRow } from '../../hook/useSurveyParticipantAttributeList'

export type ParticipantFormData = {
  nameFirst: string
  nameLast: string
  email: string
  language: string
  token: string
  attributes: Record<string, string>
}

export function buildParticipantFormSchema(
  customAttributes: SurveyParticipantAttributeRow[] = [],
): Schema {
  const attributeShape: Record<string, ReturnType<typeof sb.string>> = {}
  for (const attr of customAttributes) {
    attributeShape[attr.name] = attr.required
      ? sb.string().notEmpty({ message: `${attr.label} is required` })
      : sb.string()
  }

  return new Schema(
    sb
      .object()
      .shape({
        nameFirst: sb.string().notEmpty({ message: 'First name is required' }),
        nameLast: sb.string().notEmpty({ message: 'Last name is required' }),
        email: sb
          .string()
          .notEmpty({ message: 'Email address is required' })
          .email({ message: 'Please provide a valid email address' }),
        language: sb.string().notEmpty({ message: 'Language is required' }),
        token: sb.string().regex(/^[A-Z0-9]*$/, {
          message: 'Token must be alphanumeric uppercase only',
        }),
        attributes: sb.object().shape(attributeShape),
      })
      .build(),
  )
}
