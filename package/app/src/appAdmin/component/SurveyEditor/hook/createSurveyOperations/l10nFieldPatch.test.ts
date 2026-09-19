import { l10nFieldPatchValue } from './l10nFieldPatch'

describe('l10nFieldPatchValue', () => {
  const current = { en: 'Hello', de: 'Hallo' }

  it('returns current unchanged when the default language is emptied', () => {
    expect(l10nFieldPatchValue(current, '', 'en', 'en')).toBe(current)
  })

  it('returns an explicit null sentinel when a secondary language is emptied', () => {
    expect(l10nFieldPatchValue(current, '', 'de', 'en')).toEqual({
      en: 'Hello',
      de: null,
    })
  })

  it('returns current unchanged for a non-empty value', () => {
    expect(l10nFieldPatchValue(current, 'Greetings', 'fr', 'en')).toBe(current)
  })

  it('returns current unchanged when there is no default language', () => {
    expect(l10nFieldPatchValue(current, '', 'de', undefined)).toBe(current)
  })
})
