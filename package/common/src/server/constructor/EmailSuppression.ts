import { SchemaConstructor } from '@datacapy/schema'
import { SchemaEmailSuppression } from '../schema/SchemaEmailSuppression'

export interface EmailSuppressionEvent {
  occurredAt: Date
  projectId: string | null
  surveyId: string | null
  participantId: string | null
}

/** Fields come from {@link SchemaEmailSuppression}. */
export class EmailSuppression extends SchemaConstructor.from(
  SchemaEmailSuppression,
) {}
