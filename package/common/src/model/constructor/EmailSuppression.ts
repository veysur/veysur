import { genUniqueId } from '@datacapy/id'
import { Infer, PropsOf } from '@datacapy/schema'
import { emailSuppressionShape } from '../schema/SchemaEmailSuppression'

export interface EmailSuppressionEvent {
  occurredAt: Date
  projectId: string | null
  surveyId: string | null
  participantId: string | null
}

export class EmailSuppression {
  constructor(data: Partial<PropsOf<EmailSuppression>>) {
    this._id = data?._id || genUniqueId()
    this.email = data?.email
    this.reason = data?.reason
    this.hardBounceEvents = data?.hardBounceEvents || []
    this.softBounceEvents = data?.softBounceEvents || []
    this.complaintEvents = data?.complaintEvents || []
    this.unsubscribeEvents = data?.unsubscribeEvents || []
    this.expiresAt = (data?.expiresAt && new Date(data.expiresAt)) || null
    this.participantId = data?.participantId || null
    this.createdAt = (data?.createdAt && new Date(data.createdAt)) || new Date()
    this.updatedAt = (data?.updatedAt && new Date(data.updatedAt)) || new Date()
  }
}

export interface EmailSuppression extends Infer<typeof emailSuppressionShape> {}
