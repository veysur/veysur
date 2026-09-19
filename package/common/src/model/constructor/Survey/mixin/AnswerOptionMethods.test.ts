import { Survey } from '../../Survey'
import { SurveyQuestion } from '../SurveyQuestion'
import { SurveyAnswerOption } from '../SurveyAnswerOption'

describe('Survey Answer Option Methods', () => {
  let survey: Survey
  let questionId: string

  beforeEach(() => {
    survey = new Survey({
      createdById: 'user1',
      name: 'Test Survey', // Changed from object to string
    })
    const question = new SurveyQuestion({
      text: { en: 'Main Question' },
      sectionId: 'group1',
    })
    survey = survey.addQuestion('group1', question)
    questionId = survey.elements.questions()[0]._id
  })

  test('addAnswerOption adds a new answer to a question', () => {
    const updatedSurvey = survey.addAnswerOption(questionId, {
      label: { en: 'Answer 1' },
    })
    const question = updatedSurvey.elements
      .questions()
      .getById(questionId) as SurveyQuestion
    expect(question.answerOptions.length).toBe(1)
    expect(question.answerOptions[0].label.en).toBe('Answer 1')
  })

  test('mutateAnswerOption updates an existing answer in a question', () => {
    let updatedSurvey = survey.addAnswerOption(questionId, {
      label: { en: 'Answer 1' },
    })
    const answerId = (
      updatedSurvey.elements.questions().getById(questionId) as SurveyQuestion
    ).answerOptions[0]._id

    updatedSurvey = updatedSurvey.mutateAnswerOption(
      questionId,
      answerId,
      (answer) =>
        new SurveyAnswerOption({ ...answer, label: { en: 'Updated Answer' } }),
    )

    const question = updatedSurvey.elements
      .questions()
      .getById(questionId) as SurveyQuestion
    expect(question.answerOptions[0].label.en).toBe('Updated Answer')
  })

  test('updateAnswerOption updates an existing answer in a question', () => {
    let updatedSurvey = survey.addAnswerOption(questionId, {
      label: { en: 'Answer 1' },
    })
    const answerId = (
      updatedSurvey.elements.questions().getById(questionId) as SurveyQuestion
    ).answerOptions[0]._id

    updatedSurvey = updatedSurvey.updateAnswerOption(questionId, answerId, {
      label: { en: 'Updated Answer' },
    })

    const question = updatedSurvey.elements
      .questions()
      .getById(questionId) as SurveyQuestion
    expect(question.answerOptions[0].label.en).toBe('Updated Answer')
  })

  test('moveAnswerOption changes the position of an answer in a question', () => {
    let updatedSurvey = survey
      .addAnswerOption(questionId, { label: { en: 'Answer 1' } })
      .addAnswerOption(questionId, { label: { en: 'Answer 2' } })

    const question = updatedSurvey.elements
      .questions()
      .getById(questionId) as SurveyQuestion
    const answerId = question.answerOptions[0]._id

    updatedSurvey = updatedSurvey.moveAnswerOption(questionId, answerId, 1)

    const updatedQuestion = updatedSurvey.elements
      .questions()
      .getById(questionId) as SurveyQuestion
    expect(updatedQuestion.answerOptions[1].label.en).toBe('Answer 1')
  })

  test('deleteAnswerOption removes an answer from a question', () => {
    let updatedSurvey = survey.addAnswerOption(questionId, {
      label: { en: 'Answer 1' },
    })
    const question = updatedSurvey.elements
      .questions()
      .getById(questionId) as SurveyQuestion
    const answerId = question.answerOptions[0]._id

    updatedSurvey = updatedSurvey.deleteAnswerOption(questionId, answerId)

    const updatedQuestion = updatedSurvey.elements
      .questions()
      .getById(questionId) as SurveyQuestion
    expect(updatedQuestion.answerOptions.length).toBe(0)
  })
})
