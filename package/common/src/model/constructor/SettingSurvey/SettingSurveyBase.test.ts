import { SettingSurvey } from '../SettingSurvey'
import { SettingSurveyBase } from './SettingSurveyBase'

// SchemaSettingSurvey.ts validates project documents and defaults every unset
// presentation/participant/data/access field to null. SettingSurveyBase must
// merge a loaded document over its hardcoded defaults key-by-key so those
// nulls don't wipe out the real default (see mergeDefined in SettingSurveyBase.ts) -
// this is the redirectEnd/thankYouLink "no default" bug.
describe('SettingSurveyBase null hydration', () => {
  test('a schema-validated presentation object (unset fields as null) falls back to hardcoded defaults', () => {
    const nullFilledPresentation = Object.fromEntries(
      Object.keys(new SettingSurveyBase().presentation).map((key) => [
        key,
        null,
      ]),
    )

    const settingSurvey = new SettingSurvey({
      _id: '1',
      presentation: nullFilledPresentation as never,
    })

    expect(settingSurvey.presentation).toEqual(
      new SettingSurveyBase().presentation,
    )
    expect(settingSurvey.presentation.redirectEnd).toBe(false)
    expect(settingSurvey.presentation.thankYouLink).toBe(false)
  })

  test('a schema-validated participant/data/access object falls back to hardcoded defaults', () => {
    const defaults = new SettingSurveyBase()
    const nullFill = (group: object) =>
      Object.fromEntries(Object.keys(group).map((key) => [key, null]))

    const settingSurvey = new SettingSurvey({
      _id: '1',
      participant: nullFill(defaults.participant) as never,
      data: nullFill(defaults.data) as never,
      access: nullFill(defaults.access) as never,
    })

    expect(settingSurvey.participant).toEqual(defaults.participant)
    expect(settingSurvey.data).toEqual(defaults.data)
    expect(settingSurvey.access).toEqual(defaults.access)
  })

  test('an explicit non-null value overrides the hardcoded default', () => {
    const settingSurvey = new SettingSurvey({
      _id: '1',
      presentation: { redirectEnd: true } as never,
    })

    expect(settingSurvey.presentation.redirectEnd).toBe(true)
    // Sibling fields left at null still fall back to their defaults
    expect(settingSurvey.presentation.thankYouLink).toBe(false)
  })

  test('every hardcoded default value is defined (guards against a new setting shipping without one)', () => {
    const defaults = new SettingSurveyBase()

    for (const group of [
      'presentation',
      'participant',
      'data',
      'access',
    ] as const) {
      for (const value of Object.values(defaults[group])) {
        expect(value).not.toBeNull()
        expect(value).not.toBeUndefined()
      }
    }
  })
})
