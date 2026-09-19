import { Schema, sb } from 'mzen-schema'

export type BillingAddressFormData = {
  line1: string
  line2?: string
  city: string
  state?: string
  postcode: string
  country: string
}

export const SchemaBillingAddress = new Schema(
  sb
    .object()
    .shape({
      line1: sb
        .string()
        .notEmpty({ message: 'Address line 1 is required' })
        .maxLength(140, {
          message: 'Address line 1 must be at most 140 characters',
        }),
      line2: sb.string().maxLength(140, {
        message: 'Address line 2 must be at most 140 characters',
      }),
      city: sb
        .string()
        .notEmpty({ message: 'City is required' })
        .maxLength(140, { message: 'City must be at most 140 characters' }),
      state: sb.string().maxLength(70, {
        message: 'State/Region must be at most 70 characters',
      }),
      postcode: sb
        .string()
        .notEmpty({ message: 'Postcode is required' })
        .maxLength(30, { message: 'Postcode must be at most 30 characters' }),
      country: sb
        .string()
        .notEmpty({ message: 'Country is required' })
        .maxLength(2, { message: 'Invalid country code' }),
    })
    .build(),
)
