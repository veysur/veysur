// cspell:ignore unsets nicht voll
import { Survey, Patch, QUESTION_TYPE_POINT_5 } from 'veysur-common'

import { createAnswerOptionOperations } from './answerOptionOperations'
import {
  ValidateAndBufferConfig,
  ValidateAndBufferFn,
} from '../../validation/useValidateAndBuffer'

describe('Answer Option Operations - updateAnswerOptionLabel', () => {
  let survey: Survey
  let patchBuffer: Patch[]
  let surveyState: Survey
  let operations: ReturnType<typeof createAnswerOptionOperations>
  let validateAndBuffer: jest.MockedFunction<ValidateAndBufferFn>
  let questionId: string
  let answerId: string

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

    // Populate a point-5 question, which comes pre-seeded with 5 answer
    // options (codes P1..P5, empty labels).
    survey = survey.addQuestion('g1', {
      text: { en: 'Rate us' },
      type: QUESTION_TYPE_POINT_5,
    })
    questionId = survey.elements
      .questionList()
      .filter((q) => q.sectionId === 'g1')[0]._id
    answerId =
      survey.elements.getQuestionById(questionId)!.answerOptions![0]._id

    // Give the first answer option an existing default-language label so
    // there is something to clear.
    survey = survey.mutateAnswerOption(questionId, answerId, (ao) =>
      ao.updateLabel('Strongly disagree', 'en', 'en'),
    )

    surveyState = survey
    patchBuffer = []

    const updateSurveyState = (updater: (s: Survey) => Survey) => {
      surveyState = updater(surveyState)
    }

    const bufferPatches = (patches: Patch[]) => {
      patchBuffer.push(...patches)
    }

    const setSurveyFocus = jest.fn()

    // Spy that records whether `validation` was passed, rather than a
    // no-op — this is the crux of the label-deletion bug: validation must
    // be omitted for a deletion, but present for a normal update.
    validateAndBuffer = jest.fn(({ patches }: ValidateAndBufferConfig) => {
      bufferPatches(patches)
    }) as jest.MockedFunction<ValidateAndBufferFn>

    operations = createAnswerOptionOperations({
      updateSurveyState,
      bufferPatches,
      setSurveyFocus,
      validateAndBuffer,
    })
  })

  test('clearing the default-language label omits validation and stores the empty label directly', () => {
    operations.updateAnswerOptionLabel(questionId, answerId, '', 'en', 'en')

    expect(validateAndBuffer).toHaveBeenCalledTimes(1)
    const config = validateAndBuffer.mock.calls[0][0]

    expect(config.validation).toBeUndefined()

    const patch = config.patches[0]
    expect(patch.data!.label).toEqual({ en: '' })
    // Not the secondary-language deletion shape.
    expect(patch.data!.label).not.toHaveProperty('en', null)
  })

  test('clearing a secondary-language label omits validation and unsets that language', () => {
    // Give the same answer option a German label first.
    surveyState = surveyState.mutateAnswerOption(questionId, answerId, (ao) =>
      ao.updateLabel('Stimme nicht zu', 'de', 'en'),
    )

    operations.updateAnswerOptionLabel(questionId, answerId, '', 'de', 'en')

    expect(validateAndBuffer).toHaveBeenCalledTimes(1)
    const config = validateAndBuffer.mock.calls[0][0]

    expect(config.validation).toBeUndefined()

    const patch = config.patches[0]
    const label = patch.data!.label as Record<string, unknown>
    expect(label.de).toBeNull()
    // The rest of the (updated) label is preserved alongside the unset key.
    expect(label.en).toBe('Strongly disagree')
  })

  test('setting a non-empty default-language label still runs with validation present', () => {
    operations.updateAnswerOptionLabel(
      questionId,
      answerId,
      'Strongly agree',
      'en',
      'en',
    )

    expect(validateAndBuffer).toHaveBeenCalledTimes(1)
    const config = validateAndBuffer.mock.calls[0][0]

    expect(config.validation).toBeDefined()
    expect(config.validation?.value).toBe('Strongly agree')
    expect(config.validation?.entityId).toBe(answerId)
  })

  test('setting a non-empty secondary-language label still runs with validation present', () => {
    operations.updateAnswerOptionLabel(
      questionId,
      answerId,
      'Stimme voll zu',
      'de',
      'en',
    )

    expect(validateAndBuffer).toHaveBeenCalledTimes(1)
    const config = validateAndBuffer.mock.calls[0][0]

    expect(config.validation).toBeDefined()
    expect(config.validation?.value).toBe('Stimme voll zu')
    expect(config.validation?.entityId).toBe(answerId)
  })
})
