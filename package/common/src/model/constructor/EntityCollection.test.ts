import { EntityCollection } from './EntityCollection'

// Create a concrete implementation of EntityCollection for testing
interface TestEntity {
  _id: string
  name: string
  value?: number
}

class TestEntityCollection extends EntityCollection<TestEntity> {
  createEntity(data: Partial<TestEntity>): TestEntity {
    return data as TestEntity
  }
}

describe('EntityCollection', () => {
  let collection: TestEntityCollection

  beforeEach(() => {
    collection = new TestEntityCollection(
      { _id: '1', name: 'Entity 1', value: 100 },
      { _id: '2', name: 'Entity 2', value: 200 },
    )
  })

  test('getById method', () => {
    const entity = collection.getById('2')
    expect(entity).toBeDefined()
    expect(entity?.name).toBe('Entity 2')
    expect(entity?.value).toBe(200)

    const nonExistentEntity = collection.getById('3')
    expect(nonExistentEntity).toBeUndefined()
  })

  test('mutate method', () => {
    const result = collection.mutateById('1', (entity) => ({
      ...entity,
      name: 'Updated Entity 1',
    }))
    expect(result[0].name).toBe('Updated Entity 1')
    expect(result[1].name).toBe('Entity 2')
  })

  test('update method', () => {
    const result = collection.updateById('2', {
      name: 'Updated Entity 2',
      value: 250,
    })
    expect(result[0].name).toBe('Entity 1')
    expect(result[1].name).toBe('Updated Entity 2')
    expect(result[1].value).toBe(250)
  })

  test('delete method', () => {
    const result = collection.deleteById('1')
    expect(result.length).toBe(1)
    expect(result[0].name).toBe('Entity 2')
  })

  test('mutateById returns same instance when entity not found', () => {
    const result = collection.mutateById('nonexistent', (entity) => ({
      ...entity,
      name: 'Should not happen',
    }))
    expect(result).toBe(collection)
  })

  test('mutateById returns same instance when no changes occur', () => {
    const result = collection.mutateById('1', (entity) => entity)
    expect(result).toBe(collection)
  })

  test('mutateById returns new instance when changes occur', () => {
    const result = collection.mutateById('1', (entity) => ({
      ...entity,
      name: 'Updated Entity 1',
    }))
    expect(result).not.toBe(collection)
    expect(result[0].name).toBe('Updated Entity 1')
  })

  test('deleteById returns same instance when entity not found', () => {
    const result = collection.deleteById('nonexistent')
    expect(result).toBe(collection)
  })

  test('deleteById returns new instance when entity exists', () => {
    const result = collection.deleteById('1')
    expect(result).not.toBe(collection)
    expect(result.length).toBe(1)
  })
})
