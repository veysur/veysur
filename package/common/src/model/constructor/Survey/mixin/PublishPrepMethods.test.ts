import { Survey } from '../../Survey'
import { SettingSurvey } from '../../SettingSurvey'

describe('PublishPrepMethods', () => {
  let survey: Survey
  let defaults: SettingSurvey

  beforeEach(() => {
    survey = new Survey({
      _id: '1',
      title: { en: 'Test Survey' },
      createdById: '1',
      language: null,
      access: null,
    })

    defaults = new SettingSurvey({
      _id: 'defaults',
      language: {
        default: 'en',
        options: ['en', 'fr', 'de'],
      },
      access: {
        anonymous: true,
        open: false,
        publicReg: false,
        index: false,
        tokenPersist: true,
        multiple: false,
        repeatCookie: false,
        resumeLink: false,
        captcha: false,
        captchaReg: false,
        captchaResume: false,
        embed: false,
        embedDomains: [],
      },
    })
  })

  describe('publishPrep', () => {
    test('returns a new survey instance', () => {
      const result = survey.publishPrep(defaults)

      expect(result).not.toBe(survey)
      expect(result).toBeInstanceOf(Survey)
    })

    test('applies language settings from defaults when survey language is null', () => {
      const result = survey.publishPrep(defaults)
      const languageSettings = result.getLanguage(defaults)

      expect(languageSettings.default).toBe('en')
      expect(languageSettings.options).toEqual(['en', 'fr', 'de'])
    })

    test('applies access settings from defaults when survey access is null', () => {
      const result = survey.publishPrep(defaults)
      const accessSettings = result.getAccess(defaults)

      expect(accessSettings.anonymous).toBe(true)
      expect(accessSettings.open).toBe(false)
      expect(accessSettings.publicReg).toBe(false)
      expect(accessSettings.index).toBe(false)
      expect(accessSettings.tokenPersist).toBe(true)
      expect(accessSettings.multiple).toBe(false)
      expect(accessSettings.repeatCookie).toBe(false)
      expect(accessSettings.resumeLink).toBe(false)
      expect(accessSettings.captcha).toBe(false)
      expect(accessSettings.captchaReg).toBe(false)
      expect(accessSettings.captchaResume).toBe(false)
      expect(accessSettings.embed).toBe(false)
      expect(accessSettings.embedDomains).toEqual([])
    })

    test('survey embed settings override the defaults', () => {
      const embedded = new Survey({
        _id: '3',
        title: { en: 'Test Survey' },
        createdById: '1',
        access: { embed: true, embedDomains: ['example.com'] },
      })
      const accessSettings = embedded.publishPrep(defaults).access

      expect(accessSettings.embed).toBe(true)
      expect(accessSettings.embedDomains).toEqual(['example.com'])
    })

    test('preserves existing survey settings when they are not null', () => {
      const surveyWithSettings = new Survey({
        _id: '2',
        title: { en: 'Test Survey' },
        createdById: '1',
        language: {
          default: 'fr',
          options: ['fr'],
        },
        access: {
          anonymous: false,
          open: true,
          publicReg: true,
          index: true,
          tokenPersist: false,
          multiple: true,
          repeatCookie: true,
          resumeLink: true,
          captcha: true,
          captchaReg: true,
          captchaResume: true,
        },
      })

      const result = surveyWithSettings.publishPrep(defaults)
      const languageSettings = result.getLanguage(defaults)
      const accessSettings = result.getAccess(defaults)

      expect(languageSettings.default).toBe('fr')
      expect(languageSettings.options).toEqual(['fr'])
      expect(accessSettings.anonymous).toBe(false)
      expect(accessSettings.open).toBe(true)
      expect(accessSettings.publicReg).toBe(true)
      expect(accessSettings.index).toBe(true)
      expect(accessSettings.tokenPersist).toBe(false)
      expect(accessSettings.multiple).toBe(true)
      expect(accessSettings.repeatCookie).toBe(true)
      expect(accessSettings.resumeLink).toBe(true)
      expect(accessSettings.captcha).toBe(true)
      expect(accessSettings.captchaReg).toBe(true)
      expect(accessSettings.captchaResume).toBe(true)
    })

    test('handles partial settings correctly', () => {
      const surveyWithPartialSettings = new Survey({
        _id: '3',
        title: { en: 'Test Survey' },
        createdById: '1',
        language: {
          default: 'de',
          options: null,
        },
        access: {
          anonymous: null,
          open: true,
          publicReg: null,
          index: null,
          tokenPersist: null,
          multiple: null,
          repeatCookie: null,
          resumeLink: null,
          captcha: null,
          captchaReg: null,
          captchaResume: null,
        },
      })

      const result = surveyWithPartialSettings.publishPrep(defaults)
      const languageSettings = result.getLanguage(defaults)
      const accessSettings = result.getAccess(defaults)

      expect(languageSettings.default).toBe('de')
      expect(languageSettings.options).toEqual(['en', 'fr', 'de'])
      expect(accessSettings.anonymous).toBe(true)
      expect(accessSettings.open).toBe(true)
      expect(accessSettings.publicReg).toBe(false)
      expect(accessSettings.index).toBe(false)
      expect(accessSettings.tokenPersist).toBe(true)
      expect(accessSettings.multiple).toBe(false)
      expect(accessSettings.repeatCookie).toBe(false)
      expect(accessSettings.resumeLink).toBe(false)
      expect(accessSettings.captcha).toBe(false)
      expect(accessSettings.captchaReg).toBe(false)
      expect(accessSettings.captchaResume).toBe(false)
    })
  })

  describe('getPublishPartial', () => {
    test('returns a new survey instance with empty groups and questions', () => {
      // Add some groups and questions to the survey
      const surveyWithContent = new Survey({
        _id: '1',
        title: { en: 'Test Survey' },
        createdById: '1',
        language: null,
        access: null,
        sections: [{ _id: 'group1', name: { en: 'Group 1' } }],
        elements: [{ _id: 'q1', text: { en: 'Question 1' } }],
        sectionIds: ['group1'],
        elementIds: ['q1'],
      })

      const result = surveyWithContent.getPublishPartial(defaults)

      expect(result).not.toBe(surveyWithContent)
      expect(result).toBeInstanceOf(Survey)
      expect(result.sections.groups()).toEqual([])
      expect(result.elements.questions()).toEqual([])
      expect(result.sectionIds).toEqual([])
      expect(result.elementIds).toEqual([])
    })

    test('applies publish prep settings while removing content', () => {
      const surveyWithContent = new Survey({
        _id: '1',
        title: { en: 'Test Survey' },
        createdById: '1',
        language: null,
        access: null,
        sections: [{ _id: 'group1', name: { en: 'Group 1' } }],
        elements: [{ _id: 'q1', text: { en: 'Question 1' } }],
        sectionIds: ['group1'],
        elementIds: ['q1'],
      })

      const result = surveyWithContent.getPublishPartial(defaults)
      const languageSettings = result.getLanguage(defaults)
      const accessSettings = result.getAccess(defaults)

      // Should have applied publish prep settings
      expect(languageSettings.default).toBe('en')
      expect(languageSettings.options).toEqual(['en', 'fr', 'de'])
      expect(accessSettings.anonymous).toBe(true)
      expect(accessSettings.open).toBe(false)

      // Should have empty content
      expect(result.sections.groups()).toEqual([])
      expect(result.elements.questions()).toEqual([])
      expect(result.sectionIds).toEqual([])
      expect(result.elementIds).toEqual([])
    })

    test('preserves other survey properties', () => {
      const surveyWithContent = new Survey({
        _id: '1',
        title: { en: 'Test Survey' },
        createdById: '1',
        language: null,
        access: null,
        sections: [{ _id: 'group1', name: { en: 'Group 1' } }],
        elements: [{ _id: 'q1', text: { en: 'Question 1' } }],
        sectionIds: ['group1'],
        elementIds: ['q1'],
      })

      const result = surveyWithContent.getPublishPartial(defaults)

      expect(result._id).toBe('1')
      expect(result.title).toEqual({ en: 'Test Survey' })
      expect(result.createdById).toBe('1')
    })

    test('works with survey that already has no groups or questions', () => {
      const result = survey.getPublishPartial(defaults)

      expect(result).not.toBe(survey)
      expect(result).toBeInstanceOf(Survey)
      expect(result.sections.groups()).toEqual([])
      expect(result.elements.questions()).toEqual([])
      expect(result.sectionIds).toEqual([])
      expect(result.elementIds).toEqual([])
    })
  })
})
