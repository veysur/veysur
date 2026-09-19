import { SettingSurvey } from '../../SettingSurvey'

describe('SettingSurvey Language Methods', () => {
  let surveySetting: SettingSurvey

  beforeEach(() => {
    surveySetting = new SettingSurvey({
      _id: '1',
      language: {
        default: 'en',
        options: ['en', 'fr', 'es'],
      },
    })
  })

  describe('setLanguageProperty', () => {
    test('updates the default language', () => {
      const updatedSurvey = surveySetting.setLanguageProperty('default', 'fr')

      expect(updatedSurvey).not.toBe(surveySetting)
      expect(updatedSurvey.language.default).toBe('fr')
      expect(updatedSurvey.language.options).toEqual(['en', 'fr', 'es'])
      expect(surveySetting.language.default).toBe('en')
    })

    test('returns same instance if setting to current default', () => {
      const updatedSurvey = surveySetting.setLanguageProperty('default', 'en')

      expect(updatedSurvey).toBe(surveySetting)
      expect(updatedSurvey.language.default).toBe('en')
    })

    test('can set default language to one not in options', () => {
      const updatedSurvey = surveySetting.setLanguageProperty('default', 'de')

      expect(updatedSurvey).not.toBe(surveySetting)
      expect(updatedSurvey.language.default).toBe('de')
      expect(updatedSurvey.language.options).toEqual(['en', 'fr', 'es'])
    })

    test('updates language options', () => {
      const newOptions = ['en', 'fr', 'es', 'de']
      const updatedSurvey = surveySetting.setLanguageProperty(
        'options',
        newOptions,
      )

      expect(updatedSurvey).not.toBe(surveySetting)
      expect(updatedSurvey.language.options).toEqual(newOptions)
      expect(updatedSurvey.language.default).toBe('en')
    })

    test('creates new instance when setting options (different object reference)', () => {
      const currentOptions = ['en', 'fr', 'es']
      const updatedSurvey = surveySetting.setLanguageProperty(
        'options',
        currentOptions,
      )

      expect(updatedSurvey).not.toBe(surveySetting)
      expect(updatedSurvey.language.options).toEqual(currentOptions)
    })
  })

  describe('addLanguageOption', () => {
    test('adds a new language option', () => {
      const updatedSurvey = surveySetting.addLanguageOption('de')

      expect(updatedSurvey).not.toBe(surveySetting)
      expect(updatedSurvey.language.options).toEqual(['en', 'fr', 'es', 'de'])
      expect(surveySetting.language.options).toEqual(['en', 'fr', 'es'])
    })

    test('returns same instance if language already exists', () => {
      const updatedSurvey = surveySetting.addLanguageOption('fr')

      expect(updatedSurvey).toBe(surveySetting)
      expect(updatedSurvey.language.options).toEqual(['en', 'fr', 'es'])
    })

    test('can add multiple languages in sequence', () => {
      const updatedSurvey = surveySetting
        .addLanguageOption('de')
        .addLanguageOption('it')

      expect(updatedSurvey.language.options).toEqual([
        'en',
        'fr',
        'es',
        'de',
        'it',
      ])
    })
  })

  describe('removeLanguageOption', () => {
    test('removes an existing language option', () => {
      const updatedSurvey = surveySetting.removeLanguageOption('fr')

      expect(updatedSurvey).not.toBe(surveySetting)
      expect(updatedSurvey.language.options).toEqual(['en', 'es'])
      expect(surveySetting.language.options).toEqual(['en', 'fr', 'es'])
    })

    test('returns same instance if language does not exist', () => {
      const updatedSurvey = surveySetting.removeLanguageOption('de')

      expect(updatedSurvey).toBe(surveySetting)
      expect(updatedSurvey.language.options).toEqual(['en', 'fr', 'es'])
    })

    test('can remove multiple languages in sequence', () => {
      const updatedSurvey = surveySetting
        .removeLanguageOption('fr')
        .removeLanguageOption('es')

      expect(updatedSurvey.language.options).toEqual(['en'])
    })
  })

  describe('setLanguageOptions', () => {
    test('replaces all language options', () => {
      const newOptions = ['de', 'it', 'pt']
      const updatedSurvey = surveySetting.setLanguageOptions(newOptions)

      expect(updatedSurvey).not.toBe(surveySetting)
      expect(updatedSurvey.language.options).toEqual(newOptions)
      expect(surveySetting.language.options).toEqual(['en', 'fr', 'es'])
    })

    test('returns same instance if options are identical', () => {
      const currentOptions = ['en', 'fr', 'es']
      const updatedSurvey = surveySetting.setLanguageOptions(currentOptions)

      expect(updatedSurvey).toBe(surveySetting)
      expect(updatedSurvey.language.options).toEqual(currentOptions)
    })

    test('handles empty options array', () => {
      const updatedSurvey = surveySetting.setLanguageOptions([])

      expect(updatedSurvey).not.toBe(surveySetting)
      expect(updatedSurvey.language.options).toEqual([])
    })
  })

  describe('method chaining', () => {
    test('methods can be chained together', () => {
      const updatedSurvey = surveySetting
        .setLanguageProperty('default', 'fr')
        .addLanguageOption('de')
        .addLanguageOption('it')

      expect(updatedSurvey.language.default).toBe('fr')
      expect(updatedSurvey.language.options).toEqual([
        'en',
        'fr',
        'es',
        'de',
        'it',
      ])
    })

    test('immutability is maintained through chaining', () => {
      const updatedSurvey = surveySetting
        .setLanguageProperty('default', 'es')
        .removeLanguageOption('fr')

      expect(surveySetting.language.default).toBe('en')
      expect(surveySetting.language.options).toEqual(['en', 'fr', 'es'])

      expect(updatedSurvey.language.default).toBe('es')
      expect(updatedSurvey.language.options).toEqual(['en', 'es'])
    })
  })

  describe('integration with schema defaults', () => {
    test('works with schema default language structure', () => {
      const minimalSurvey = new SettingSurvey({
        _id: '1',
      })

      expect(minimalSurvey.language.default).toBe('en')
      expect(minimalSurvey.language.options).toEqual(['en'])
    })

    test('can modify schema defaults', () => {
      const minimalSurvey = new SettingSurvey({
        _id: '1',
      })

      const updatedSurvey = minimalSurvey
        .setLanguageProperty('default', 'fr')
        .addLanguageOption('fr')
        .addLanguageOption('es')

      expect(updatedSurvey.language.default).toBe('fr')
      expect(updatedSurvey.language.options).toEqual(['en', 'fr', 'es'])
    })
  })

  describe('language configuration scenarios', () => {
    test('multilingual surveySetting setup', () => {
      const multilingualSurvey = surveySetting
        .setLanguageProperty('default', 'en')
        .addLanguageOption('de')
        .addLanguageOption('it')
        .addLanguageOption('pt')

      expect(multilingualSurvey.language.default).toBe('en')
      expect(multilingualSurvey.language.options).toEqual([
        'en',
        'fr',
        'es',
        'de',
        'it',
        'pt',
      ])
    })

    test('switch primary language and clean up', () => {
      const switchedSurvey = surveySetting
        .setLanguageProperty('default', 'fr')
        .removeLanguageOption('en')
        .removeLanguageOption('es')

      expect(switchedSurvey.language.default).toBe('fr')
      expect(switchedSurvey.language.options).toEqual(['fr'])
    })

    test('reset to single language', () => {
      const singleLanguageSurvey = surveySetting
        .setLanguageOptions(['de'])
        .setLanguageProperty('default', 'de')

      expect(singleLanguageSurvey.language.default).toBe('de')
      expect(singleLanguageSurvey.language.options).toEqual(['de'])
    })
  })

  describe('type safety', () => {
    test('string properties accept string values', () => {
      const updatedSurvey = surveySetting.setLanguageProperty('default', 'fr')

      expect(updatedSurvey.language.default).toBe('fr')
    })

    test('options property accepts array values', () => {
      const newOptions = ['en', 'fr']
      const updatedSurvey = surveySetting.setLanguageProperty(
        'options',
        newOptions,
      )

      expect(updatedSurvey.language.options).toEqual(newOptions)
    })
  })
})
