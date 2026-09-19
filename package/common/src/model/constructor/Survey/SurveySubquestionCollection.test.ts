import {
  SurveySubquestionCollection,
  SUBQUESTION_CODE_PREFIX,
} from './SurveySubquestionCollection'

describe('SurveySubquestionCollection', () => {
  let collection: SurveySubquestionCollection

  beforeEach(() => {
    collection = new SurveySubquestionCollection()
      .add({ _id: 's1', code: 'S001', text: { en: 'Subquestion 1' } })
      .add({ _id: 's2', code: 'S002', text: { en: 'Subquestion 2' } })
      .add({ _id: 's3', code: 'S003', text: { en: 'Subquestion 3' } })
  })

  test('fromArray creates a collection from an array of subquestions', () => {
    const data = [
      { _id: 's4', code: 'S004', text: { en: 'Subquestion 4' } },
      { _id: 's5', code: 'S005', text: { en: 'Subquestion 5' } },
    ]
    const newCollection = collection.fromArray(data)
    expect(newCollection.length).toBe(2)
    expect(newCollection.getById('s4').text.en).toBe('Subquestion 4')
    expect(newCollection.getById('s5').text.en).toBe('Subquestion 5')
  })

  test('getNextCode returns the next available code', () => {
    expect(collection.getNextCode(SUBQUESTION_CODE_PREFIX)).toBe('S004')
  })

  test('add appends a new subquestion to the collection', () => {
    const newCollection = collection.add({ text: { en: 'New Subquestion' } })
    expect(newCollection.length).toBe(4)
    expect(newCollection.last().text.en).toBe('New Subquestion')
    expect(newCollection.last().code).toBe('S004')
  })

  test('add inserts a new subquestion after specified subquestion', () => {
    const newCollection = collection.add(
      { text: { en: 'New Subquestion' } },
      { afterId: 's2' },
    )
    expect(newCollection.length).toBe(4)
    expect(newCollection.getById('s2').text.en).toBe('Subquestion 2')
    expect(newCollection[2].text.en).toBe('New Subquestion')
    expect(newCollection[2].code).toBe('S004')
    expect(newCollection.getById('s3').text.en).toBe('Subquestion 3')
  })

  test('move relocates a subquestion to a new position', () => {
    const newCollection = collection.move('s1', 2)
    expect(newCollection[0].text.en).toBe('Subquestion 2')
    expect(newCollection[1].text.en).toBe('Subquestion 3')
    expect(newCollection[2].text.en).toBe('Subquestion 1')
  })

  test('throws error when adding subquestion with duplicate code', () => {
    expect(() => {
      collection.add({
        _id: 's4',
        code: 'S001',
        text: { en: 'Subquestion 4' },
      })
    }).toThrow('Subquestion with code "S001" already exists')
  })

  test('throws error when adding subquestion with duplicate code (auto-generated conflict)', () => {
    const duplicateCode = `${SUBQUESTION_CODE_PREFIX}005`

    const newCollection = collection.add({
      _id: 's4',
      code: duplicateCode,
      text: { en: 'Subquestion 4' },
    })

    expect(() => {
      newCollection.add({
        _id: 's5',
        code: duplicateCode,
        text: { en: 'Subquestion 5' },
      })
    }).toThrow(`Subquestion with code "${duplicateCode}" already exists`)
  })
})
