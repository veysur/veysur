import { createHash } from 'crypto'

import { Survey } from './Survey'
import { SettingSurvey } from './SettingSurvey'

/**
 * Effective method of each name on a class, resolved through the whole
 * prototype chain, so a change in mixin order that alters which override wins
 * changes the snapshot as well as a missing or extra method.
 */
function effectiveMethods(ctor: { prototype: object }): Record<string, string> {
  const result: Record<string, string> = {}
  for (
    let proto: object | null = ctor.prototype;
    proto && proto !== Object.prototype;
    proto = Object.getPrototypeOf(proto)
  ) {
    for (const name of Object.getOwnPropertyNames(proto).sort()) {
      if (name === 'constructor' || name in result) continue
      const d = Object.getOwnPropertyDescriptor(proto, name)
      const fn = d?.value ?? d?.get
      result[name] =
        typeof fn === 'function'
          ? `${d?.get ? 'get ' : ''}${createHash('sha1').update(fn.toString()).digest('hex').slice(0, 10)}`
          : typeof d?.value
    }
  }
  return Object.fromEntries(
    Object.entries(result).sort(([a], [b]) => a.localeCompare(b)),
  )
}

describe('mixin composition', () => {
  it('Survey.prototype exposes the same effective methods', () => {
    expect(effectiveMethods(Survey)).toMatchSnapshot()
  })

  it('SettingSurvey.prototype exposes the same effective methods', () => {
    expect(effectiveMethods(SettingSurvey)).toMatchSnapshot()
  })
})
