import { genUniqueId } from '@datacapy/id'
import { Infer, PropsOf } from '@datacapy/schema'

import { CompletionStatus } from './SurveyParticipant/completionStatus'
import { surveyParticipantShape } from '../schema/SchemaSurveyParticipant'

export class SurveyParticipant {
  surveyResponse?: { completed: boolean; completedAt: Date | null } | null

  constructor(data: Partial<PropsOf<SurveyParticipant>>) {
    this._id = data?._id || genUniqueId()
    this.surveyId = data?.surveyId
    this.createdById = data?.createdById
    this.token = data?.token || null
    this.emailVerifyToken = data?.emailVerifyToken || null
    this.nameFirst = data?.nameFirst
    this.nameLast = data?.nameLast
    this.email = data?.email
    this.emailStatus = data?.emailStatus || 'pending'
    this.bounceType = data?.bounceType || null
    this.bounceAt = data?.bounceAt ? new Date(data.bounceAt) : null
    this.complaintAt = data?.complaintAt ? new Date(data.complaintAt) : null
    this.language = data?.language
    this.inviteSentAt = data?.inviteSentAt || null
    this.reminderSentAt = data?.reminderSentAt || null
    this.inviteQueuedAt = data?.inviteQueuedAt || null
    this.reminderQueuedAt = data?.reminderQueuedAt || null
    this.validFrom = data?.validFrom || null
    this.validTo = data?.validTo || null
    this.attributes = data?.attributes ?? {}
    this.createdAt = (data?.createdAt && new Date(data.createdAt)) || new Date()
    this.updatedAt = new Date(data?.updatedAt || Date.now())
    this.surveyResponse = data?.surveyResponse ?? null
  }

  get completionStatus(): CompletionStatus {
    if (!this.surveyResponse) {
      return 'notStarted'
    }

    return this.surveyResponse.completed ? 'completed' : 'inProgress'
  }
}

export interface SurveyParticipant extends Infer<
  typeof surveyParticipantShape
> {}
