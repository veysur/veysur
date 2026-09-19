import { JwtParticipant } from './JwtParticipant'

describe('JwtParticipant', () => {
  it('auto-generates a base62 sessionId when none is given', () => {
    const jwt = new JwtParticipant({ surveyId: 's1' })
    expect(jwt.sessionId).toMatch(/^[0-9A-Za-z]{1,17}$/)
  })

  it('gives each instance a distinct sessionId', () => {
    const a = new JwtParticipant({ surveyId: 's1' })
    const b = new JwtParticipant({ surveyId: 's1' })
    expect(a.sessionId).not.toBe(b.sessionId)
  })

  it('preserves an explicitly provided sessionId', () => {
    const jwt = new JwtParticipant({
      surveyId: 's1',
      sessionId: 'fixed-session',
    })
    expect(jwt.sessionId).toBe('fixed-session')
  })

  it('sets type to participant', () => {
    expect(new JwtParticipant({ surveyId: 's1' }).type).toBe('participant')
  })
})
