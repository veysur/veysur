import { SurveyQuestion } from './SurveyQuestion'

describe('SurveyQuestion condition rebuild', () => {
  const question = () =>
    new SurveyQuestion({
      _id: 'q1',
      sectionId: 'g1',
      code: 'Q001',
      text: { en: 'Q1' },
    })

  it('updateCondition sets both condition and conditionReferences together', () => {
    const updatedAt = question().updateCondition('answers.Q000.A001')
    expect(updatedAt.condition).toBe('answers.Q000.A001')
    expect(updatedAt.conditionReferences).toEqual(['Q000.A001'])
  })

  it('updateCondition(null) clears both fields', () => {
    const updatedAt = question()
      .updateCondition('answers.Q000')
      .updateCondition(null)
    expect(updatedAt.condition).toBeNull()
    expect(updatedAt.conditionReferences).toBeNull()
  })

  it('clearCondition clears both fields', () => {
    const updatedAt = question()
      .updateCondition('answers.Q000')
      .clearCondition()
    expect(updatedAt.condition).toBeNull()
    expect(updatedAt.conditionReferences).toBeNull()
  })

  it('excludes participant variables from conditionReferences', () => {
    const updatedAt = question().updateCondition(
      'answers.Q000 && participant.email',
    )
    expect(updatedAt.conditionReferences).toEqual(['Q000'])
  })
})
