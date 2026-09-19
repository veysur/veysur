// cspell:disable
import { L10n, setL10nField } from './L10n'

describe('L10n', () => {
  let l10n: L10n

  beforeEach(() => {
    l10n = new L10n({
      en: 'Hello',
      fr: 'Bonjour',
      es: 'Hola',
    })
  })

  describe('constructor', () => {
    it('should create instance with provided data', () => {
      const instance = new L10n({ en: 'Test', fr: 'Tester' })
      expect(instance.en).toBe('Test')
      expect(instance.fr).toBe('Tester')
    })

    it('should create empty instance when no data provided', () => {
      const instance = new L10n()
      expect(Object.keys(instance)).toHaveLength(0)
    })
  })

  describe('getLang', () => {
    it('should return value for existing language', () => {
      expect(l10n.getLang('en')).toBe('Hello')
      expect(l10n.getLang('fr')).toBe('Bonjour')
      expect(l10n.getLang('es')).toBe('Hola')
    })

    it('should return default language when requested language does not exist', () => {
      expect(l10n.getLang('de')).toBe('Hello') // falls back to 'en'
      expect(l10n.getLang('it')).toBe('Hello') // falls back to 'en'
    })

    it('should return custom default language when specified', () => {
      expect(l10n.getLang('de', 'fr')).toBe('Bonjour')
      expect(l10n.getLang('it', 'es')).toBe('Hola')
    })

    it('should return empty string when neither language nor default exist', () => {
      const emptyL10n = new L10n()
      expect(emptyL10n.getLang('en')).toBe('')
      expect(emptyL10n.getLang('fr', 'es')).toBe('')
    })

    it('should return empty string when default language does not exist', () => {
      expect(l10n.getLang('de', 'it')).toBe('')
    })
  })

  describe('getLangOrNull', () => {
    it('should return value for existing language', () => {
      expect(l10n.getLangOrNull('en')).toBe('Hello')
      expect(l10n.getLangOrNull('fr')).toBe('Bonjour')
      expect(l10n.getLangOrNull('es')).toBe('Hola')
    })

    it('should return default language when requested language does not exist', () => {
      expect(l10n.getLangOrNull('de')).toBe('Hello') // falls back to 'en'
      expect(l10n.getLangOrNull('it')).toBe('Hello') // falls back to 'en'
    })

    it('should return custom default language when specified', () => {
      expect(l10n.getLangOrNull('de', 'fr')).toBe('Bonjour')
      expect(l10n.getLangOrNull('it', 'es')).toBe('Hola')
    })

    it('should return null when neither language nor default exist', () => {
      const emptyL10n = new L10n()
      expect(emptyL10n.getLangOrNull('en')).toBe(null)
      expect(emptyL10n.getLangOrNull('fr', 'es')).toBe(null)
    })

    it('should return null when default language does not exist', () => {
      expect(l10n.getLangOrNull('de', 'it')).toBe(null)
    })
  })

  describe('setLang', () => {
    it('should return new L10n instance with updatedAt language', () => {
      const result = l10n.setLang('Hi', 'en')

      expect(result).toBeInstanceOf(L10n)
      expect(result).not.toBe(l10n)
      expect(result.en).toBe('Hi')
      expect(result.fr).toBe('Bonjour')
      expect(result.es).toBe('Hola')
    })

    it('should add new language to existing instance', () => {
      const result = l10n.setLang('Guten Tag', 'de')

      expect(result.de).toBe('Guten Tag')
      expect(result.en).toBe('Hello')
      expect(result.fr).toBe('Bonjour')
      expect(result.es).toBe('Hola')
    })

    it('should not modify original instance', () => {
      const original = { ...l10n }
      l10n.setLang('Modified', 'en')

      expect(l10n.en).toBe(original.en)
    })

    it('should remove empty string value', () => {
      l10n = l10n.setLang('', 'en')

      expect(l10n.en).toBe(undefined)
    })

    it('should remove null value', () => {
      l10n = l10n.setLang(null, 'en')

      expect(l10n.en).toBe(undefined)
    })
  })

  describe('edge cases', () => {
    it('should handle empty strings as valid values', () => {
      const instance = new L10n({ en: '', fr: 'Bonjour' })
      expect(instance.getLang('en')).toBe('')
      expect(instance.getLangOrNull('en')).toBe('')
      // But non-empty strings work normally
      expect(instance.getLangOrNull('fr')).toBe('Bonjour')
    })

    it('should handle numeric properties', () => {
      const instance = new L10n({ en: 'Hello' })
      instance['123'] = 'numeric key'
      expect(instance.getLang('123')).toBe('numeric key')
      expect(instance.getLangOrNull('123')).toBe('numeric key')
    })

    it('should handle special characters in language codes', () => {
      const instance = new L10n({
        'en-US': 'Hello US',
        'fr-CA': 'Bonjour Canada',
      })
      expect(instance.getLang('en-US')).toBe('Hello US')
      expect(instance.getLangOrNull('fr-CA')).toBe('Bonjour Canada')
    })
  })

  describe('setL10nField', () => {
    it('creates a new L10n when current is null or undefined', () => {
      expect(setL10nField(null, 'Hello', 'en', 'en')).toBeInstanceOf(L10n)
      expect(setL10nField(undefined, 'Hello', 'en', 'en').en).toBe('Hello')
    })

    it('keeps an emptied default language as an empty string', () => {
      const result = setL10nField(l10n, '', 'en', 'en')
      expect(result.en).toBe('')
    })

    it('unsets an emptied secondary language', () => {
      const result = setL10nField(l10n, '', 'fr', 'en')
      expect('fr' in result).toBe(false)
      expect(result.en).toBe('Hello')
    })

    it('sets a non-empty secondary language value', () => {
      const result = setL10nField(l10n, 'Neu', 'de', 'en')
      expect(result.de).toBe('Neu')
    })
  })
})
