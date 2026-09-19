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
