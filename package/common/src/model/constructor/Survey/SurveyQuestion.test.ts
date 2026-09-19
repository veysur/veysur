// cspell:disable
import { SurveyQuestion } from './SurveyQuestion'

describe('SurveyQuestion', () => {
  let question: SurveyQuestion

  beforeEach(() => {
    question = new SurveyQuestion({
      _id: '1',
      surveyId: 'survey1',
      createdById: 'user1',
      type: 'radio',
      code: '',
      text: { en: 'Sample question' },
      detail: { en: 'Sample description' },
      sectionId: 'group1',
      attributes: { required: 1 },
    })
  })

  test('constructor initializes with correct values', () => {
    expect(question._id).toBe('1')
    expect(question.surveyId).toBe('survey1')
    expect(question.createdById).toBe('user1')
    expect(question.type).toBe('radio')
    expect(question.code).toBe('')
    expect(question.text.en).toBe('Sample question')
    expect(question.detail.en).toBe('Sample description')
    expect(question.sectionId).toBe('group1')
    expect(question.attributes).toEqual({
      required: 1,
    })
    expect(question.createdAt).toBeInstanceOf(Date)
    expect(question.updatedAt).toBeInstanceOf(Date)
  })

  describe('updateText', () => {
    test('returns a new instance with updatedAt text', () => {
      const updatedQuestion = question.updateText('New question text')
      expect(updatedQuestion).not.toBe(question)
      expect(updatedQuestion.text.en).toBe('New question text')
      expect(question.text.en).toBe('Sample question')
    })

    test('updates text in the default language', () => {
      const question = new SurveyQuestion({
        _id: '1',
        surveyId: '1',
        createdById: '1',
        type: 'text',
        code: 'Q1',
        text: { en: 'Original Question Text' },
      })

      const updatedQuestion = question.updateText('New Question Text')

      expect(updatedQuestion).not.toBe(question)
      expect(updatedQuestion.text.en).toBe('New Question Text')
      expect(question.text.en).toBe('Original Question Text')
    })

    test('updates text in a specified language', () => {
      const question = new SurveyQuestion({
        _id: '1',
        surveyId: '1',
        createdById: '1',
        type: 'text',
        code: 'Q1',
        text: {
          en: 'Original Question Text',
          fr: 'Texte de Question Original',
        },
      })

      const updatedQuestion = question.updateText(
        'Nouveau Texte de Question',
        'fr',
      )

      expect(updatedQuestion).not.toBe(question)
      expect(updatedQuestion.text.en).toBe('Original Question Text')
      expect(updatedQuestion.text.fr).toBe('Nouveau Texte de Question')
      expect(question.text.fr).toBe('Texte de Question Original')
    })

    test('adds a new language when updating text', () => {
      const question = new SurveyQuestion({
        _id: '1',
        surveyId: '1',
        createdById: '1',
        type: 'text',
        code: 'Q1',
        text: { en: 'Original Question Text' },
      })

      const updatedQuestion = question.updateText('Texto de la Pregunta', 'esp')

      expect(updatedQuestion).not.toBe(question)
      expect(updatedQuestion.text.en).toBe('Original Question Text')
      expect(updatedQuestion.text.esp).toBe('Texto de la Pregunta')
      expect(question.text.esp).toBeUndefined()
    })
  })

  describe('updateDetail', () => {
    test('returns a new instance with updatedAt detail', () => {
      const updatedQuestion = question.updateDetail('New description')
      expect(updatedQuestion).not.toBe(question)
      expect(updatedQuestion.detail.en).toBe('New description')
      expect(question.detail.en).toBe('Sample description')
    })

    test('updates detail in the default language', () => {
      const question = new SurveyQuestion({
        _id: '1',
        surveyId: '1',
        createdById: '1',
        type: 'text',
        code: 'Q1',
        text: { en: 'Question Text' },
        detail: { en: 'Original Description' },
      })

      const updatedQuestion = question.updateDetail('New Description')

      expect(updatedQuestion).not.toBe(question)
      expect(updatedQuestion.detail.en).toBe('New Description')
      expect(question.detail.en).toBe('Original Description')
    })

    test('updates detail in a specified language', () => {
      const question = new SurveyQuestion({
        _id: '1',
        surveyId: '1',
        createdById: '1',
        type: 'text',
        code: 'Q1',
        text: { en: 'Question Text' },
        detail: { en: 'Original Description', fr: 'Description Originale' },
      })

      const updatedQuestion = question.updateDetail(
        'Nouvelle Description',
        'fr',
      )

      expect(updatedQuestion).not.toBe(question)
      expect(updatedQuestion.detail.en).toBe('Original Description')
      expect(updatedQuestion.detail.fr).toBe('Nouvelle Description')
      expect(question.detail.fr).toBe('Description Originale')
    })

    test('adds a new language when updating detail', () => {
      const question = new SurveyQuestion({
        _id: '1',
        surveyId: '1',
        createdById: '1',
        type: 'text',
        code: 'Q1',
        text: { en: 'Question Text' },
        detail: { en: 'Original Description' },
      })

      const updatedQuestion = question.updateDetail(
        'Descripción de la Pregunta',
        'esp',
      )

      expect(updatedQuestion).not.toBe(question)
      expect(updatedQuestion.detail.en).toBe('Original Description')
      expect(updatedQuestion.detail.esp).toBe('Descripción de la Pregunta')
      expect(question.detail.esp).toBeUndefined()
    })

    test('keeps an emptied default-language detail as an empty string', () => {
      const question = new SurveyQuestion({
        _id: '1',
        surveyId: '1',
        createdById: '1',
        type: 'text',
        code: 'Q1',
        text: { en: 'Question Text' },
        detail: { en: 'Original Description' },
      })

      const updatedQuestion = question.updateDetail('', 'en', 'en')

      expect(updatedQuestion.detail.en).toBe('')
    })

    test('unsets an emptied non-default-language detail', () => {
      const question = new SurveyQuestion({
        _id: '1',
        surveyId: '1',
        createdById: '1',
        type: 'text',
        code: 'Q1',
        text: { en: 'Question Text' },
        detail: { en: 'Original Description', fr: 'Description Originale' },
      })

      const updatedQuestion = question.updateDetail('', 'fr', 'en')

      expect(updatedQuestion.detail.fr).toBeUndefined()
      expect(updatedQuestion.detail.en).toBe('Original Description')
    })

    test('initializes L10n when detail is null', () => {
      const question = new SurveyQuestion({
        _id: '1',
        surveyId: '1',
        createdById: '1',
        type: 'text',
        code: 'Q1',
        text: { en: 'Question Text' },
        detail: null,
      })

      expect(question.detail).toBeNull()

      const updatedQuestion = question.updateDetail('New Description')

      expect(updatedQuestion).not.toBe(question)
      expect(updatedQuestion.detail).not.toBeNull()
      expect(updatedQuestion.detail.en).toBe('New Description')
      expect(question.detail).toBeNull()
    })

    test('initializes L10n with specified language when detail is null', () => {
      const question = new SurveyQuestion({
        _id: '1',
        surveyId: '1',
        createdById: '1',
        type: 'text',
        code: 'Q1',
        text: { en: 'Question Text' },
        detail: null,
      })

      const updatedQuestion = question.updateDetail(
        'Descripción de la Pregunta',
        'esp',
      )

      expect(updatedQuestion).not.toBe(question)
      expect(updatedQuestion.detail).not.toBeNull()
      expect(updatedQuestion.detail.esp).toBe('Descripción de la Pregunta')
      expect(question.detail).toBeNull()
    })
  })

  describe('deleteDetail', () => {
    test('sets detail to null', () => {
      const question = new SurveyQuestion({
        _id: '1',
        surveyId: '1',
        createdById: '1',
        type: 'text',
        code: 'Q1',
        text: { en: 'Question Text' },
        detail: { en: 'Original Description' },
      })

      expect(question.detail).not.toBeNull()
      expect(question.detail.en).toBe('Original Description')

      const updatedQuestion = question.deleteDetail()

      expect(updatedQuestion).not.toBe(question)
      expect(updatedQuestion.detail).toBeNull()
      expect(question.detail.en).toBe('Original Description')
    })

    test('returns new instance when detail is already null', () => {
      const question = new SurveyQuestion({
        _id: '1',
        surveyId: '1',
        createdById: '1',
        type: 'text',
        code: 'Q1',
        text: { en: 'Question Text' },
        detail: null,
      })

      expect(question.detail).toBeNull()

      const updatedQuestion = question.deleteDetail()

      expect(updatedQuestion).not.toBe(question)
      expect(updatedQuestion.detail).toBeNull()
    })
  })

  describe('constructor with null detail', () => {
    test('initializes with null detail when not provided', () => {
      const question = new SurveyQuestion({
        _id: '1',
        surveyId: '1',
        createdById: '1',
        type: 'text',
        code: 'Q1',
        text: { en: 'Question Text' },
      })

      expect(question.detail).toBeNull()
    })

    test('initializes with null detail when explicitly set to null', () => {
      const question = new SurveyQuestion({
        _id: '1',
        surveyId: '1',
        createdById: '1',
        type: 'text',
        code: 'Q1',
        text: { en: 'Question Text' },
        detail: null,
      })

      expect(question.detail).toBeNull()
    })
  })

  test('updateGroupId returns a new instance with updatedAt groupId', () => {
    const updatedQuestion = question.updateSectionId('newGroup')
    expect(updatedQuestion).not.toBe(question)
    expect(updatedQuestion.sectionId).toBe('newGroup')
    expect(question.sectionId).toBe('group1')
  })

  test('setAttribute adds or updates an attribute', () => {
    const updatedQuestion = question.setAttribute('newKey', 'newValue')
    expect(updatedQuestion).not.toBe(question)
    expect(updatedQuestion.attributes.newKey).toBe('newValue')
    expect(question.attributes.newKey).toBeUndefined()

    const updatedAgain = updatedQuestion.setAttribute('type', 'checkbox')
    expect(updatedAgain.attributes.type).toBe('checkbox')
  })

  test('deleteAttribute removes an attribute sets it back to default', () => {
    expect(question.attributes.required).toBe(1)
    const updatedQuestion = question.deleteAttribute('required')
    expect(updatedQuestion).not.toBe(question)
    expect(updatedQuestion.attributes.required).toBe(1)
  })

  test('deleteAttribute removes if not default', () => {
    let updatedQuestion = question.setAttribute('other', 'foobar')
    expect(updatedQuestion.attributes.other).toBe('foobar')
    updatedQuestion = updatedQuestion.deleteAttribute('other')
    expect(updatedQuestion.attributes.other).toBeUndefined()
  })
})
