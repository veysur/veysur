import { Survey, Patch } from 'veysur-common'
import {
  QUESTION_TYPE_MATRIX_COMPOSITE,
  QUESTION_TYPE_MATRIX_TEXT,
  QUESTION_TYPE_MATRIX_NUMBER,
  QUESTION_TYPE_MATRIX_DATE,
  QUESTION_TYPE_MATRIX_TIME,
  QUESTION_TYPE_MATRIX_DATETIME,
  QUESTION_TYPE_MATRIX_CHECKBOX,
  QUESTION_TYPE_MATRIX_YES_NO,
  QUESTION_TYPE_TEXT,
  QUESTION_TYPE_NUMBER,
  QUESTION_TYPE_DATE,
  QUESTION_TYPE_TIME,
  QUESTION_TYPE_DATETIME,
  QUESTION_TYPE_CHECKBOX,
  QUESTION_TYPE_YES_NO,
} from 'veysur-common'
import { createSubquestionOperations } from './subquestionOperations'

describe('Subquestion Operations - locked subquestion type', () => {
  let survey: Survey
  let patchBuffer: Patch[]
  let surveyState: Survey
  let operations: ReturnType<typeof createSubquestionOperations>

  beforeEach(() => {
    survey = new Survey({
      _id: 'survey1',
      createdById: 'user1',
      title: { en: 'Test Survey' },
      sections: [
        {
          _id: 'g1',
          surveyId: 'survey1',
          createdById: 'user1',
          name: { en: 'Group 1' },
          attributes: {},
        },
      ],
      sectionIds: ['g1'],
    })

    surveyState = survey
    patchBuffer = []

    const updateSurveyState = (updater: (s: Survey) => Survey) => {
      surveyState = updater(surveyState)
    }

    const bufferPatches = (patches: Patch[]) => {
      patchBuffer.push(...patches)
    }

    const setSurveyFocus = jest.fn()

    const validateAndBuffer = ({ patches }: { patches: Patch[] }) => {
      bufferPatches(patches)
    }

    operations = createSubquestionOperations({
      updateSurveyState,
      bufferPatches,
      setSurveyFocus,
      validateAndBuffer,
    })
  })

  describe.each([
    [QUESTION_TYPE_MATRIX_TEXT, QUESTION_TYPE_TEXT],
    [QUESTION_TYPE_MATRIX_NUMBER, QUESTION_TYPE_NUMBER],
    [QUESTION_TYPE_MATRIX_DATE, QUESTION_TYPE_DATE],
    [QUESTION_TYPE_MATRIX_TIME, QUESTION_TYPE_TIME],
    [QUESTION_TYPE_MATRIX_DATETIME, QUESTION_TYPE_DATETIME],
    [QUESTION_TYPE_MATRIX_CHECKBOX, QUESTION_TYPE_CHECKBOX],
    [QUESTION_TYPE_MATRIX_YES_NO, QUESTION_TYPE_YES_NO],
  ])('addSubquestion on %s', (matrixType, expectedSubquestionType) => {
    test(`defaults new subquestions to the enforced ${expectedSubquestionType} type`, () => {
      const questionId = Survey.genElementId()
      surveyState = surveyState.addQuestion(
        'g1',
        { _id: questionId, type: matrixType },
        {},
      )
      patchBuffer = []

      operations.addSubquestion(questionId)

      const question = surveyState.elements.getQuestionById(questionId)
      const subquestion = question?.subquestions?.[0]
      expect(subquestion?.type).toBe(expectedSubquestionType)
    })
  })

  test('addSubquestion on legacy matrixComposite falls back to checkbox', () => {
    const questionId = Survey.genElementId()
    surveyState = surveyState.addQuestion(
      'g1',
      { _id: questionId, type: QUESTION_TYPE_MATRIX_COMPOSITE },
      {},
    )
    patchBuffer = []

    operations.addSubquestion(questionId)

    const question = surveyState.elements.getQuestionById(questionId)
    const subquestion = question?.subquestions?.[0]
    expect(subquestion?.type).toBe(QUESTION_TYPE_CHECKBOX)
  })

  test('has no updateSubquestionType operation - subquestion type cannot be changed after creation', () => {
    expect(
      (operations as Record<string, unknown>).updateSubquestionType,
    ).toBeUndefined()
  })

  test('updateSubquestion updates the field and buffers a question-update patch', () => {
    const questionId = Survey.genElementId()
    surveyState = surveyState.addQuestion(
      'g1',
      { _id: questionId, type: QUESTION_TYPE_MATRIX_TEXT },
      {},
    )
    operations.addSubquestion(questionId)
    const subquestionId = surveyState.elements.getQuestionById(questionId)
      ?.subquestions?.[0]._id as string
    patchBuffer = []

    operations.updateSubquestion(questionId, subquestionId, {
      code: 'S099',
    })

    const question = surveyState.elements.getQuestionById(questionId)
    const subquestion = question?.subquestions?.getById(subquestionId)
    expect(subquestion?.code).toBe('S099')
    expect(patchBuffer).toEqual([
      {
        type: 'element',
        action: 'update',
        id: questionId,
        data: { subquestions: question?.subquestions },
      },
    ])
  })
})
