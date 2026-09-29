import { Collection } from '@datacapy/schema'

export abstract class EntityCollection<
  T extends { _id: string | number },
> extends Collection<T> {
  getById(entityId: string | number): T | undefined {
    return this.find((entity) => entity._id === entityId)
  }

  mutateById(entityId: string | number, mutator: (entity: T) => T): this {
    const entityIndex = this.findIndex((entity) => entity._id === entityId)
    if (entityIndex === -1) {
      // Entity not found, return same instance
      return this
    }

    const originalEntity = this[entityIndex]
    const mutatedEntity = mutator(originalEntity)

    if (mutatedEntity === originalEntity) {
      // No change occurred, return same instance
      return this
    }

    // Create new collection with the mutated entity
    return Reflect.construct(this.constructor, [
      ...this.map((entity) =>
        entity._id === entityId ? mutatedEntity : entity,
      ),
    ])
  }

  updateById(entityId: string | number, data: Partial<T>): this {
    return this.mutateById(entityId, (entity) => {
      // Use the entity's constructor to create a proper instance
      const Constructor = entity.constructor as new (data: Partial<T>) => T
      return new Constructor({ ...entity, ...data })
    })
  }

  deleteById(entityId: string | number): this {
    const entityExists = this.some((entity) => entity._id === entityId)
    if (!entityExists) {
      // Entity not found, return same instance
      return this
    }

    // Create new collection without the deleted entity
    return Reflect.construct(this.constructor, [
      ...this.filter((entity) => entity._id !== entityId),
    ])
  }

  last(): T | undefined {
    return this[this.length - 1]
  }
}
