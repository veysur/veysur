import { EntityCollection } from '../EntityCollection'
import { AttributeValue, SurveyAttributes } from './attributeMeta'

export abstract class SurveyEntityCollection<
  T extends { _id: string | number; attributes: SurveyAttributes },
> extends EntityCollection<T> {
  mutateAttributes(
    entityId: string | number,
    mutator: (attributes: SurveyAttributes) => SurveyAttributes,
  ): this {
    return this.mutateById(entityId, (entity) => {
      // Use the entity's constructor to create a proper instance
      const Constructor = entity.constructor as new (data: Partial<T>) => T
      return new Constructor({
        ...entity,
        attributes: mutator(entity.attributes),
      })
    })
  }

  setAttribute(
    entityId: string | number,
    attributeId: string | number,
    value: AttributeValue,
  ): this {
    return this.mutateAttributes(entityId, (attributes) => ({
      ...attributes,
      [attributeId]: value,
    }))
  }
}
