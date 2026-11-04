import { SchemaEmailSuppression } from './SchemaEmailSuppression'

describe('SchemaEmailSuppression', () => {
  jest.useRealTimers()

  const schema = new SchemaEmailSuppression()

  const baseObject = (): Record<string, unknown> => ({
    _id: 'id1',
    email: 'jane@example.com',
    reason: 'hardBounce',
  })

  it('accepts a minimal valid record with defaulted event arrays', async () => {
    const object = baseObject()
    const result = await schema.validate(object)

    expect(result.isValid).toBe(true)
    expect(object.hardBounceEvents).toEqual([])
    expect(object.softBounceEvents).toEqual([])
    expect(object.complaintEvents).toEqual([])
    expect(object.unsubscribeEvents).toEqual([])
    expect(object.expiresAt).toBeNull()
  })

  it('accepts populated per-event-type arrays with projectId/surveyId/participantId', async () => {
    const result = await schema.validate({
      ...baseObject(),
      hardBounceEvents: [
        {
          occurredAt: new Date(),
          projectId: 'project1',
          surveyId: 'survey1',
          participantId: 'participant1',
        },
      ],
    })

    expect(result.isValid).toBe(true)
  })

  it('accepts expiresAt as a date', async () => {
    const result = await schema.validate({
      ...baseObject(),
      expiresAt: new Date(),
    })

    expect(result.isValid).toBe(true)
  })

  it('rejects an unrecognised top-level field (old projectId removed)', async () => {
    const result = await schema.validate({
      ...baseObject(),
      projectId: 'project1',
    })

    expect(result.isValid).toBe(false)
    expect(result.errors['projectId']).toBeDefined()
  })

  it('rejects an unrecognised reason value', async () => {
    const result = await schema.validate({
      ...baseObject(),
      reason: 'bogus',
    })

    expect(result.isValid).toBe(false)
    expect(result.errors['reason']).toBeDefined()
  })
})
