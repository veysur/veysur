// cspell:disable
import { SurveyLanguage } from './SurveyLanguage'

describe('SurveyLanguage', () => {
  describe('constructor', () => {
    it('sets all fields from data', () => {
      const createdAt = new Date('2024-01-01')
      const updatedAt = new Date('2024-01-02')
      const lang = new SurveyLanguage({
        _id: 'id1',
        surveyId: 'survey1',
        languageCode: 'fr',
        data: { title: 'Bonjour' },
        createdAt,
        updatedAt,
      })

      expect(lang._id).toBe('id1')
      expect(lang.surveyId).toBe('survey1')
      expect(lang.languageCode).toBe('fr')
      expect(lang.data).toEqual({ title: 'Bonjour' })
      expect(lang.createdAt).toEqual(createdAt)
      expect(lang.updatedAt).toEqual(updatedAt)
    })

    it('generates an _id when not provided', () => {
      const lang = new SurveyLanguage({
        surveyId: 's1',
        languageCode: 'en',
      })
      expect(lang._id).toBeTruthy()
    })

    it('defaults data to empty object', () => {
      const lang = new SurveyLanguage({
        surveyId: 's1',
        languageCode: 'en',
      })
      expect(lang.data).toEqual({})
    })

    it('defaults createdAt and updatedAt to now when not provided', () => {
      const before = new Date()
      const lang = new SurveyLanguage({
        surveyId: 's1',
        languageCode: 'en',
      })
      const after = new Date()
      expect(lang.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(lang.createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('update', () => {
    it('returns a new instance with merged data', () => {
      const original = new SurveyLanguage({
        surveyId: 's1',
        languageCode: 'en',
        data: { title: 'Hello' },
      })

      const updatedAt = original.update({ languageCode: 'fr' })

      expect(updatedAt).toBeInstanceOf(SurveyLanguage)
      expect(updatedAt).not.toBe(original)
      expect(updatedAt.languageCode).toBe('fr')
      expect(updatedAt.surveyId).toBe('s1')
    })

    it('does not mutate the original instance', () => {
      const original = new SurveyLanguage({
        surveyId: 's1',
        languageCode: 'en',
        data: { title: 'Hello' },
      })

      original.update({ languageCode: 'fr' })

      expect(original.languageCode).toBe('en')
    })

    it('replaces data wholesale when data is provided', () => {
      const original = new SurveyLanguage({
        surveyId: 's1',
        languageCode: 'en',
        data: { title: 'Hello', welcomeMessage: 'Welcome' },
      })

      const updatedAt = original.update({ data: { title: 'Hi' } })

      expect(updatedAt.data).toEqual({ title: 'Hi' })
      expect(updatedAt.data.welcomeMessage).toBeUndefined()
    })
  })
})
