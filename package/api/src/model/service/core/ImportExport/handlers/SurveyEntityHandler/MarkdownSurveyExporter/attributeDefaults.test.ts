import { attributesMetadata } from 'veysur-common'

/**
 * Guards the markdown exporter's "only non-default attributes are emitted"
 * rule (survey-markdown-format.md §3.4/§7 item 5) against silent drift
 * between AttributeMeta.initialValue and the spec's §2.3 table. Runs
 * indefinitely, not just as a one-off pre-implementation check.
 */
describe('AttributeMeta.initialValue matches survey-markdown-format.md §2.3', () => {
  const byId = (id: string) => attributesMetadata.find((m) => m.id === id)

  test('required: true', () => {
    expect(byId('required')?.initialValue).toBe(true)
  })

  test('inputSize: small', () => {
    expect(byId('inputSize')?.initialValue).toBe('small')
  })

  test('lengthMinMax: { min: 0, max: 0 }', () => {
    expect(byId('lengthMinMax')?.initialValue).toEqual({ min: 0, max: 0 })
  })

  test('numberMinMax: { min: 0, max: 0 }', () => {
    expect(byId('numberMinMax')?.initialValue).toEqual({ min: 0, max: 0 })
  })

  test('numberNegAllowed: false', () => {
    expect(byId('numberNegAllowed')?.initialValue).toBe(false)
  })

  test('choiceMinMax: { min: 0, max: 0 }', () => {
    expect(byId('choiceMinMax')?.initialValue).toEqual({ min: 0, max: 0 })
  })

  test('choiceOther: false', () => {
    expect(byId('choiceOther')?.initialValue).toBe(false)
  })

  test('choiceRandomise: false', () => {
    expect(byId('choiceRandomise')?.initialValue).toBe(false)
  })
})
