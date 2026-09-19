import { resolveUiLanguage } from './uiLanguages'

describe('resolveUiLanguage', () => {
  test('returns the preferred language when the UI is translated into it', () => {
    expect(resolveUiLanguage('de', 'en')).toBe('de')
  })

  test('falls back to the survey default when the preferred language is unsupported', () => {
    // `xx` has no app-survey translations
    expect(resolveUiLanguage('xx', 'de')).toBe('de')
  })

  test('falls back to English when neither is supported', () => {
    expect(resolveUiLanguage('xx', 'yy')).toBe('en')
  })

  test('falls back to English when both are missing', () => {
    expect(resolveUiLanguage(undefined, null)).toBe('en')
  })
})
