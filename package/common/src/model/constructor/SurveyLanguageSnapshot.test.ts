// cspell:disable
import { SurveyLanguageSnapshot } from './SurveyLanguageSnapshot'

describe('SurveyLanguageSnapshot', () => {
  describe('constructor', () => {
    it('sets all fields from data', () => {
      const createdAt = new Date('2024-01-01')
      const updatedAt = new Date('2024-01-02')
      const hash = 'a'.repeat(64)
      const snapshot = new SurveyLanguageSnapshot({
        _id: 'id1',
        snapshotId: 'snap1',
        surveyId: 'survey1',
        languageCode: 'fr',
        contentHash: hash,
        data: { title: 'Bonjour' },
        createdAt,
        updatedAt,
      })

      expect(snapshot._id).toBe('id1')
      expect(snapshot.snapshotId).toBe('snap1')
      expect(snapshot.surveyId).toBe('survey1')
      expect(snapshot.languageCode).toBe('fr')
      expect(snapshot.contentHash).toBe(hash)
      expect(snapshot.data).toEqual({ title: 'Bonjour' })
      expect(snapshot.createdAt).toEqual(createdAt)
      expect(snapshot.updatedAt).toEqual(updatedAt)
    })

    it('generates an _id when not provided', () => {
      const snapshot = new SurveyLanguageSnapshot({
        snapshotId: 'snap1',
        surveyId: 's1',
        languageCode: 'en',
        contentHash: 'b'.repeat(64),
      })
      expect(snapshot._id).toBeTruthy()
    })

    it('defaults data to empty object', () => {
      const snapshot = new SurveyLanguageSnapshot({
        snapshotId: 'snap1',
        surveyId: 's1',
        languageCode: 'en',
        contentHash: 'c'.repeat(64),
      })
      expect(snapshot.data).toEqual({})
    })
  })
})
