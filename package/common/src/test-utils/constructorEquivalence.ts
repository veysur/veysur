import { genUniqueId } from '@datacapy/id'
import type { SpecInput } from '@datacapy/schema'

type Constructor = new (data?: never) => object

const FIXED_NOW = new Date('2026-01-01T00:00:00.000Z')
const ISO = '2025-01-02T03:04:05.000Z'

/** Values worth feeding a field of each type: the type's falsy value, then typical ones. */
const PROBES: Map<unknown, unknown[]> = new Map<unknown, unknown[]>([
  [String, ['', 'text']],
  [Number, [0, 5]],
  [Boolean, [false, true]],
  [Date, [new Date(ISO), ISO, Date.parse(ISO)]],
  [Array, [[], ['x']]],
  [Object, [{}, { a: 1 }]],
])
const UNTYPED_PROBES = [{}, 'x']

function probesFor(spec: { $type?: unknown }): unknown[] {
  return PROBES.get(spec.$type) ?? UNTYPED_PROBES
}

function lastOf<T>(values: T[]): T {
  return values[values.length - 1]
}

function describeValue(value: unknown): unknown {
  if (value === undefined) return '$undefined'
  if (value instanceof Date) return { $date: value.toISOString() }
  if (Array.isArray(value)) return value.map(describeValue)
  if (value !== null && typeof value === 'object') {
    return {
      $class: Object.getPrototypeOf(value)?.constructor?.name,
      entries: Object.entries(value).map(([k, v]) => [k, describeValue(v)]),
    }
  }
  return value
}

function buildCases(shape: SpecInput): Record<string, unknown[]> {
  const specs = Object.entries(shape).map(
    ([key, field]) => [key, field.build()] as const,
  )
  const cases: Record<string, unknown[]> = {
    'no argument': [],
    empty: [{}],
    'unknown key': [{ $unknown: 1 }],
    'all null': [Object.fromEntries(specs.map(([k]) => [k, null]))],
    'all typical': [
      Object.fromEntries(specs.map(([k, s]) => [k, lastOf(probesFor(s))])),
    ],
  }
  for (const [key, spec] of specs) {
    cases[`${key}: undefined`] = [{ [key]: undefined }]
    cases[`${key}: null`] = [{ [key]: null }]
    probesFor(spec).forEach((probe, i) => {
      cases[`${key}: probe ${i}`] = [{ [key]: probe }]
    })
  }
  return cases
}

/**
 * A constructor that mints ids needs the test file to mock the generator,
 * before the constructor loads:
 * `jest.mock('@datacapy/id', () => ({ ...jest.requireActual('@datacapy/id'), genUniqueId: jest.fn() }))`.
 *
 * Runs `Ctor` over an input matrix built from `shape` and returns what it
 * produced, with key order, class names and dates made visible. Record it as a
 * snapshot before changing a constructor; the snapshot must not change.
 */
export function constructorBehaviour(
  Ctor: Constructor,
  shape: SpecInput,
): Record<string, unknown> {
  return constructorCases(Ctor, buildCases(shape))
}

/**
 * Same as `constructorBehaviour`, for a hand-written case list: used when the
 * schema has nested groups, so no field-by-field matrix can be derived.
 */
export function constructorCases(
  Ctor: Constructor,
  cases: Record<string, unknown[]>,
): Record<string, unknown> {
  jest.setSystemTime(FIXED_NOW)
  const out: Record<string, unknown> = {}
  for (const [name, args] of Object.entries(cases)) {
    let counter = 0
    if (jest.isMockFunction(genUniqueId)) {
      jest.mocked(genUniqueId).mockImplementation(() => `id${++counter}`)
    }
    try {
      out[name] = JSON.stringify(describeValue(new Ctor(...(args as [never]))))
    } catch (error) {
      out[name] = JSON.stringify({ $throws: (error as Error).message })
    }
  }
  return out
}
