import { SchemaConstructor } from '@datacapy/schema'
import type { tags as t } from '@datacapy/schema'

import { SchemaEmailSuppression } from './EmailSuppression.schema'

type InternalId = string & t.MaxLength<17>

export type EmailSuppressionEvent = {
  occurredAt: Date & t.Default<'now'>
  projectId: (InternalId & t.Default<null>) | null
  surveyId: (InternalId & t.Default<null>) | null
  participantId: (InternalId & t.Default<null>) | null
}

/**
 * An email address that must not be sent to, with the events behind it.
 *
 * @schema emailSuppression construct=EmailSuppression strict
 */
export interface EmailSuppressionData {
  _id: InternalId & t.Required & t.InitFn<'genUniqueId'>
  email: string &
    t.Required &
    t.NotNull &
    t.Email &
    t.MaxLength<255> &
    t.Lowercase &
    t.Trim
  reason: ('hardBounce' | 'softBounce' | 'complaint' | 'unsubscribe') &
    t.Required &
    t.NotNull &
    t.MaxLength<255>
  hardBounceEvents: EmailSuppressionEvent[] & t.Default<t.EmptyArray>
  softBounceEvents: EmailSuppressionEvent[] & t.Default<t.EmptyArray>
  complaintEvents: EmailSuppressionEvent[] & t.Default<t.EmptyArray>
  unsubscribeEvents: EmailSuppressionEvent[] & t.Default<t.EmptyArray>
  expiresAt: (Date & t.Default<null>) | null
  participantId: (InternalId & t.Default<null>) | null
  createdAt: Date & t.Default<'now'>
  updatedAt: Date & t.Default<'now'>
}

export class EmailSuppression extends SchemaConstructor.from(
  SchemaEmailSuppression,
) {}
