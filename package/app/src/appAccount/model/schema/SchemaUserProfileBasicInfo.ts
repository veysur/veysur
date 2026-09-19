import { Schema, sb } from 'mzen-schema'

export type UserProfileBasicInfoFormData = {
  nameFirst: string
  nameLast: string
}

export const SchemaUserProfileBasicInfo = new Schema(
  sb
    .object()
    .shape({
      nameFirst: sb
        .string()
        .notEmpty({ message: 'First name is required' })
        .maxLength(64, { message: 'First name must be at most 64 characters' }),
      nameLast: sb
        .string()
        .notEmpty({ message: 'Last name is required' })
        .maxLength(64, { message: 'Last name must be at most 64 characters' }),
    })
    .build(),
)
