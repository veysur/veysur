import { Schema, sb } from 'mzen-schema'

export type UserTaxIdFormData = {
  taxId?: string
  businessName?: string
}

export const SchemaUserTaxId = new Schema(
  sb
    .object()
    .shape({
      taxId: sb
        .string()
        .maxLength(50, { message: 'Tax ID must be at most 50 characters' }),
      businessName: sb.string().maxLength(140, {
        message: 'Business name must be at most 140 characters',
      }),
    })
    .build(),
)
