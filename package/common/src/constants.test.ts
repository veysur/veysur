import {
  ANONYMISED_TIMESTAMP_ISO,
  anonymisedTimestamp,
  isAnonymisedTimestamp,
} from './constants'

describe('anonymised timestamp sentinel', () => {
  jest.useRealTimers()

  it('anonymisedTimestamp returns a fresh Date equal to the ISO constant', () => {
    const a = anonymisedTimestamp()
    const b = anonymisedTimestamp()

    expect(a).toBeInstanceOf(Date)
    expect(a.toISOString()).toBe(ANONYMISED_TIMESTAMP_ISO)
    expect(a).not.toBe(b)
  })

  it('isAnonymisedTimestamp is true for the sentinel as Date, ISO string and ms', () => {
    const ms = Date.parse(ANONYMISED_TIMESTAMP_ISO)

    expect(isAnonymisedTimestamp(anonymisedTimestamp())).toBe(true)
    expect(isAnonymisedTimestamp(ANONYMISED_TIMESTAMP_ISO)).toBe(true)
    expect(isAnonymisedTimestamp(ms)).toBe(true)
  })

  it('isAnonymisedTimestamp is false for other values', () => {
    expect(isAnonymisedTimestamp(new Date())).toBe(false)
    expect(isAnonymisedTimestamp(new Date(0))).toBe(false)
    expect(isAnonymisedTimestamp(null)).toBe(false)
    expect(isAnonymisedTimestamp(undefined)).toBe(false)
  })
})
