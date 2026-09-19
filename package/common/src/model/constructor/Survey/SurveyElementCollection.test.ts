import {
  SurveyElementCollection,
  QUESTION_CODE_PREFIX,
} from './SurveyElementCollection'

describe('SurveyElementCollection', () => {
  const questions = [
    {
      _id: 'q1',
      surveyId: '1',
      sectionId: 'g1',
      createdById: '1',
      code: `${QUESTION_CODE_PREFIX}001`,
      text: { en: 'Question 1' },
      detail: { en: 'Question 1 description' },
    },
    {
      _id: 'q2',
      surveyId: '1',
      sectionId: 'g1',
      createdById: '1',
      code: `${QUESTION_CODE_PREFIX}002`,
      text: { en: 'Question 2' },
      detail: { en: 'Question 2 description' },
    },
    {
      _id: 'q3',
      surveyId: '1',
      sectionId: 'g2',
      createdById: '1',
      code: `${QUESTION_CODE_PREFIX}003`,
      text: { en: 'Question 3' },
      detail: { en: 'Question 3 description' },
    },
    {
      _id: 'q4',
      surveyId: '1',
      sectionId: 'g2',
      createdById: '1',
      code: `${QUESTION_CODE_PREFIX}004`,
      text: { en: 'Question 4' },
      detail: { en: 'Question 4 description' },
    },
  ]

  let collection: SurveyElementCollection

  beforeEach(() => {
    collection = new SurveyElementCollection().fromArray(questions)
  })

  test('getNextCode returns the next available code', () => {
    expect(collection.getNextCode('Q')).toBe(`${QUESTION_CODE_PREFIX}005`)
  })

  test('move relocates a question to a new group and position', () => {
    const newCollection = collection.move('q1', 'g2', 1)
    expect(newCollection[0]._id).toBe('q2')
    expect(newCollection[1]._id).toBe('q1')
    expect(newCollection[1].sectionId).toBe('g2')
  })

  test('move with newIndex greater than collection length moves question to end', () => {
    const newCollection = collection.move('q1', 'g2', 100)
    expect(newCollection[newCollection.length - 1]._id).toBe('q1')
    expect(newCollection[newCollection.length - 1].sectionId).toBe('g2')
  })

  test('move with negative newIndex moves question to start', () => {
    const newCollection = collection.move('q4', 'g1', -5)
    expect(newCollection[0]._id).toBe('q4')
    expect(newCollection[0].sectionId).toBe('g1')
  })

  test('getByGroupId returns questions for a specific group', () => {
    const groupQuestions = collection.getBySectionId('g1')
    expect(groupQuestions.length).toBe(2)
    expect(groupQuestions[0]._id).toBe('q1')
    expect(groupQuestions[1]._id).toBe('q2')
  })

  test('generates code for question if not provided', () => {
    const newCollection = collection.add(
      {
        _id: 'q5',
        surveyId: '1',
        sectionId: 'g1',
        createdById: '1',
        text: { en: 'Question 5' },
      },
      { sectionId: 'g1' },
    )

    expect(newCollection.getById('q5').code).toBe(`${QUESTION_CODE_PREFIX}005`)
  })

  test('uses provided code for question if available', () => {
    const newCollection = collection.add(
      {
        _id: 'q5',
        surveyId: '1',
        sectionId: 'g1',
        createdById: '1',
        code: `${QUESTION_CODE_PREFIX}100`,
        text: { en: 'Question 5' },
      },
      { sectionId: 'g1' },
    )

    expect(newCollection.getById('q5').code).toBe(`${QUESTION_CODE_PREFIX}100`)
  })

  test('generates sequential codes for multiple questions added without codes', () => {
    let newCollection = collection.add(
      {
        _id: 'q5',
        surveyId: '1',
        sectionId: 'g1',
        createdById: '1',
        text: { en: 'Question 5' },
      },
      { sectionId: 'g1' },
    )

    newCollection = newCollection.add(
      {
        _id: 'q6',
        surveyId: '1',
        sectionId: 'g1',
        createdById: '1',
        text: { en: 'Question 6' },
      },
      { sectionId: 'g1' },
    )

    expect(newCollection.getById('q5').code).toBe(`${QUESTION_CODE_PREFIX}005`)
    expect(newCollection.getById('q6').code).toBe(`${QUESTION_CODE_PREFIX}006`)
  })

  test('handles mix of provided and generated codes', () => {
    let newCollection = collection.add(
      {
        _id: 'q5',
        surveyId: '1',
        sectionId: 'g1',
        createdById: '1',
        code: `${QUESTION_CODE_PREFIX}100`,
        text: { en: 'Question 5' },
      },
      { sectionId: 'g1' },
    )

    newCollection = newCollection.add(
      {
        _id: 'q6',
        surveyId: '1',
        sectionId: 'g1',
        createdById: '1',
        text: { en: 'Question 6' },
      },
      { sectionId: 'g1' },
    )

    expect(newCollection.getById('q5').code).toBe(`${QUESTION_CODE_PREFIX}100`)
    expect(newCollection.getById('q6').code).toBe(`${QUESTION_CODE_PREFIX}101`)
  })

  test('add uses specified language for question text', () => {
    const newCollection = collection.add(
      {
        _id: 'q5',
        surveyId: '1',
        sectionId: 'g1',
        createdById: '1',
      },
      { lang: 'fr' },
    )

    const addedQuestion = newCollection.getById('q5')
    expect(addedQuestion.text.fr).toBeDefined()
    expect(addedQuestion.text.fr).toBe(`Question ${QUESTION_CODE_PREFIX}005`)
    expect(addedQuestion.text.en).toBeUndefined()
  })

  test('add uses default language (en) when lang option is not provided', () => {
    const newCollection = collection.add({
      _id: 'q5',
      surveyId: '1',
      sectionId: 'g1',
      createdById: '1',
    })

    const addedQuestion = newCollection.getById('q5')
    expect(addedQuestion.text.en).toBeDefined()
    expect(addedQuestion.text.en).toBe(`Question ${QUESTION_CODE_PREFIX}005`)
  })

  test('sortByGroupIds sorts questions by provided group order', () => {
    const sortedCollection = collection.sortBySectionIds(['g2', 'g1'])
    expect(sortedCollection[0]._id).toBe('q3')
    expect(sortedCollection[0].sectionId).toBe('g2')
    expect(sortedCollection[1]._id).toBe('q4')
    expect(sortedCollection[1].sectionId).toBe('g2')
    expect(sortedCollection[2]._id).toBe('q1')
    expect(sortedCollection[2].sectionId).toBe('g1')
    expect(sortedCollection[3]._id).toBe('q2')
    expect(sortedCollection[3].sectionId).toBe('g1')
  })

  test('sortByGroupIds handles questions with groupIds not in the order array', () => {
    const questionsWithExtraGroup = [
      ...questions,
      {
        _id: 'q5',
        surveyId: '1',
        sectionId: 'g3',
        createdById: '1',
        code: `${QUESTION_CODE_PREFIX}005`,
        text: { en: 'Question 5' },
        detail: { en: 'Question 5 description' },
      },
    ]
    const collectionWithExtra = new SurveyElementCollection().fromArray(
      questionsWithExtraGroup,
    )

    const sortedCollection = collectionWithExtra.sortBySectionIds(['g2', 'g1'])
    expect(sortedCollection[0].sectionId).toBe('g2')
    expect(sortedCollection[1].sectionId).toBe('g2')
    expect(sortedCollection[2].sectionId).toBe('g1')
    expect(sortedCollection[3].sectionId).toBe('g1')
    expect(sortedCollection[4].sectionId).toBe('g3')
  })

  test('sortByGroupIds returns new collection instance', () => {
    const sortedCollection = collection.sortBySectionIds(['g2', 'g1'])
    expect(sortedCollection).not.toBe(collection)
    expect(sortedCollection).toBeInstanceOf(SurveyElementCollection)
  })

  test('sortByGroupIds handles empty groupIds array', () => {
    const sortedCollection = collection.sortBySectionIds([])
    expect(sortedCollection.length).toBe(4)
    expect(sortedCollection[0]._id).toBe('q1')
    expect(sortedCollection[1]._id).toBe('q2')
    expect(sortedCollection[2]._id).toBe('q3')
    expect(sortedCollection[3]._id).toBe('q4')
  })

  test('throws error when adding question with duplicate code', () => {
    expect(() => {
      collection.add({
        _id: 'q5',
        surveyId: '1',
        sectionId: 'g1',
        createdById: '1',
        code: `${QUESTION_CODE_PREFIX}001`,
        text: { en: 'Question 5' },
      })
    }).toThrow('Question with code "Q001" already exists')
  })

  test('throws error when adding question with duplicate code (auto-generated conflict)', () => {
    const duplicateCode = `${QUESTION_CODE_PREFIX}005`

    // First, add a question with code Q005
    const newCollection = collection.add({
      _id: 'q5',
      surveyId: '1',
      sectionId: 'g1',
      createdById: '1',
      code: duplicateCode,
      text: { en: 'Question 5' },
    })

    // Then try to add another question with the same code
    expect(() => {
      newCollection.add({
        _id: 'q6',
        surveyId: '1',
        sectionId: 'g1',
        createdById: '1',
        code: duplicateCode,
        text: { en: 'Question 6' },
      })
    }).toThrow(`Question with code "${duplicateCode}" already exists`)
  })
})
