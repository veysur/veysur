import { mergeParticipantData } from './mergeParticipantData'

describe('mergeParticipantData', () => {
  it('should return an empty object for null/undefined participant', () => {
    expect(mergeParticipantData(null)).toEqual({})
    expect(mergeParticipantData(undefined)).toEqual({})
  })

  it('should merge custom attributes with root profile fields', () => {
    const merged = mergeParticipantData({
      nameFirst: 'John',
      nameLast: 'Doe',
      email: 'john@example.com',
      language: 'en',
      token: 'abc123',
      attributes: { city: 'Liverpool', memberId: '42' },
    })

    expect(merged).toEqual({
      city: 'Liverpool',
      memberId: '42',
      nameFirst: 'John',
      nameLast: 'Doe',
      email: 'john@example.com',
      language: 'en',
      token: 'abc123',
    })
  })

  it('should let root profile fields win on name collision with a custom attribute', () => {
    const merged = mergeParticipantData({
      nameFirst: 'John',
      attributes: { nameFirst: 'CustomOverride' },
    })

    expect(merged.nameFirst).toBe('John')
  })

  it('should include internal fields such as token', () => {
    const merged = mergeParticipantData({ token: 'secret-token' })
    expect(merged.token).toBe('secret-token')
  })
})
