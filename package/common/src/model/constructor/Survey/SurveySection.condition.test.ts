import { SurveySection } from './SurveySection'

describe('SurveySection condition rebuild', () => {
  const group = () =>
    new SurveySection({
      _id: 'g1',
      code: 'G1',
      name: { en: 'Group 1' },
    })

  it('updateCondition sets both condition and conditionReferences together', () => {
    const updatedAt = group().updateCondition('answers.Q000.A001')
    expect(updatedAt.condition).toBe('answers.Q000.A001')
    expect(updatedAt.conditionReferences).toEqual(['Q000.A001'])
  })

  it('clearCondition clears both fields', () => {
    const updatedAt = group().updateCondition('answers.Q000').clearCondition()
    expect(updatedAt.condition).toBeNull()
    expect(updatedAt.conditionReferences).toBeNull()
  })
})
