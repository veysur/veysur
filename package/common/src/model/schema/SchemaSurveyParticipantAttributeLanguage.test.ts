import { SchemaSurveyParticipantAttributeLanguage } from './SchemaSurveyParticipantAttributeLanguage'

describe('SchemaSurveyParticipantAttributeLanguage', () => {
  jest.useRealTimers()

  const schema = new SchemaSurveyParticipantAttributeLanguage()

  const baseObject = () => ({
    _id: 'id1',
    surveyId: 'survey1',
    languageCode: 'en',
  })

  it('validates a valid object and applies defaults', async () => {
    const result = await schema.validate(baseObject())

    expect(result.isValid).toBe(true)
  })

  it('accepts a data map keyed by attribute name', async () => {
    const result = await schema.validate({
      ...baseObject(),
      data: {
        department: { label: 'Department', description: 'Team or department' },
      },
    })

    expect(result.isValid).toBe(true)
  })

  it('requires a languageCode', async () => {
    const object = baseObject()
    delete (object as Record<string, unknown>).languageCode

    const result = await schema.validate(object)

    expect(result.isValid).toBe(false)
    expect(result.errors.languageCode).toBeDefined()
  })
})
