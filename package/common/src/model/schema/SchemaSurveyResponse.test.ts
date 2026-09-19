import { SCHEMA_LENGTH_MAX_INTERNAL_ID } from './constant'
import { SchemaSurveyResponse } from './SchemaSurveyResponse'

describe('SchemaSurveyResponse', () => {
  jest.useRealTimers()

  const schema = new SchemaSurveyResponse()

  const baseObject = (): Record<string, unknown> => ({
    _id: 'response1',
    surveyId: 'survey1',
    snapshotId: 'snapshot1',
    answers: {},
  })

  it('accepts a response with a participant and session id', async () => {
    const result = await schema.validate({
      ...baseObject(),
      participantId: 'participant1',
      sessionId: 'session1',
    })

    expect(result.isValid).toBe(true)
  })

  it('accepts an anonymous response with null participantId', async () => {
    const object = {
      ...baseObject(),
      participantId: null,
      sessionId: 'a'.repeat(SCHEMA_LENGTH_MAX_INTERNAL_ID),
    }
    const result = await schema.validate(object)

    expect(result.isValid).toBe(true)
    expect(object.participantId).toBeNull()
  })

  it('defaults participantId and sessionId to null when absent', async () => {
    const object = baseObject()
    const result = await schema.validate(object)

    expect(result.isValid).toBe(true)
    expect(object.participantId).toBeNull()
    expect(object.sessionId).toBeNull()
  })
})
