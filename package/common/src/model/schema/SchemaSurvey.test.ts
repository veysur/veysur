/**
 * Regression: `SchemaSurvey` merges its fields into the spec with `Object.assign`, which
 * needs a built spec. Passing the `sb` builder unbuilt left the spec without its fields, so
 * strict validation reported every field as "Field not specified" and blocked publishing.
 */
describe('survey schema', () => {
  let schemaManager: typeof import('../schema-manager').schemaManager

  beforeAll(async () => {
    // The manager must be built under real timers, or Date fields fail to cast (ClockDate)
    jest.useRealTimers()
    jest.resetModules()
    ;({ schemaManager } = await import('../schema-manager'))
  })

  it('specifies every top-level survey field', async () => {
    const schema = schemaManager.getSchema('survey')!
    const result = await schema.validate({
      createdById: 'user-1',
      name: 'Survey',
      title: { en: 'Survey' },
      attributes: {},
      sectionIds: [],
      elementIds: [],
      sections: [],
      elements: [],
    })

    const messages = Object.values(result.errors ?? {}).flat()
    expect(messages).not.toContain('Field not specified')
  })
})
