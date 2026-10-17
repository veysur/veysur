import {
  ATTRIBUTE_QUESTION_TEXT_FORMAT,
  ATTRIBUTE_QUESTION_TEXT_FORMAT_COUNTRIES,
  ATTRIBUTE_QUESTION_TEXT_FORMAT_PATTERN,
} from 'veysur-common'

import {
  SURVEY_ENTITY_TYPE_ELEMENT,
  SURVEY_ENTITY_TYPE_SUBQUESTION,
} from 'appAdmin/component/SurveyEditor'

import {
  questionTextFormatConfig,
  questionTextFormatCountriesConfig,
  questionTextFormatPatternConfig,
} from './index'

type Operations = Parameters<
  NonNullable<typeof questionTextFormatConfig.onChange>
>[1]

function buildOperations() {
  const operations = {
    setQuestionAttribute: jest.fn(),
    setSubquestionAttribute: jest.fn(),
  }
  return { operations, asOperations: operations as unknown as Operations }
}

describe.each([
  [questionTextFormatConfig, ATTRIBUTE_QUESTION_TEXT_FORMAT, 'email'],
  [
    questionTextFormatCountriesConfig,
    ATTRIBUTE_QUESTION_TEXT_FORMAT_COUNTRIES,
    'GB,US',
  ],
  [
    questionTextFormatPatternConfig,
    ATTRIBUTE_QUESTION_TEXT_FORMAT_PATTERN,
    '\\d{4}',
  ],
])('%#: text format attribute config', (config, attributeId, value) => {
  it('writes a question attribute for a question', () => {
    const { operations, asOperations } = buildOperations()
    config.onChange!(value, asOperations, {
      entityType: SURVEY_ENTITY_TYPE_ELEMENT,
      id: 'q1',
    } as never)
    expect(operations.setQuestionAttribute).toHaveBeenCalledWith(
      'q1',
      attributeId,
      value,
    )
    expect(operations.setSubquestionAttribute).not.toHaveBeenCalled()
  })

  it('writes a subquestion attribute for a matrix or multi-part text cell', () => {
    const { operations, asOperations } = buildOperations()
    config.onChange!(value, asOperations, {
      entityType: SURVEY_ENTITY_TYPE_SUBQUESTION,
      id: 'sq1',
      parentId: 'q1',
    } as never)
    expect(operations.setSubquestionAttribute).toHaveBeenCalledWith(
      'q1',
      'sq1',
      attributeId,
      value,
    )
    expect(operations.setQuestionAttribute).not.toHaveBeenCalled()
  })
})
