import { Survey, Patch, QUESTION_TYPE_MATRIX_TEXT } from 'veysur-common'

import { createMatrixOperations } from './matrixOperations'

describe('Matrix Operations - swapMatrixAxisText', () => {
  let surveyState: Survey
  let patchBuffer: Patch[]
  let operations: ReturnType<typeof createMatrixOperations>
  let questionId: string

  beforeEach(() => {
    const survey = new Survey({
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

    questionId = Survey.genElementId()
    surveyState = survey.addQuestion(
      'g1',
      { _id: questionId, type: QUESTION_TYPE_MATRIX_TEXT },
      {},
    )
    surveyState = surveyState.addSubquestion(questionId, {
      text: { en: 'Item 1' },
    })
    surveyState = surveyState.addSubquestion(questionId, {
      text: { en: 'Item 2' },
    })
    surveyState = surveyState.addAnswerOption(questionId, {
      label: { en: 'Scale 1' },
    })
    surveyState = surveyState.addAnswerOption(questionId, {
      label: { en: 'Scale 2' },
    })

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

    operations = createMatrixOperations({
      updateSurveyState,
      bufferPatches,
      setSurveyFocus,
      validateAndBuffer,
    })
  })

  test('swaps subquestion text and answer option label by position', () => {
    operations.swapMatrixAxisText(questionId)

    const question = surveyState.elements.getQuestionById(questionId)
    const subquestions = question?.subquestions ?? []
    const answerOptions = question?.answerOptions ?? []

    expect(subquestions[0].text.getLang('en')).toBe('Scale 1')
    expect(subquestions[1].text.getLang('en')).toBe('Scale 2')
    expect(answerOptions[0].label.getLang('en')).toBe('Item 1')
    expect(answerOptions[1].label.getLang('en')).toBe('Item 2')
  })

  test('leaves code/type/attributes untouched', () => {
    const question = surveyState.elements.getQuestionById(questionId)
    const originalSubquestionCodes = (question?.subquestions ?? []).map(
      (sq) => sq.code,
    )
    const originalAnswerOptionCodes = (question?.answerOptions ?? []).map(
      (ao) => ao.code,
    )

    operations.swapMatrixAxisText(questionId)

    const updatedQuestion = surveyState.elements.getQuestionById(questionId)
    expect((updatedQuestion?.subquestions ?? []).map((sq) => sq.code)).toEqual(
      originalSubquestionCodes,
    )
    expect((updatedQuestion?.answerOptions ?? []).map((ao) => ao.code)).toEqual(
      originalAnswerOptionCodes,
    )
  })

  test('emits a single question update patch with both collections', () => {
    operations.swapMatrixAxisText(questionId)

    expect(patchBuffer).toHaveLength(1)
    expect(patchBuffer[0]).toMatchObject({
      type: 'element',
      action: 'update',
      id: questionId,
    })
    expect(patchBuffer[0].data).toHaveProperty('subquestions')
    expect(patchBuffer[0].data).toHaveProperty('answerOptions')
  })

  test('is a no-op when subquestions or answerOptions is empty', () => {
    const emptyQuestionId = Survey.genElementId()
    surveyState = surveyState.addQuestion(
      'g1',
      { _id: emptyQuestionId, type: QUESTION_TYPE_MATRIX_TEXT },
      {},
    )
    surveyState = surveyState.addSubquestion(emptyQuestionId, {
      text: { en: 'Only item' },
    })
    patchBuffer = []

    operations.swapMatrixAxisText(emptyQuestionId)

    expect(patchBuffer).toHaveLength(0)
    expect(
      surveyState.elements
        .getQuestionById(emptyQuestionId)
        ?.subquestions?.[0]?.text.getLang('en'),
    ).toBe('Only item')
  })

  test('extra subquestions beyond the answer option count get an empty label, none are removed', () => {
    surveyState = surveyState.addSubquestion(questionId, {
      text: { en: 'Item 3 (extra)' },
    })
    patchBuffer = []

    operations.swapMatrixAxisText(questionId)

    const question = surveyState.elements.getQuestionById(questionId)
    const subquestions = question?.subquestions ?? []
    const answerOptions = question?.answerOptions ?? []

    expect(subquestions).toHaveLength(3)
    expect(answerOptions).toHaveLength(2)
    expect(subquestions[0].text.getLang('en')).toBe('Scale 1')
    expect(subquestions[1].text.getLang('en')).toBe('Scale 2')
    expect(subquestions[2].text.getLang('en')).toBe('')
    expect(answerOptions[0].label.getLang('en')).toBe('Item 1')
    expect(answerOptions[1].label.getLang('en')).toBe('Item 2')
  })

  test('extra answer options beyond the subquestion count get an empty label, none are removed', () => {
    surveyState = surveyState.addAnswerOption(questionId, {
      label: { en: 'Scale 3 (extra)' },
    })
    patchBuffer = []

    operations.swapMatrixAxisText(questionId)

    const question = surveyState.elements.getQuestionById(questionId)
    const subquestions = question?.subquestions ?? []
    const answerOptions = question?.answerOptions ?? []

    expect(subquestions).toHaveLength(2)
    expect(answerOptions).toHaveLength(3)
    expect(subquestions[0].text.getLang('en')).toBe('Scale 1')
    expect(subquestions[1].text.getLang('en')).toBe('Scale 2')
    expect(answerOptions[0].label.getLang('en')).toBe('Item 1')
    expect(answerOptions[1].label.getLang('en')).toBe('Item 2')
    expect(answerOptions[2].label.getLang('en')).toBe('')
  })
})
