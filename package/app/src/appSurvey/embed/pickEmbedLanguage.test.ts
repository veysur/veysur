import { pickEmbedLanguage } from './pickEmbedLanguage'

describe('pickEmbedLanguage', () => {
  const languages = ['en', 'de', 'fr']

  test('uses the requested language when available', () => {
    expect(pickEmbedLanguage('de', ['fr'], languages, 'en')).toBe('de')
  })

  test('uses the browser language, including its base language', () => {
    expect(pickEmbedLanguage(undefined, ['fr-CA', 'en'], languages, 'en')).toBe(
      'fr',
    )
  })

  test('falls back to the default, then the first language', () => {
    expect(pickEmbedLanguage('xx', ['ja'], languages, 'de')).toBe('de')
    expect(pickEmbedLanguage(undefined, [], languages, null)).toBe('en')
  })
})
