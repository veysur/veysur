import {
  completedCookieName,
  hasCompleted,
  markCompleted,
} from './completedCookie'

describe('completedCookie', () => {
  afterEach(() => {
    document.cookie = `${completedCookieName('s1')}=; Path=/; Max-Age=0`
  })

  it('is false before completion', () => {
    expect(hasCompleted('s1')).toBe(false)
  })

  it('is true after markCompleted, for that survey only', () => {
    markCompleted('s1')
    expect(hasCompleted('s1')).toBe(true)
    expect(hasCompleted('s2')).toBe(false)
  })

  it('does not throw when cookies are unavailable', () => {
    const spy = jest
      .spyOn(document, 'cookie', 'get')
      .mockImplementation(() => {
        throw new Error('blocked')
      })
    expect(hasCompleted('s1')).toBe(false)
    spy.mockRestore()
  })
})
