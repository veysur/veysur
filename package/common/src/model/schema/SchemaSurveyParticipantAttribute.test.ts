import { SchemaSurveyParticipantAttribute } from './SchemaSurveyParticipantAttribute'

describe('SchemaSurveyParticipantAttribute', () => {
  jest.useRealTimers()

  const schema = new SchemaSurveyParticipantAttribute()

  const baseObject = () => ({
    _id: 'id1',
    surveyId: 'survey1',
  })

  it('validates a valid object and applies defaults', async () => {
    const result = await schema.validate(baseObject())

    expect(result.isValid).toBe(true)
  })

  it('accepts an attributes array of definition objects', async () => {
    const result = await schema.validate({
      ...baseObject(),
      attributes: [
        { name: 'department', required: false, internal: false, example: null },
      ],
    })

    expect(result.isValid).toBe(true)
  })
})
