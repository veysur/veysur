import { Schema, sb, BuilderBase } from 'mzen-schema'

import { ParticipantAttributeDefinition } from 'appSurvey/api/SurveyParticipantAttributeSnapshotApi'

export type RegistrationFormData = {
  nameFirst: string
  nameLast: string
  email: string
  language: string
  attributes: Record<string, string>
}

export function buildRegistrationFormSchema(
  attributes: ParticipantAttributeDefinition[] = [],
): Schema {
  const attributeShape: Record<string, BuilderBase<unknown>> = {}
  for (const attr of attributes) {
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
        language: sb.string().notEmpty({ message: 'Please select a language' }),
        attributes: sb.object().shape(attributeShape),
      })
      .build(),
  )
}
