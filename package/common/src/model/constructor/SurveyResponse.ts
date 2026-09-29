import { genUniqueId } from '@datacapy/id'

import { SurveyParticipant } from './SurveyParticipant'
import { SurveyPublication } from './SurveyPublication'
import { SurveySnapshotPartial } from './SurveySnapshotPartial'

export class SurveyResponse {
  _id: string
  surveyId: string
  snapshotId: string // For compatibility checking
  publicationId: string // For audit trail
  participantId: string | null
  participant: SurveyParticipant | null
  publication: SurveyPublication | null // Populated relation
  snapshot: SurveySnapshotPartial | null // Populated relation
  sessionId: string | null
  language: string | null
  answers: object
  randomSeeds: Record<string, number>
  ip: string | null
  referrerUrl: string | null
  completed: boolean
  completedAt: Date | null
  startedAt: Date | null
  createdAt: Date
  updatedAt: Date
  merge: {
    fromSnapshotId: string | null
    origResponseId: string | null
    at: Date | null
  }

  constructor(data) {
    this._id = data?._id || genUniqueId()
    this.surveyId = data?.surveyId
    this.snapshotId = data?.snapshotId
    this.publicationId = data?.publicationId
    this.participantId = data?.participantId || null
    this.participant =
      (data?.participant && new SurveyParticipant(data?.participant)) || null
    this.publication =
      (data?.publication && new SurveyPublication(data?.publication)) || null
    this.snapshot =
      (data?.snapshot && new SurveySnapshotPartial(data?.snapshot)) || null
    this.sessionId = data?.sessionId || null
    this.language = data?.language || null
    this.answers = data?.answers || {}
    this.randomSeeds = data?.randomSeeds || {}
    this.ip = data?.ip || null
    this.referrerUrl = data?.referrerUrl || null
    this.completedAt = (data?.completedAt && new Date(data.completedAt)) || null
    // Legacy documents predate `completed` — infer it from completedAt so old
    // completed responses aren't misread as in-progress.
    this.completed = data?.completed ?? !!data?.completedAt
    this.startedAt = (data?.startedAt && new Date(data.startedAt)) || null
    this.createdAt = (data?.createdAt && new Date(data.createdAt)) || new Date()
    this.updatedAt = (data?.updatedAt && new Date(data.updatedAt)) || new Date()

    // Support both old and new format for backward compatibility
    if (data?.merge && data.merge.fromSnapshotId) {
      this.merge = {
        fromSnapshotId: data.merge.fromSnapshotId,
        origResponseId:
          data.merge.origResponseId || data.merge.fromResponseId || null, // Support legacy fromResponseId
        at: data.merge.at ? new Date(data.merge.at) : null,
      }
    } else if (data?.mergedFromSnapshotId) {
      // Legacy format - convert on read
      this.merge = {
        fromSnapshotId: data.mergedFromSnapshotId,
        origResponseId: null, // Legacy data won't have this
        at: data.mergedAt ? new Date(data.mergedAt) : null,
      }
    } else {
      // Not merged - all fields null
      this.merge = {
        fromSnapshotId: null,
        origResponseId: null,
        at: null,
      }
    }
  }
}
