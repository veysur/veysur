// cspell:disable
import { SurveySubquestion } from './SurveySubquestion'

describe('SurveySubquestion', () => {
  let subquestion: SurveySubquestion

  beforeEach(() => {
    subquestion = new SurveySubquestion({
      _id: '1',
      type: 'text',
      code: 'SQ1',
      text: { en: 'Sample subquestion' },
      detail: { en: 'Sample description' },
    })
  })

  test('constructor initializes with correct values', () => {
    expect(subquestion._id).toBe('1')
    expect(subquestion.type).toBe('text')
    expect(subquestion.code).toBe('SQ1')
    expect(subquestion.text.en).toBe('Sample subquestion')
    expect(subquestion.detail.en).toBe('Sample description')
    expect(subquestion.createdAt).toBeInstanceOf(Date)
    expect(subquestion.updatedAt).toBeInstanceOf(Date)
  })

  describe('updateText', () => {
    test('returns a new instance with updatedAt text', () => {
      const updatedSubquestion = subquestion.updateText('New subquestion text')
      expect(updatedSubquestion).not.toBe(subquestion)
      expect(updatedSubquestion.text.en).toBe('New subquestion text')
      expect(subquestion.text.en).toBe('Sample subquestion')
    })

    test('updates text in the default language', () => {
      const subquestion = new SurveySubquestion({
        _id: '1',
        type: 'text',
        code: 'SQ1',
        text: { en: 'Original Subquestion Text' },
      })

      const updatedSubquestion = subquestion.updateText('New Subquestion Text')

      expect(updatedSubquestion).not.toBe(subquestion)
      expect(updatedSubquestion.text.en).toBe('New Subquestion Text')
      expect(subquestion.text.en).toBe('Original Subquestion Text')
    })

    test('keeps an emptied default language as an empty string', () => {
      const sq = new SurveySubquestion({
        _id: '1',
        text: { en: 'Original', fr: 'Origine' },
      })
      const updated = sq.updateText('', 'en', 'en')
      expect(updated.text.en).toBe('')
      expect(updated.text.fr).toBe('Origine')
    })

    test('unsets an emptied secondary language', () => {
      const sq = new SurveySubquestion({
        _id: '1',
        text: { en: 'Original', fr: 'Origine' },
      })
      const updated = sq.updateText('', 'fr', 'en')
      expect('fr' in updated.text).toBe(false)
      expect(updated.text.en).toBe('Original')
    })

    test('updates text in a specified language', () => {
      const subquestion = new SurveySubquestion({
        _id: '1',
        type: 'text',
        code: 'SQ1',
        text: {
          en: 'Original Subquestion Text',
          fr: 'Texte de Sous-question Original',
        },
      })

      const updatedSubquestion = subquestion.updateText(
        'Nouveau Texte de Sous-question',
        'fr',
      )

      expect(updatedSubquestion).not.toBe(subquestion)
      expect(updatedSubquestion.text.en).toBe('Original Subquestion Text')
      expect(updatedSubquestion.text.fr).toBe('Nouveau Texte de Sous-question')
      expect(subquestion.text.fr).toBe('Texte de Sous-question Original')
    })

    test('adds a new language when updating text', () => {
      const subquestion = new SurveySubquestion({
        _id: '1',
        type: 'text',
        code: 'SQ1',
        text: { en: 'Original Subquestion Text' },
      })

      const updatedSubquestion = subquestion.updateText(
        'Texto de la Subpregunta',
        'esp',
      )

      expect(updatedSubquestion).not.toBe(subquestion)
      expect(updatedSubquestion.text.en).toBe('Original Subquestion Text')
      expect(updatedSubquestion.text.esp).toBe('Texto de la Subpregunta')
      expect(subquestion.text.esp).toBeUndefined()
    })
  })

  describe('updateDetail', () => {
    test('returns a new instance with updatedAt detail', () => {
      const updatedSubquestion = subquestion.updateDetail('New description')
      expect(updatedSubquestion).not.toBe(subquestion)
      expect(updatedSubquestion.detail.en).toBe('New description')
      expect(subquestion.detail.en).toBe('Sample description')
    })

    test('updates description in the default language', () => {
      const subquestion = new SurveySubquestion({
        _id: '1',
        type: 'text',
        code: 'SQ1',
        text: { en: 'Subquestion Text' },
        detail: { en: 'Original Description' },
      })

      const updatedSubquestion = subquestion.updateDetail('New Description')

      expect(updatedSubquestion).not.toBe(subquestion)
      expect(updatedSubquestion.detail.en).toBe('New Description')
      expect(subquestion.detail.en).toBe('Original Description')
    })

    test('updates description in a specified language', () => {
      const subquestion = new SurveySubquestion({
        _id: '1',
        type: 'text',
        code: 'SQ1',
        text: { en: 'Subquestion Text' },
        detail: { en: 'Original Description', fr: 'Description Originale' },
      })

      const updatedSubquestion = subquestion.updateDetail(
        'Nouvelle Description',
        'fr',
      )

      expect(updatedSubquestion).not.toBe(subquestion)
      expect(updatedSubquestion.detail.en).toBe('Original Description')
      expect(updatedSubquestion.detail.fr).toBe('Nouvelle Description')
      expect(subquestion.detail.fr).toBe('Description Originale')
    })

    test('adds a new language when updating description', () => {
      const subquestion = new SurveySubquestion({
        _id: '1',
        type: 'text',
        code: 'SQ1',
        text: { en: 'Subquestion Text' },
        detail: { en: 'Original Description' },
      })

      const updatedSubquestion = subquestion.updateDetail(
        'Descripción de la Subpregunta',
        'esp',
      )

      expect(updatedSubquestion).not.toBe(subquestion)
      expect(updatedSubquestion.detail.en).toBe('Original Description')
      expect(updatedSubquestion.detail.esp).toBe(
        'Descripción de la Subpregunta',
      )
      expect(subquestion.detail.esp).toBeUndefined()
    })

    test('initializes L10n when detail is null', () => {
      const subquestion = new SurveySubquestion({
        _id: '1',
        type: 'text',
        code: 'SQ1',
        text: { en: 'Subquestion Text' },
        detail: null,
      })

      expect(subquestion.detail).toBeNull()

      const updatedSubquestion = subquestion.updateDetail('New Description')

      expect(updatedSubquestion).not.toBe(subquestion)
      expect(updatedSubquestion.detail).not.toBeNull()
      expect(updatedSubquestion.detail.en).toBe('New Description')
      expect(subquestion.detail).toBeNull()
    })

    test('initializes L10n with specified language when detail is null', () => {
      const subquestion = new SurveySubquestion({
        _id: '1',
        type: 'text',
        code: 'SQ1',
        text: { en: 'Subquestion Text' },
        detail: null,
      })

      const updatedSubquestion = subquestion.updateDetail(
        'Descripción de la Subpregunta',
        'esp',
      )

      expect(updatedSubquestion).not.toBe(subquestion)
      expect(updatedSubquestion.detail).not.toBeNull()
      expect(updatedSubquestion.detail.esp).toBe(
        'Descripción de la Subpregunta',
      )
      expect(subquestion.detail).toBeNull()
    })
  })

  describe('deleteDetail', () => {
    test('sets detail to null', () => {
      const subquestion = new SurveySubquestion({
        _id: '1',
        type: 'text',
        code: 'SQ1',
        text: { en: 'Subquestion Text' },
        detail: { en: 'Original Description' },
      })

      expect(subquestion.detail).not.toBeNull()
      expect(subquestion.detail.en).toBe('Original Description')

      const updatedSubquestion = subquestion.deleteDetail()

      expect(updatedSubquestion).not.toBe(subquestion)
      expect(updatedSubquestion.detail).toBeNull()
      expect(subquestion.detail.en).toBe('Original Description')
    })

    test('returns new instance when detail is already null', () => {
      const subquestion = new SurveySubquestion({
        _id: '1',
        type: 'text',
        code: 'SQ1',
        text: { en: 'Subquestion Text' },
        detail: null,
      })

      expect(subquestion.detail).toBeNull()

      const updatedSubquestion = subquestion.deleteDetail()

      expect(updatedSubquestion).not.toBe(subquestion)
      expect(updatedSubquestion.detail).toBeNull()
    })
  })

  describe('constructor with null detail', () => {
    test('initializes with null detail when not provided', () => {
      const subquestion = new SurveySubquestion({
        _id: '1',
        type: 'text',
        code: 'SQ1',
        text: { en: 'Subquestion Text' },
      })

      expect(subquestion.detail).toBeNull()
    })

    test('initializes with null detail when explicitly set to null', () => {
      const subquestion = new SurveySubquestion({
        _id: '1',
        type: 'text',
        code: 'SQ1',
        text: { en: 'Subquestion Text' },
        detail: null,
      })

      expect(subquestion.detail).toBeNull()
    })
  })
})
