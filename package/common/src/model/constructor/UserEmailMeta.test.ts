import { UserEmailMeta } from './UserEmailMeta'

describe('UserEmailMeta', () => {
  test('constructor defaults to unverified with empty token and history', () => {
    const emailMeta = new UserEmailMeta()
    expect(emailMeta.verify.status).toEqual({
      isVerified: false,
      isVerifiedAt: null,
    })
    expect(emailMeta.verify.token).toEqual([])
    expect(emailMeta.history).toEqual([])
  })

  test('constructor accepts initial verify status', () => {
    const now = new Date()
    const emailMeta = new UserEmailMeta({
      verify: { status: { isVerified: true, isVerifiedAt: now }, token: [] },
    })
    expect(emailMeta.verify.status.isVerified).toBe(true)
    expect(emailMeta.verify.status.isVerifiedAt).toBe(now)
  })

  test('isVerified getter reflects verify.status.isVerified', () => {
    const unverified = new UserEmailMeta()
    expect(unverified.isVerified).toBe(false)

    const verified = new UserEmailMeta({
      verify: {
        status: { isVerified: true, isVerifiedAt: new Date() },
        token: [],
      },
    })
    expect(verified.isVerified).toBe(true)
  })

  test('historyGetPrevious returns null when history is empty', () => {
    const emailMeta = new UserEmailMeta()
    expect(emailMeta.historyGetPrevious()).toBeNull()
  })

  test('historyGetPrevious returns null when history has only one entry', () => {
    const emailMeta = new UserEmailMeta()
    emailMeta.history = [makeHistoryEntry('old@example.com')]
    expect(emailMeta.historyGetPrevious()).toBeNull()
  })

  test('historyGetPrevious returns second-to-last entry', () => {
    const emailMeta = new UserEmailMeta()
    emailMeta.history = [
      makeHistoryEntry('older@example.com'),
      makeHistoryEntry('old@example.com'),
    ]
    expect(emailMeta.historyGetPrevious()?.prevValue).toBe('older@example.com')
  })
})

function makeHistoryEntry(prevValue: string) {
  return {
    prevValue,
    verifyStatus: { isVerified: false, isVerifiedAt: null },
    clientId: 'client-1',
    createdAt: new Date(),
  }
}
