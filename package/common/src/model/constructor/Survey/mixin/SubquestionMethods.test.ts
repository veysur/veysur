import { Survey } from '../../Survey'
import { SurveyQuestion } from '../SurveyQuestion'

describe('Survey - Subquestion Operations', () => {
  let survey: Survey
  let questionId: string

  beforeEach(() => {
    survey = new Survey({
      _id: 'survey1',
      createdById: 'user1',
      elements: [
        {
          _id: 'q1',
          text: { en: 'Parent Question' },
          surveyId: 'survey1',
          createdById: 'user1',
        },
      ],
    })
    questionId = 'q1'
  })

  test('addSubquestion adds a new subquestion', () => {
    const updatedSurvey = survey.addSubquestion(questionId, {
      text: { en: 'Subquestion 1' },
    })
    const parentQuestion = updatedSurvey.elements
      .questions()
      .getById(questionId) as SurveyQuestion

    expect(parentQuestion.subquestions?.length).toBe(1)
    expect(parentQuestion.subquestions?.[0].text.en).toBe('Subquestion 1')
  })

  test('mutateSubquestion updates an existing subquestion', () => {
    let updatedSurvey = survey.addSubquestion(questionId, {
      text: { en: 'Subquestion 1' },
    })
    const subquestionId = (
      updatedSurvey.elements.questions().getById(questionId) as SurveyQuestion
    ).subquestions?.[0]._id as string

    updatedSurvey = updatedSurvey.mutateSubquestion(
      questionId,
      subquestionId,
      (subquestion) =>
        new SurveyQuestion({
          ...subquestion,
          text: { en: 'Updated Subquestion' },
        }),
    )

    const parentQuestion = updatedSurvey.elements
      .questions()
      .getById(questionId) as SurveyQuestion
    expect(parentQuestion.subquestions?.[0].text.en).toBe('Updated Subquestion')
  })

  test('updateSubquestion updates an existing subquestion', () => {
    let updatedSurvey = survey.addSubquestion(questionId, {
      text: { en: 'Subquestion 1' },
    })
    const subquestionId = (
      updatedSurvey.elements.questions().getById(questionId) as SurveyQuestion
    ).subquestions?.[0]._id as string

    updatedSurvey = updatedSurvey.updateSubquestion(questionId, subquestionId, {
      text: { en: 'Updated Subquestion' },
    })

    const parentQuestion = updatedSurvey.elements
      .questions()
      .getById(questionId) as SurveyQuestion
    expect(parentQuestion.subquestions?.[0].text.en).toBe('Updated Subquestion')
  })

  test('moveSubquestion changes the position of a subquestion', () => {
    let updatedSurvey = survey
      .addSubquestion(questionId, { text: { en: 'Subquestion 1' } })
      .addSubquestion(questionId, { text: { en: 'Subquestion 2' } })

    const parentQuestion = updatedSurvey.elements
      .questions()
      .getById(questionId) as SurveyQuestion
    const subquestionId = parentQuestion.subquestions?.[0]._id as string

    updatedSurvey = updatedSurvey.moveSubquestion(questionId, subquestionId, 1)

    const updatedParentQuestion = updatedSurvey.elements
      .questions()
      .getById(questionId) as SurveyQuestion
    expect(updatedParentQuestion.subquestions?.[1].text.en).toBe(
      'Subquestion 1',
    )
  })

  test('deleteSubquestion removes a subquestion', () => {
    let updatedSurvey = survey.addSubquestion(questionId, {
      text: { en: 'Subquestion 1' },
    })
    const subquestionId = (
      updatedSurvey.elements.questions().getById(questionId) as SurveyQuestion
    ).subquestions?.[0]._id as string

    updatedSurvey = updatedSurvey.deleteSubquestion(questionId, subquestionId)

    const parentQuestion = updatedSurvey.elements
      .questions()
      .getById(questionId) as SurveyQuestion
    expect(parentQuestion.subquestions?.length).toBe(0)
  })
})
