import { errorMessage, errorStack } from './errorMessage'

describe('errorMessage', () => {
  it('returns the message of an Error instance', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom')
  })

  it('stringifies a non-Error value', () => {
    expect(errorMessage('plain string')).toBe('plain string')
    expect(errorMessage(42)).toBe('42')
    expect(errorMessage(null)).toBe('null')
    expect(errorMessage(undefined)).toBe('undefined')
    expect(errorMessage({ code: 'X' })).toBe('[object Object]')
  })

  it('preserves subclass messages', () => {
    class CustomError extends Error {}
    expect(errorMessage(new CustomError('custom'))).toBe('custom')
  })
})

describe('errorStack', () => {
  it('returns a stack string for an Error', () => {
    expect(typeof errorStack(new Error('boom'))).toBe('string')
  })

  it('returns undefined for a non-Error value', () => {
    expect(errorStack('nope')).toBeUndefined()
    expect(errorStack(null)).toBeUndefined()
  })
})
