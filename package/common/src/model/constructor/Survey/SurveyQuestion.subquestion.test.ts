import { SurveyQuestion } from './SurveyQuestion'

describe('SurveyQuestion - Subquestion Operations', () => {
  let question: SurveyQuestion

  beforeEach(() => {
    question = new SurveyQuestion({
      _id: 'q1',
      surveyId: 's1',
      createdById: 'u1',
      text: { en: 'Main question' },
      detail: { en: 'Description' },
      attributes: { type: 'text' },
    })
  })

  test('addSubquestion adds a new subquestion', () => {
    const updatedQuestion = question.addSubquestion({
      text: { en: 'Subquestion 1' },
    })
    expect(updatedQuestion).not.toBe(question)
    expect(updatedQuestion.subquestions.length).toBe(1)
    expect(updatedQuestion.subquestions[0].text.en).toBe('Subquestion 1')
  })

  test('mutateSubquestion updates an existing subquestion', () => {
    const withSubquestion = question.addSubquestion({
      text: { en: 'Subquestion 1' },
    })
    const subId = withSubquestion.subquestions[0]._id
    const updatedQuestion = withSubquestion.mutateSubquestion(subId, (sq) =>
      sq.updateText('Updated Subquestion'),
    )
    expect(updatedQuestion).not.toBe(withSubquestion)
    expect(updatedQuestion.subquestions[0].text.en).toBe('Updated Subquestion')
  })

  test('updateSubquestion updates an existing subquestion', () => {
    const withSubquestion = question.addSubquestion({
      text: { en: 'Subquestion 1' },
    })
    const subId = withSubquestion.subquestions[0]._id
    const updatedQuestion = withSubquestion.updateSubquestion(subId, {
      text: { en: 'Updated Text' },
    })
    expect(updatedQuestion).not.toBe(withSubquestion)
    expect(updatedQuestion.subquestions[0].text.en).toBe('Updated Text')
  })

  test('moveSubquestion changes the position of a subquestion', () => {
    const withSubquestions = question
      .addSubquestion({ text: { en: 'Subquestion 1' } })
      .addSubquestion({ text: { en: 'Subquestion 2' } })
    const subId = withSubquestions.subquestions[0]._id
    const updatedQuestion = withSubquestions.moveSubquestion(subId, 1)
    expect(updatedQuestion).not.toBe(withSubquestions)
    expect(updatedQuestion.subquestions[1].text.en).toBe('Subquestion 1')
  })

  test('deleteSubquestion removes a subquestion', () => {
    const withSubquestion = question.addSubquestion({
      text: { en: 'Subquestion 1' },
    })
    const subId = withSubquestion.subquestions[0]._id
    const updatedQuestion = withSubquestion.deleteSubquestion(subId)
    expect(updatedQuestion).not.toBe(withSubquestion)
    expect(updatedQuestion.subquestions.length).toBe(0)
  })
})
