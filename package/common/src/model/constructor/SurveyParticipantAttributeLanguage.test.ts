import { SurveyParticipantAttributeLanguage } from './SurveyParticipantAttributeLanguage'

describe('SurveyParticipantAttributeLanguage', () => {
  describe('constructor', () => {
    it('sets all fields from data', () => {
      const createdAt = new Date('2024-01-01')
      const updatedAt = new Date('2024-01-02')
      const lang = new SurveyParticipantAttributeLanguage({
        _id: 'id1',
        surveyId: 'survey1',
        languageCode: 'fr',
        data: { department: { label: 'Department' } },
        createdAt,
        updatedAt,
      })

      expect(lang._id).toBe('id1')
      expect(lang.surveyId).toBe('survey1')
      expect(lang.languageCode).toBe('fr')
      expect(lang.data).toEqual({ department: { label: 'Department' } })
      expect(lang.createdAt).toEqual(createdAt)
      expect(lang.updatedAt).toEqual(updatedAt)
    })

    it('generates an _id when not provided', () => {
      const lang = new SurveyParticipantAttributeLanguage({
        surveyId: 's1',
        languageCode: 'en',
      })
      expect(lang._id).toBeTruthy()
    })

    it('defaults data to empty object', () => {
      const lang = new SurveyParticipantAttributeLanguage({
        surveyId: 's1',
        languageCode: 'en',
      })
      expect(lang.data).toEqual({})
    })
  })

  describe('update', () => {
    it('returns a new instance with merged data', () => {
      const original = new SurveyParticipantAttributeLanguage({
        surveyId: 's1',
        languageCode: 'en',
        data: { department: { label: 'Department' } },
      })

      const updatedAt = original.update({ languageCode: 'fr' })

      expect(updatedAt).toBeInstanceOf(SurveyParticipantAttributeLanguage)
      expect(updatedAt).not.toBe(original)
      expect(updatedAt.languageCode).toBe('fr')
      expect(updatedAt.data).toEqual({ department: { label: 'Department' } })
    })

    it('does not mutate the original instance', () => {
      const original = new SurveyParticipantAttributeLanguage({
        surveyId: 's1',
        languageCode: 'en',
      })

      original.update({ languageCode: 'fr' })

      expect(original.languageCode).toBe('en')
    })
  })
})
