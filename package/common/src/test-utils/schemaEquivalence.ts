import type { Schema } from '@datacapy/schema'

function describeSpec(value: unknown): unknown {
  if (typeof value === 'function') return `$fn:${value.name}`
  if (value instanceof RegExp) return `$re:${value}`
  if (Array.isArray(value)) return value.map(describeSpec)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, describeSpec(v)]),
    )
  }
  return value
}

/**
 * What a schema declares and how it validates, for a record-then-compare
 * snapshot taken before swapping a hand-written schema for a generated one:
 * the resolved spec (functions by name), and whether an unknown key is
 * rejected on validation.
 */
export async function schemaBehaviour(
  schema: Schema,
  valid: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const outcome = async (data: Record<string, unknown>) => {
    try {
      const result = await schema.validate(data as never)
      return { ok: true, result: describeSpec(result) }
    } catch (error) {
      return { ok: false, error: (error as Error).message }
    }
  }
  return {
    name: schema.getName(),
    spec: describeSpec(schema.getSpec()),
    valid: await outcome(valid),
    unknownKey: await outcome({ ...valid, $unknown: 1 }),
  }
}

interface Outcome {
  result?: { isValid: boolean; errors: Record<string, unknown> }
}

/**
 * The valid document must validate and an unknown key must be reported. Needs
 * real timers in the test file (`jest.useRealTimers()` before the schema
 * imports): under fake timers every Date field fails to cast and both
 * outcomes are trivially failures.
 */
export function expectValidAndStrict(behaviour: Record<string, unknown>): void {
  const valid = (behaviour.valid as Outcome).result
  const unknownKey = (behaviour.unknownKey as Outcome).result
  expect(valid?.errors).toEqual({})
  expect(valid?.isValid).toBe(true)
  expect(unknownKey?.errors).toHaveProperty('$unknown')
}
