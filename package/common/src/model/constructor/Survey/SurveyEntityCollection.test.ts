import { SurveyEntityCollection } from './SurveyEntityCollection'

// Create a concrete implementation of SurveyEntityCollection for testing
interface TestEntity {
  _id: string
  name: string
  attributes: { [key: string]: unknown }
}
class TestSurveyEntityCollection extends SurveyEntityCollection<TestEntity> {
  createEntity(data) {
    return data
  }
}

describe('SurveyEntityCollection', () => {
  let collection: TestSurveyEntityCollection

  beforeEach(() => {
    collection = new TestSurveyEntityCollection(
      { _id: '1', name: 'Entity 1', attributes: { key1: 'value1' } },
      { _id: '2', name: 'Entity 2', attributes: { key2: 'value2' } },
    )
  })

  test('mutateAttributes method', () => {
    const result = collection.mutateAttributes('1', (attributes) => ({
      ...attributes,
      newKey: 'newValue',
    }))
    expect(result[0].attributes).toEqual({ key1: 'value1', newKey: 'newValue' })
    expect(result[1].attributes).toEqual({ key2: 'value2' })
  })

  test('setAttribute method', () => {
    const result = collection.setAttribute('2', 'newAttribute', 'newValue')
    expect(result[0].attributes).toEqual({ key1: 'value1' })
    expect(result[1].attributes).toEqual({
      key2: 'value2',
      newAttribute: 'newValue',
    })
  })
})
