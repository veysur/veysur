import { SurveyParticipant } from 'veysur-common'

export type ParticipantSendStatus =
  'Not sent' | 'Queued' | 'Complaint' | 'Hard bounce' | 'Soft bounce' | 'Sent'

export const getParticipantSendStatus = (
  participant: SurveyParticipant,
): ParticipantSendStatus => {
  if (!participant.inviteSentAt && !participant.reminderSentAt) {
    // Queued rows stay in RepoEmail's pending queue (see docs/mail-queue-pacing.md)
    // until ServiceEmail.processQueue dispatches them - *SentAt is set only then.
    if (participant.inviteQueuedAt || participant.reminderQueuedAt)
      return 'Queued'
    return 'Not sent'
  }
  if (participant.complaintAt) return 'Complaint'
  if (participant.bounceType === 'hardBounce') return 'Hard bounce'
  if (participant.bounceType === 'softBounce') return 'Soft bounce'
  return 'Sent'
}
