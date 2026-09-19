import { Constructor } from '../../../type/Constructor'
import { ImmutableEntity } from '../ImmutableEntity'
import type { AttributeValue, SurveyAttributes } from '../attributeMeta'

export interface HasAttributes {
  attributes: SurveyAttributes
}

/**
 * Immutable `attributes` map mutators shared by every survey leaf that carries
 * an attribute bag — `SurveyElementBase` (questions + content), `SurveySection`,
 * `SurveySubquestion` (`setAttribute` only).
 */
export function entityAttributeMethods<
  T extends Constructor<ImmutableEntity & HasAttributes>,
>(Base: T) {
  return class extends Base {
    setAttribute(key: string, value: AttributeValue): this {
      return this.withChanges({
        attributes: { ...this.attributes, [key]: value },
      })
    }

    deleteAttribute(key: string): this {
      const attributes = { ...this.attributes }
      delete attributes[key]
      return this.withChanges({ attributes })
    }
  }
}
