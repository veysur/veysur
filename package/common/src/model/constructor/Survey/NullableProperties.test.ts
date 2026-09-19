import { Survey } from '../Survey'
import { SettingSurvey } from '../SettingSurvey'

describe('Survey Nullable Properties', () => {
  let survey: Survey
  let settingSurvey: SettingSurvey

  beforeEach(() => {
    survey = new Survey({
      _id: '1',
      createdById: '1',
      name: 'Test Survey',
      title: { en: 'Test Survey' },
    })
    settingSurvey = new SettingSurvey()
  })

  describe('getLanguage', () => {
    test('returns defaults when language is null', () => {
      // Survey createdAt without language should use defaults
      const language = survey.getLanguage(settingSurvey)

      expect(language.default).toBe('en')
      expect(language.options).toEqual(['en'])
    })

    test('returns custom values when language is set', () => {
      const surveyWithLanguage = new Survey({
        _id: '1',
        createdById: '1',
        name: 'Test Survey',
        title: { en: 'Test Survey' },
        language: {
          default: 'fr',
          options: ['fr', 'en'],
        },
      })

      const language = surveyWithLanguage.getLanguage(settingSurvey)

      expect(language.default).toBe('fr')
      expect(language.options).toEqual(['en', 'fr'])
    })

    test('handles partial language objects with nulls', () => {
      const surveyWithPartialLanguage = new Survey({
        _id: '1',
        createdById: '1',
        name: 'Test Survey',
        title: { en: 'Test Survey' },
        language: {
          default: 'es',
          options: null, // This should fall back to default
        },
      })

      const language = surveyWithPartialLanguage.getLanguage(settingSurvey)

      expect(language.default).toBe('es')
      expect(language.options).toEqual(['en']) // Should use default
    })
  })

  describe('getPresentation', () => {
    test('returns defaults when presentation is null', () => {
      const presentation = survey.getPresentation(settingSurvey)

      expect(presentation.format).toBe('group')
      expect(presentation.noAnswer).toBe(true)
      expect(presentation.title).toBe(false)
    })

    test('returns custom values when presentation is set', () => {
      const surveyWithPresentation = new Survey({
        _id: '1',
        createdById: '1',
        name: 'Test Survey',
        title: { en: 'Test Survey' },
        presentation: {
          format: 'question',
          noAnswer: false,
          title: false,
        },
      })

      const presentation = surveyWithPresentation.getPresentation(settingSurvey)

      expect(presentation.format).toBe('question')
      expect(presentation.noAnswer).toBe(false)
      expect(presentation.title).toBe(false)
    })
  })

  describe('custom defaults', () => {
    test('uses custom global defaults when set', () => {
      // Set custom defaults
      const customDefaults = new SettingSurvey({
        _id: 'custom-defaults',
        language: {
          default: 'de',
          options: ['de', 'en'],
        },
      })

      // Create new survey that should use custom defaults
      const newSurvey = new Survey({
        _id: '2',
        createdById: '2',
        name: 'Test Survey 2',
        title: { en: 'Test Survey 2' },
      })

      const language = newSurvey.getLanguage(customDefaults)

      expect(language.default).toBe('de')
      expect(language.options).toEqual(['en', 'de'])
    })
  })
})
