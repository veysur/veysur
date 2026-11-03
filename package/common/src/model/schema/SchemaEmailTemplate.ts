import { genUniqueId } from '@datacapy/id'
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

export const emailTemplateSpec = {
  _id: sb.string().required().init(genUniqueId),
  surveyId: sb.string().required().nullable().init(null),
  // Typed `string[]` on purpose: a literal union here would ripple through the
  // settings UI, where the type travels as a plain string.
  type: sb
    .string()
    .required()
    .inArray<string>([
      'invite',
      'reminder',
      'thankYou',
      'adminBasic',
      'adminDetail',
      'team-invite',
    ]),
  lang: sb.string().required().maxLength(3),
  subject: sb.string().required().default(null).stripHtml().trim(),
  body: sb.string().required().default(null).trim(),
  createdAt: sb.date().default('now'),
  updatedAt: sb.date().default('now'),
}

export class SchemaEmailTemplate extends Schema<typeof emailTemplateSpec> {
  constructor() {
    super(
      sb
        .schema('emailTemplate')
        .construct('EmailTemplate')
        .strict()
        .shape(emailTemplateSpec),
    )
  }
}
