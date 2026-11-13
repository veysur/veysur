import { SchemaConstructor } from '@datacapy/schema'
import type { tags as t } from '@datacapy/schema'

import { SchemaEmailTemplate } from './EmailTemplate.schema'

/** @schema emailTemplate construct=EmailTemplate strict */
export interface EmailTemplateData {
  _id: string & t.Required & t.InitFn<'genUniqueId'>
  surveyId: (string & t.Required & t.Init<null>) | null
  type: string &
    t.OneOf<
      | 'invite'
      | 'reminder'
      | 'thankYou'
      | 'adminBasic'
      | 'adminDetail'
      | 'team-invite'
    >
  lang: string & t.MaxLength<3>
  subject: string & t.Required & t.Default<null> & t.StripHtml & t.Trim
  body: string & t.Required & t.Default<null> & t.Trim
  createdAt: Date & t.Default<'now'>
  updatedAt: Date & t.Default<'now'>
}

/** Fields come from {@link SchemaEmailTemplate}. */
export class EmailTemplate extends SchemaConstructor.from(
  SchemaEmailTemplate,
) {}
