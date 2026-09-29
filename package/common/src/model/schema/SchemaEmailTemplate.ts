import { Schema, sb } from '@datacapy/schema'

export class SchemaEmailTemplate extends Schema {
  constructor() {
    super(
      sb
        .schema('emailTemplate')
        .construct('EmailTemplate')
        .strict()
        .shape({
          _id: sb.string().required(),
          surveyId: sb.string().required(),
          type: sb
            .string()
            .inArray([
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
        })
        .build(),
    )
  }
}
