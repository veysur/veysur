import { genUniqueId } from '@datacapy/id'
import { PropsOf } from '@datacapy/schema'

export interface EmailSuppressionEvent {
  occurredAt: Date
  projectId: string | null
  surveyId: string | null
  participantId: string | null
}

export class EmailSuppression {
  _id: string
  email: string
  reason: 'hardBounce' | 'softBounce' | 'complaint' | 'unsubscribe'
  hardBounceEvents: EmailSuppressionEvent[]
  softBounceEvents: EmailSuppressionEvent[]
  complaintEvents: EmailSuppressionEvent[]
  unsubscribeEvents: EmailSuppressionEvent[]
  expiresAt: Date | null
  participantId: string | null
  createdAt: Date
  updatedAt: Date

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
