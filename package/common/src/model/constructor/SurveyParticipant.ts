import { genUniqueId } from 'mzen-id'
import { PropsOf } from 'mzen-schema'

import { CompletionStatus } from './SurveyParticipant/completionStatus'

export class SurveyParticipant {
  _id: string
  surveyId: string
  createdById: string
  token: string | null
  emailVerifyToken: string | null
  nameFirst: string
  nameLast: string
  email: string
  emailStatus: string
  bounceType: 'hardBounce' | 'softBounce' | null
  bounceAt: Date | null
  complaintAt: Date | null
  language: string
  inviteSentAt: Date | null
  reminderSentAt: Date | null
  inviteQueuedAt: Date | null
  reminderQueuedAt: Date | null
  validFrom: Date | null
  validTo: Date | null
  attributes: Record<string, string>
  createdAt: Date
  updatedAt: Date
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
    this.updatedAt = (data?.createdAt && new Date(data.updatedAt)) || new Date()
    this.surveyResponse = data?.surveyResponse ?? null
  }

  get completionStatus(): CompletionStatus {
    if (!this.surveyResponse) {
      return 'notStarted'
    }

    return this.surveyResponse.completed ? 'completed' : 'inProgress'
  }
}
