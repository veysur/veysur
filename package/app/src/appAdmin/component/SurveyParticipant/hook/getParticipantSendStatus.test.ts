import { SurveyParticipant } from 'veysur-common'
import { getParticipantSendStatus } from './getParticipantSendStatus'

const baseParticipant = (
  overrides: Partial<SurveyParticipant> = {},
): SurveyParticipant =>
  new SurveyParticipant({
    surveyId: 'survey-1',
    createdById: 'user-1',
    nameFirst: 'Jane',
    nameLast: 'Doe',
    email: 'jane@example.com',
    language: 'en',
    ...overrides,
  })

describe('getParticipantSendStatus', () => {
  test('not sent when neither inviteSent nor reminderSent is set', () => {
    expect(getParticipantSendStatus(baseParticipant())).toBe('Not sent')
  })

  test('complaint takes priority over hard bounce', () => {
    const participant = baseParticipant({
      inviteSentAt: new Date(),
      complaintAt: new Date(),
      bounceType: 'hardBounce',
    })
    expect(getParticipantSendStatus(participant)).toBe('Complaint')
  })

  test('hard bounce when bounceType is hardBounce and no complaint', () => {
    const participant = baseParticipant({
      inviteSentAt: new Date(),
      bounceType: 'hardBounce',
    })
    expect(getParticipantSendStatus(participant)).toBe('Hard bounce')
  })

  test('soft bounce when bounceType is softBounce', () => {
    const participant = baseParticipant({
      inviteSentAt: new Date(),
      bounceType: 'softBounce',
    })
    expect(getParticipantSendStatus(participant)).toBe('Soft bounce')
  })

  test('sent when a send timestamp is set with no active bounce/complaint', () => {
    const participant = baseParticipant({ inviteSentAt: new Date() })
    expect(getParticipantSendStatus(participant)).toBe('Sent')
  })

  test('sent based on reminderSent alone', () => {
    const participant = baseParticipant({ reminderSentAt: new Date() })
    expect(getParticipantSendStatus(participant)).toBe('Sent')
  })

  test('queued when inviteQueuedAt is set but not yet dispatched', () => {
    const participant = baseParticipant({ inviteQueuedAt: new Date() })
    expect(getParticipantSendStatus(participant)).toBe('Queued')
  })

  test('queued based on reminderQueuedAt alone', () => {
    const participant = baseParticipant({ reminderQueuedAt: new Date() })
    expect(getParticipantSendStatus(participant)).toBe('Queued')
  })

  test('sent takes priority over queued once dispatched (queuedAt is never cleared on send)', () => {
    const participant = baseParticipant({
      inviteQueuedAt: new Date(),
      inviteSentAt: new Date(),
    })
    expect(getParticipantSendStatus(participant)).toBe('Sent')
  })
})
