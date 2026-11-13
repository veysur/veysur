import { Constructor } from '../../../type'
import { SettingSurveyMixinBase } from './SettingSurveyMixinBase'

type NestedSettingKey =
  | 'access'
  | 'data'
  | 'participant'
  | 'contentFormat'
  | 'schedule'
  | 'notify'

/**
 * The generic `this` parameter keeps the return type polymorphic, which a
 * mapped type cannot express with a plain `this` return.
 */
export type NestedSettingMethods<K extends NestedSettingKey> = {
  [P in `set${Capitalize<K>}Property`]: <S>(
    this: S,
    key: string,
    value: unknown,
  ) => S
} & {
  [P in `update${Capitalize<K>}`]: <S>(
    this: S,
    updates: Record<string, unknown>,
  ) => S
}

/**
 * Builds the `set<Key>Property` / `update<Key>` pair for a settings group
 * whose methods only merge into defaults. Groups with real logic (language,
 * presentation, stats, data policy, legal notice) stay hand-written.
 */
export function nestedSettingMethods<K extends NestedSettingKey>(
  key: K,
  defaults: Record<string, unknown>,
) {
  const name = key.charAt(0).toUpperCase() + key.slice(1)

  return function <T extends Constructor<SettingSurveyMixinBase>>(
    Base: T,
  ): T & Constructor<NestedSettingMethods<K>> {
    class Mixin extends Base {}
    Object.defineProperties(Mixin.prototype, {
      [`set${name}Property`]: {
        value(this: SettingSurveyMixinBase, prop: string, value: unknown) {
          return this.setNestedProperty(this[key], defaults, key, prop, value)
        },
        writable: true,
        configurable: true,
      },
      [`update${name}`]: {
        value(this: SettingSurveyMixinBase, updates: Record<string, unknown>) {
          return this.updateNestedProperty(this[key], defaults, key, updates)
        },
        writable: true,
        configurable: true,
      },
    })
    return Mixin as T & Constructor<NestedSettingMethods<K>>
  }
}
