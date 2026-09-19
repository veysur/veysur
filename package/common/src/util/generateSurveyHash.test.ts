// cspell:disable
import {
  generateSurveyHash,
  generateSurveyStructuralHash,
  generateSurveyLanguageHash,
  generateSnapshotContentHash,
} from './generateSurveyHash'
import { Survey } from '../model/constructor/Survey'
import { SettingSurvey } from '../model/constructor/SettingSurvey'
import { SurveyLanguage } from '../model/constructor/SurveyLanguage'

describe('generateSurveyStructuralHash (alias generateSurveyHash)', () => {
  const settingSurvey = new SettingSurvey({
    language: { default: 'en', options: ['en'] },
  })

  const createMinimalSurvey = (overrides = {}) => {
    return new Survey({
      _id: 'survey-1',
      name: 'Test Survey',
      createdById: 'user-1',
      title: {},
      attributes: {},
      elements: [],
      sections: [],
      elementIds: [],
      sectionIds: [],
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      ...overrides,
    })
  }

  test('generates identical hash for identical surveys', () => {
    const survey1 = createMinimalSurvey({
      elements: [{ _id: 'q1', text: {}, type: 'text' }],
      elementIds: ['q1'],
    })
    const survey2 = createMinimalSurvey({
      elements: [{ _id: 'q1', text: {}, type: 'text' }],
      elementIds: ['q1'],
    })

    expect(generateSurveyHash(survey1, settingSurvey)).toBe(
      generateSurveyHash(survey2, settingSurvey),
    )
    expect(generateSurveyHash(survey1, settingSurvey)).toHaveLength(64)
  })

  test('is the same as generateSurveyStructuralHash', () => {
    const survey = createMinimalSurvey()
    expect(generateSurveyHash(survey, settingSurvey)).toBe(
      generateSurveyStructuralHash(survey, settingSurvey),
    )
  })

  test('produces the same hash for surveys that differ only in L10n text', () => {
    const survey1 = createMinimalSurvey({
      elements: [{ _id: 'q1', text: { en: 'Hello' }, type: 'text' }],
      elementIds: ['q1'],
    })
    const survey2 = createMinimalSurvey({
      elements: [{ _id: 'q1', text: { en: 'Bonjour' }, type: 'text' }],
      elementIds: ['q1'],
    })

    expect(generateSurveyStructuralHash(survey1, settingSurvey)).toBe(
      generateSurveyStructuralHash(survey2, settingSurvey),
    )
  })

  test('ignores metadata fields (name field)', () => {
    const survey1 = createMinimalSurvey({
      name: 'Survey A',
      elements: [{ _id: 'q1', text: {}, type: 'text' }],
      elementIds: ['q1'],
    })
    const survey2 = createMinimalSurvey({
      name: 'Survey B',
      elements: [{ _id: 'q1', text: {}, type: 'text' }],
      elementIds: ['q1'],
    })

    expect(generateSurveyHash(survey1, settingSurvey)).toBe(
      generateSurveyHash(survey2, settingSurvey),
    )
  })

  test('publishPrep is idempotent for hashing', () => {
    const survey = createMinimalSurvey({
      elements: [{ _id: 'q1', text: {}, type: 'text' }],
      elementIds: ['q1'],
    })
    const normalized = survey.publishPrep(settingSurvey)
    expect(generateSurveyHash(survey, settingSurvey)).toBe(
      generateSurveyHash(normalized, settingSurvey),
    )
  })

  test('detects question addition (structural change)', () => {
    const survey1 = createMinimalSurvey({
      elements: [{ _id: 'q1', text: {}, type: 'text' }],
      elementIds: ['q1'],
    })
    const survey2 = createMinimalSurvey({
      elements: [
        { _id: 'q1', text: {}, type: 'text' },
        { _id: 'q2', text: {}, type: 'text' },
      ],
      elementIds: ['q1', 'q2'],
    })

    expect(generateSurveyHash(survey1, settingSurvey)).not.toBe(
      generateSurveyHash(survey2, settingSurvey),
    )
  })

  test('detects question type change (structural change)', () => {
    const survey1 = createMinimalSurvey({
      elements: [{ _id: 'q1', text: {}, type: 'text' }],
      elementIds: ['q1'],
    })
    const survey2 = createMinimalSurvey({
      elements: [{ _id: 'q1', text: {}, type: 'radio' }],
      elementIds: ['q1'],
    })

    expect(generateSurveyHash(survey1, settingSurvey)).not.toBe(
      generateSurveyHash(survey2, settingSurvey),
    )
  })

  test('hash is deterministic and repeatable', () => {
    const survey = createMinimalSurvey({
      elements: [{ _id: 'q1', text: {}, type: 'text' }],
      elementIds: ['q1'],
    })
    const h1 = generateSurveyHash(survey, settingSurvey)
    const h2 = generateSurveyHash(survey, settingSurvey)
    const h3 = generateSurveyHash(survey, settingSurvey)
    expect(h1).toBe(h2)
    expect(h2).toBe(h3)
  })
})

describe('generateSurveyLanguageHash', () => {
  const makeLang = (data: SurveyLanguage['data']): SurveyLanguage =>
    new SurveyLanguage({
      surveyId: 's1',
      languageCode: 'en',
      data,
    })

  test('produces a 64-char hex hash', () => {
    const hash = generateSurveyLanguageHash(makeLang({ title: 'Hello' }))
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]+$/)
  })

  test('same text → same hash', () => {
    const a = generateSurveyLanguageHash(makeLang({ title: 'Hello' }))
    const b = generateSurveyLanguageHash(makeLang({ title: 'Hello' }))
    expect(a).toBe(b)
  })

  test('different text → different hash', () => {
    const a = generateSurveyLanguageHash(makeLang({ title: 'Hello' }))
    const b = generateSurveyLanguageHash(makeLang({ title: 'Bonjour' }))
    expect(a).not.toBe(b)
  })

  test('empty text → deterministic hash', () => {
    const a = generateSurveyLanguageHash(makeLang({}))
    const b = generateSurveyLanguageHash(makeLang({}))
    expect(a).toBe(b)
  })
})

describe('generateSnapshotContentHash', () => {
  test('produces a 64-char hex hash', () => {
    const hash = generateSnapshotContentHash('a'.repeat(64), ['b'.repeat(64)])
    expect(hash).toHaveLength(64)
  })

  test('same inputs → same hash', () => {
    const a = generateSnapshotContentHash('a'.repeat(64), [
      'b'.repeat(64),
      'c'.repeat(64),
    ])
    const b = generateSnapshotContentHash('a'.repeat(64), [
      'b'.repeat(64),
      'c'.repeat(64),
    ])
    expect(a).toBe(b)
  })

  test('different language hashes → different composite hash', () => {
    const a = generateSnapshotContentHash('a'.repeat(64), ['b'.repeat(64)])
    const b = generateSnapshotContentHash('a'.repeat(64), ['c'.repeat(64)])
    expect(a).not.toBe(b)
  })

  test('different structural hash → different composite hash', () => {
    const a = generateSnapshotContentHash('a'.repeat(64), ['b'.repeat(64)])
    const b = generateSnapshotContentHash('x'.repeat(64), ['b'.repeat(64)])
    expect(a).not.toBe(b)
  })

  test('no language hashes → deterministic hash', () => {
    const a = generateSnapshotContentHash('a'.repeat(64), [])
    const b = generateSnapshotContentHash('a'.repeat(64), [])
    expect(a).toBe(b)
  })
})
