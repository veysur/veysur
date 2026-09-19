import { SchemaSurveyParticipant } from './SchemaSurveyParticipant'

describe('SchemaSurveyParticipant', () => {
  jest.useRealTimers()

  const schema = new SchemaSurveyParticipant()

  const baseObject = (): Record<string, unknown> => ({
    _id: 'id1',
    surveyId: 'survey1',
    createdById: 'user1',
    nameFirst: 'Jane',
    nameLast: 'Doe',
    email: 'jane@example.com',
    language: 'en',
  })

  it('defaults attributes to an empty object', async () => {
    const result = await schema.validate(baseObject())

    expect(result.isValid).toBe(true)
  })

  it('accepts a valid attributes map', async () => {
    const result = await schema.validate({
      ...baseObject(),
      attributes: { department: 'Sales', region: 'Europe' },
    })

    expect(result.isValid).toBe(true)
  })

  it('rejects an attribute value longer than 256 characters', async () => {
    const result = await schema.validate({
      ...baseObject(),
      attributes: { department: 'a'.repeat(257) },
    })

    expect(result.isValid).toBe(false)
    expect(result.errors['attributes.department']).toBeDefined()
  })

  describe('emailStatus enum', () => {
    it.each(['pending', 'verified', 'invalid'])(
      'accepts %s',
      async (emailStatus) => {
        const result = await schema.validate({
          ...baseObject(),
          emailStatus,
        })

        expect(result.isValid).toBe(true)
      },
    )

    it('rejects an unrecognised emailStatus value', async () => {
      const result = await schema.validate({
        ...baseObject(),
        emailStatus: 'bogus',
      })

      expect(result.isValid).toBe(false)
      expect(result.errors['emailStatus']).toBeDefined()
    })

    it('defaults emailStatus to pending', async () => {
      const object = baseObject()
      const result = await schema.validate(object)

      expect(result.isValid).toBe(true)
      expect(object.emailStatus).toBe('pending')
    })
  })
})
