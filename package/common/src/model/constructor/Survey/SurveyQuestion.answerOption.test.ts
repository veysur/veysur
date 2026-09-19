import { SurveyQuestion } from './SurveyQuestion'
import { SurveyAnswerOption } from './SurveyAnswerOption'

describe('SurveyQuestion answer methods', () => {
  let question: SurveyQuestion

  beforeEach(() => {
    question = new SurveyQuestion({
      _id: 'q1',
      surveyId: 'survey1',
      createdById: 'user1',
      text: { en: 'Test Question' },
    })
  })

  test('addAnswerOption adds a new answer to the question with an assigned code', () => {
    const updatedQuestion = question.addAnswerOption({
      label: { en: 'Test Answer' },
    })
    expect(updatedQuestion).not.toBe(question)
    expect(updatedQuestion.answerOptions.length).toBe(1)
    expect(updatedQuestion.answerOptions[0].label.en).toBe('Test Answer')
    expect(updatedQuestion.answerOptions[0].code).toBeDefined()
    expect(updatedQuestion.answerOptions[0].code).toMatch(/^A\d{3}$/) // Assuming codes are in the format A001, A002, etc.
  })

  test('addAnswerOption adds a new answer after specified answer with sequential codes', () => {
    let updatedQuestion = question
      .addAnswerOption({ label: { en: 'Answer 1' } })
      .addAnswerOption({ label: { en: 'Answer 2' } })

    updatedQuestion = updatedQuestion.addAnswerOption(
      { label: { en: 'Answer 3' } },
      updatedQuestion.answerOptions[0]._id,
    )

    expect(updatedQuestion.answerOptions.length).toBe(3)
    expect(updatedQuestion.answerOptions[1].label.en).toBe('Answer 3')
    expect(updatedQuestion.answerOptions[0].code).toBe('A001')
    expect(updatedQuestion.answerOptions[1].code).toBe('A003')
    expect(updatedQuestion.answerOptions[2].code).toBe('A002')
  })

  test('mutateAnswerOption updates an existing answer while preserving its code', () => {
    let updatedQuestion = question.addAnswerOption({
      label: { en: 'Original Answer' },
    })
    const originalCode = updatedQuestion.answerOptions[0].code
    updatedQuestion = updatedQuestion.mutateAnswerOption(
      updatedQuestion.answerOptions[0]._id,
      (answer) =>
        new SurveyAnswerOption({ ...answer, label: { en: 'Updated Answer' } }),
    )

    expect(updatedQuestion.answerOptions[0].label.en).toBe('Updated Answer')
    expect(updatedQuestion.answerOptions[0].code).toBe(originalCode)
  })

  test('updateAnswerOption updates an existing answer while preserving its code', () => {
    let updatedQuestion = question.addAnswerOption({
      label: { en: 'Original Answer' },
    })
    const originalCode = updatedQuestion.answerOptions[0].code
    updatedQuestion = updatedQuestion.updateAnswerOption(
      updatedQuestion.answerOptions[0]._id,
      { label: { en: 'Updated Answer' } },
    )

    expect(updatedQuestion.answerOptions[0].label.en).toBe('Updated Answer')
    expect(updatedQuestion.answerOptions[0].code).toBe(originalCode)
  })

  test('moveAnswerOption changes the position of an answer while preserving codes', () => {
    let updatedQuestion = question
      .addAnswerOption({ label: { en: 'Answer 1' } })
      .addAnswerOption({ label: { en: 'Answer 2' } })
      .addAnswerOption({ label: { en: 'Answer 3' } })

    updatedQuestion = updatedQuestion.moveAnswerOption(
      updatedQuestion.answerOptions[2]._id,
      0,
    )

    expect(updatedQuestion.answerOptions[0].label.en).toBe('Answer 3')
    expect(updatedQuestion.answerOptions[1].label.en).toBe('Answer 1')
    expect(updatedQuestion.answerOptions[2].label.en).toBe('Answer 2')
    expect(updatedQuestion.answerOptions[0].code).toBe('A003')
    expect(updatedQuestion.answerOptions[1].code).toBe('A001')
    expect(updatedQuestion.answerOptions[2].code).toBe('A002')
  })

  test('deleteAnswerOption removes an answer from the question without affecting other codes', () => {
    let updatedQuestion = question
      .addAnswerOption({ label: { en: 'Answer 1' } })
      .addAnswerOption({ label: { en: 'Answer 2' } })
      .addAnswerOption({ label: { en: 'Answer 3' } })

    const codeToDelete = updatedQuestion.answerOptions[1].code
    updatedQuestion = updatedQuestion.deleteAnswerOption(
      updatedQuestion.answerOptions[1]._id,
    )

    expect(updatedQuestion.answerOptions.length).toBe(2)
    expect(updatedQuestion.answerOptions[0].label.en).toBe('Answer 1')
    expect(updatedQuestion.answerOptions[1].label.en).toBe('Answer 3')
    expect(
      updatedQuestion.answerOptions.some((a) => a.code === codeToDelete),
    ).toBeFalsy()
  })
})
