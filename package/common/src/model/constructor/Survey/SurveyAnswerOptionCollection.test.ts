import {
  SurveyAnswerOptionCollection,
  ANSWER_CODE_PREFIX,
} from './SurveyAnswerOptionCollection'

describe('SurveyAnswerOptionCollection', () => {
  let collection: SurveyAnswerOptionCollection

  beforeEach(() => {
    collection = new SurveyAnswerOptionCollection()
      .add({ _id: 'a1', code: 'A001', label: { en: 'Answer 1' } })
      .add({ _id: 'a2', code: 'A002', label: { en: 'Answer 2' } })
      .add({ _id: 'a3', code: 'A003', label: { en: 'Answer 3' } })
  })

  test('fromArray creates a collection from an array of answers', () => {
    const data = [
      { _id: 'a4', code: 'A004', label: { en: 'Answer 4' } },
      { _id: 'a5', code: 'A005', label: { en: 'Answer 5' } },
    ]
    const newCollection = collection.fromArray(data)
    expect(newCollection.length).toBe(2)
    expect(newCollection.getById('a4').label.en).toBe('Answer 4')
    expect(newCollection.getById('a5').label.en).toBe('Answer 5')
  })

  test('getNextCode returns the next available code', () => {
    expect(collection.getNextCode(ANSWER_CODE_PREFIX)).toBe('A004')
  })

  test('add appends a new answer to the collection', () => {
    const newCollection = collection.add({ label: { en: 'New Answer' } })
    expect(newCollection.length).toBe(4)
    expect(newCollection.last().label.en).toBe('New Answer')
    expect(newCollection.last().code).toBe('A004')
  })

  test('add inserts a new answer after specified answer', () => {
    const newCollection = collection.add(
      { label: { en: 'New Answer' } },
      { afterId: 'a2' },
    )
    expect(newCollection.length).toBe(4)
    expect(newCollection.getById('a2').label.en).toBe('Answer 2')
    expect(newCollection[2].label.en).toBe('New Answer')
    expect(newCollection[2].code).toBe('A004')
    expect(newCollection.getById('a3').label.en).toBe('Answer 3')
  })

  test('move relocates an answer to a new position', () => {
    const newCollection = collection.move('a1', 2)
    expect(newCollection[0].label.en).toBe('Answer 2')
    expect(newCollection[1].label.en).toBe('Answer 3')
    expect(newCollection[2].label.en).toBe('Answer 1')
  })

  test('throws error when adding answer option with duplicate code', () => {
    expect(() => {
      collection.add({
        _id: 'a4',
        code: 'A001',
        label: { en: 'Answer 4' },
      })
    }).toThrow('Answer option with code "A001" already exists')
  })

  test('throws error when adding answer option with duplicate code (auto-generated conflict)', () => {
    const duplicateCode = `${ANSWER_CODE_PREFIX}005`

    const newCollection = collection.add({
      _id: 'a4',
      code: duplicateCode,
      label: { en: 'Answer 4' },
    })

    expect(() => {
      newCollection.add({
        _id: 'a5',
        code: duplicateCode,
        label: { en: 'Answer 5' },
      })
    }).toThrow(`Answer option with code "${duplicateCode}" already exists`)
  })
})
