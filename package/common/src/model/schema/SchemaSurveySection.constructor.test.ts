import { schemaManager } from '../schema-manager'

/**
 * Regression: @datacapy/schema registers constructors by the class's `.name`, so the
 * `$construct` / `$constructCollection` strings in `SchemaSurveySection` /
 * `SchemaSurveyElement` must exactly match the class names
 * (`SurveySection` / `SurveySectionCollection` / `SurveyElementCollection`).
 * A mismatch threw `Constructor "..." not found for path "" in schema
 * surveySection` and broke publish (`SurveyValidation.validateSchemas`).
 */
describe('survey section / element schema constructor resolution', () => {
  jest.useRealTimers()

  it('registers the renamed section constructors', () => {
    const schema = schemaManager.getSchema('surveySection')!
    expect(schema.getConstructor('SurveySection')).toBeTruthy()
    expect(schema.getConstructor('SurveySectionCollection')).toBeTruthy()
  })

  it('registers the renamed element collection constructor', () => {
    const schema = schemaManager.getSchema('surveyElement')!
    expect(schema.getConstructor('SurveyElementCollection')).toBeTruthy()
  })

  it('does not raise a missing-constructor error when validating a section array', async () => {
    const schema = schemaManager.getSchema('surveySection')!
    // Validation may still fail for unrelated reasons (fake-timer Date casting
    // under the global jest config), so tolerate any rejection except the
    // missing-constructor error this test guards against.
    let error: unknown
    try {
      await schema.validate([
        { _id: 's1', surveyId: 'x', createdById: 'x', kind: 'group' },
      ])
    } catch (e) {
      error = e
    }
    if (error) expect(String(error)).not.toMatch(/Constructor .* not found/)
  })
})
