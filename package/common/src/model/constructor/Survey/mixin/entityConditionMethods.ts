import { Constructor } from '../../../type/Constructor'
import { ImmutableEntity } from '../ImmutableEntity'
import { ConditionParser } from '../../../service/SurveyCondition/ConditionParser'

export interface HasCondition {
  condition: string | null
  conditionReferences: string[] | null
}

/**
 * Immutable visibility-condition mutators shared by every survey leaf that can
 * be shown/hidden by an expression — `SurveyElementBase` (questions + content)
 * and `SurveySection`. `conditionReferences` is always kept in sync with the
 * parsed condition.
 */
export function entityConditionMethods<
  T extends Constructor<ImmutableEntity & HasCondition>,
>(Base: T) {
  return class extends Base {
    updateCondition(condition: string | null): this {
      return this.withChanges({
        condition,
        conditionReferences: condition
          ? ConditionParser.getReferencedCodes(condition)
          : null,
      })
    }

    clearCondition(): this {
      return this.withChanges({ condition: null, conditionReferences: null })
    }
  }
}
