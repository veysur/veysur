// Compile-time guard, checked by `pnpm typecheck` and never run: the method
// names `nestedSettingMethods` generates, and that chaining them keeps the
// concrete class type.
import type { Survey } from '../../Survey'
import type { SettingSurvey } from '../../SettingSurvey'
import type { NestedSettingMethods } from './nestedSettingMethods'

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false
type Expect<T extends true> = T

type MethodNames<K extends 'access' | 'contentFormat'> =
  keyof NestedSettingMethods<K>

export type NamesFollowKey = [
  Expect<Equal<MethodNames<'access'>, 'setAccessProperty' | 'updateAccess'>>,
  Expect<
    Equal<
      MethodNames<'contentFormat'>,
      'setContentFormatProperty' | 'updateContentFormat'
    >
  >,
]

export const chainSurvey = (s: Survey) =>
  s.setAccessProperty('open', true).updateNotify({ basic: 'x' })
export const chainSettings = (s: SettingSurvey) =>
  s.updateData({ ip: true }).setScheduleProperty('start', null)

export type ChainingKeepsClass = [
  Expect<Equal<ReturnType<typeof chainSurvey>, Survey>>,
  Expect<Equal<ReturnType<typeof chainSettings>, SettingSurvey>>,
]

// @ts-expect-error a key outside the six boilerplate groups is rejected
export type UnknownKey = NestedSettingMethods<'language'>
