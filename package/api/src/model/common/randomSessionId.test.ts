import { randomSessionId } from './randomSessionId'

describe('randomSessionId', () => {
  it('returns a base62 string that fits the CHAR(17) id column', () => {
    const id = randomSessionId()
    expect(id).toMatch(/^[0-9A-Za-z]{1,17}$/)
  })

  it('returns a different value on each call', () => {
    const ids = new Set(Array.from({ length: 100 }, () => randomSessionId()))
    expect(ids.size).toBe(100)
  })
})
