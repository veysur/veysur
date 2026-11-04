import type { Constructor } from '../../type/Constructor'

/**
 * Minimal immutable-value base for the small survey leaf classes
 * (`SurveyElementBase`, `SurveySection`, `SurveySubquestion`).
 *
 * `withChanges` is the single reconstruct-with-a-patch primitive every mutator
 * on those classes delegates to — the leaf equivalent of `SurveyBase.update()`
 * / `SurveyAnswerOption.update()`. Using `this.constructor` keeps the return
 * type as the concrete subclass, so an immutable method on `SurveyQuestion`
 * returns a `SurveyQuestion`, not a base instance.
 */
export class ImmutableEntity {
  withChanges(patch: Record<string, unknown>): this {
    const Ctor = this.constructor as new (data: Record<string, unknown>) => this
    return new Ctor({ ...this, ...patch })
  }
}

/**
 * Adds `withChanges` to a base class that is not itself an `ImmutableEntity`,
 * such as one built by `SchemaConstructor.from`. The result satisfies the same
 * structural constraint as `ImmutableEntity`, so the entity mixins accept it.
 */
export function immutableEntity<T extends Constructor>(Base: T) {
  return class extends Base {
    withChanges(patch: Record<string, unknown>): this {
      const Ctor = this.constructor as new (
        data: Record<string, unknown>,
      ) => this
      return new Ctor({ ...this, ...patch })
    }
  }
}
