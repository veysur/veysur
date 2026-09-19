import {
  SurveySectionCollection,
  SECTION_CODE_PREFIX,
} from './SurveySectionCollection'
import { SurveySection } from './SurveySection'

describe('SurveySectionCollection', () => {
  let collection: SurveySectionCollection

  beforeEach(() => {
    collection = new SurveySectionCollection(
      new SurveySection({
        _id: 'g1',
        code: `${SECTION_CODE_PREFIX}001`,
        name: { en: 'Group 1' },
      }),
      new SurveySection({
        _id: 'g2',
        code: `${SECTION_CODE_PREFIX}002`,
        name: { en: 'Group 2' },
      }),
    )
  })

  test('getNextCode returns the next available code', () => {
    expect(collection.getNextCode('G')).toBe(`${SECTION_CODE_PREFIX}003`)
  })

  test('move relocates a group to a new position', () => {
    const newCollection = collection.move('g2', 0)
    expect(newCollection[0]._id).toBe('g2')
    expect(newCollection[1]._id).toBe('g1')
  })

  test('generates code for group if not provided', () => {
    const newCollection = collection.add({
      _id: 'g3',
      name: { en: 'Group 3' },
    })

    expect(newCollection.getById('g3').code).toBe(`${SECTION_CODE_PREFIX}003`)
  })

  test('uses provided code for group if available', () => {
    const newCollection = collection.add({
      _id: 'g3',
      code: 'G100',
      name: { en: 'Group 3' },
    })

    expect(newCollection.getById('g3').code).toBe('G100')
  })

  test('add uses specified language for group name', () => {
    const newCollection = collection.add(
      {
        _id: 'g3',
        surveyId: '1',
      },
      { lang: 'fr' },
    )

    const addedGroup = newCollection.getById('g3')
    expect(addedGroup.name.fr).toBeDefined()
    expect(addedGroup.name.fr).toBe(`<h3>Group ${SECTION_CODE_PREFIX}003</h3>`)
    expect(addedGroup.name.en).toBeUndefined()
  })

  test('add uses default language (en) when lang option is not provided', () => {
    const newCollection = collection.add({
      _id: 'g3',
      surveyId: '1',
    })

    const addedGroup = newCollection.getById('g3')
    expect(addedGroup.name.en).toBeDefined()
    expect(addedGroup.name.en).toBe(`<h3>Group ${SECTION_CODE_PREFIX}003</h3>`)
  })

  test('generates sequential codes for multiple groups added without codes', () => {
    let newCollection = collection.add({
      _id: 'g3',
      name: { en: 'Group 3' },
    })

    newCollection = newCollection.add({
      _id: 'g4',
      name: { en: 'Group 4' },
    })

    expect(newCollection.getById('g3').code).toBe(`${SECTION_CODE_PREFIX}003`)
    expect(newCollection.getById('g4').code).toBe(`${SECTION_CODE_PREFIX}004`)
  })

  test('handles mix of provided and generated codes', () => {
    let newCollection = collection.add({
      _id: 'g3',
      code: 'G100',
      name: { en: 'Group 3' },
    })

    newCollection = newCollection.add({
      _id: 'g4',
      name: { en: 'Group 4' },
    })

    expect(newCollection.getById('g3').code).toBe(`${SECTION_CODE_PREFIX}100`)
    expect(newCollection.getById('g4').code).toBe(`${SECTION_CODE_PREFIX}101`)
  })

  test('throws error when adding group with duplicate code', () => {
    expect(() => {
      collection.add({
        _id: 'g3',
        code: `${SECTION_CODE_PREFIX}001`,
        name: { en: 'Group 3' },
      })
    }).toThrow('Section with code "G001" already exists')
  })

  test('throws error when adding group with duplicate code (auto-generated conflict)', () => {
    const duplicateCode = `${SECTION_CODE_PREFIX}003`

    // First, add a group with code G003
    const newCollection = collection.add({
      _id: 'g3',
      code: duplicateCode,
      name: { en: 'Group 3' },
    })

    // Then try to add another group with the same code
    expect(() => {
      newCollection.add({
        _id: 'g4',
        code: duplicateCode,
        name: { en: 'Group 4' },
      })
    }).toThrow(`Section with code "${duplicateCode}" already exists`)
  })
})
