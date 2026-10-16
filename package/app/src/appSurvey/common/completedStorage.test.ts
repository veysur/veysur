import {
  completedStorageKey,
  hasCompleted,
  markCompleted,
} from './completedStorage'

describe('completedStorage', () => {
  afterEach(() => {
    window.localStorage.removeItem(completedStorageKey('s1'))
  })

  it('is false before completion', () => {
    expect(hasCompleted('s1')).toBe(false)
  })

  it('is true after markCompleted, for that survey only', () => {
    markCompleted('s1')
    expect(hasCompleted('s1')).toBe(true)
    expect(hasCompleted('s2')).toBe(false)
  })

  it('does not throw when storage is unavailable', () => {
    const spy = jest
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('blocked')
      })
    expect(hasCompleted('s1')).toBe(false)
    spy.mockRestore()
  })
})
