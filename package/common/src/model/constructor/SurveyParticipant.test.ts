import { SurveyParticipant } from './SurveyParticipant'

describe('SurveyParticipant.completionStatus', () => {
  test('returns notStarted when no surveyResponse is populated', () => {
    const participant = new SurveyParticipant({})
    expect(participant.completionStatus).toBe('notStarted')
  })

  test('returns inProgress when a response exists but is not completed', () => {
    const participant = new SurveyParticipant({
      surveyResponse: { completed: false, completedAt: null },
    })
    expect(participant.completionStatus).toBe('inProgress')
  })

  test('returns completed when the response is completed', () => {
    const participant = new SurveyParticipant({
      surveyResponse: { completed: true, completedAt: new Date() },
    })
    expect(participant.completionStatus).toBe('completed')
  })
})
