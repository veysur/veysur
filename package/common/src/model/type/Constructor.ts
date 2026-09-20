/**
 * Shared constructor-type constraint for the functional mixin composition
 * pattern used by Survey/SettingSurvey (see model/constructor/AGENTS.md).
 *
 * The `any[]` here is intentional and isolated to this single declaration:
 * mixin functions accept a `Base` class without knowing its concrete
 * constructor parameter list, and narrowing this to `unknown[]` breaks
 * assignability for every concrete constructor passed in (parameters would
 * need to be assignable from `unknown` in the contravariant position, which
 * none are).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T = object> = new (...args: any[]) => T
