import {
  QuestionInfo,
  CONDITION_OPERAND_TYPE_QUESTION,
  CONDITION_OPERAND_TYPE_ANSWER_SELECTED,
  CONDITION_OPERAND_TYPE_ANSWER_VALUE,
  CONDITION_OPERAND_TYPE_MATRIX_CELL,
  CONDITION_OPERAND_TYPE_MATRIX_ANSWER_SELECTED,
  CONDITION_OPERAND_TYPE_MULTI_PART_ANSWER_SELECTED,
  CHOICE_OTHER_VALUE_KEY,
  QUESTION_TYPE_DROPDOWN,
  QUESTION_TYPE_TEXT,
  QUESTION_TYPE_YES_NO,
  QUESTION_TYPE_MATRIX_TEXT,
  QUESTION_TYPE_MATRIX_YES_NO,
  QUESTION_TYPE_MULTI_PART_TEXT,
  QUESTION_TYPE_MULTI_PART_YES_NO,
} from 'veysur-common'

import { deriveOperandForQuestion } from './LeftOperandSelector'

const choiceQuestion: QuestionInfo = {
  code: 'Q001',
  type: QUESTION_TYPE_DROPDOWN,
  position: 1,
  answerOptionCodes: ['A001', 'A002'],
  answerOptions: [{ code: 'A001' }, { code: 'A002' }],
}

const plainQuestion: QuestionInfo = {
  code: 'Q002',
  type: QUESTION_TYPE_TEXT,
  position: 2,
}

const matrixWithBooleanRow: QuestionInfo = {
  code: 'Q003',
  type: QUESTION_TYPE_MATRIX_YES_NO,
  position: 3,
  answerOptionCodes: ['A001'],
  answerOptions: [{ code: 'A001' }],
  subquestions: [{ code: 'S001', type: QUESTION_TYPE_YES_NO }],
}

const matrixWithoutBooleanRow: QuestionInfo = {
  code: 'Q004',
  type: QUESTION_TYPE_MATRIX_TEXT,
  position: 4,
  answerOptionCodes: ['A001'],
  answerOptions: [{ code: 'A001' }],
  subquestions: [{ code: 'S001', type: QUESTION_TYPE_TEXT }],
}

const multiPartWithPredefinedOptions: QuestionInfo = {
  code: 'Q005',
  type: QUESTION_TYPE_MULTI_PART_YES_NO,
  position: 5,
  subquestions: [{ code: 'P001', type: QUESTION_TYPE_YES_NO }],
}

const multiPartWithoutPredefinedOptions: QuestionInfo = {
  code: 'Q006',
  type: QUESTION_TYPE_MULTI_PART_TEXT,
  position: 6,
  subquestions: [{ code: 'P001', type: QUESTION_TYPE_TEXT }],
}

describe('deriveOperandForQuestion (fresh default, no preserveType)', () => {
  it('defaults a plain question to a bare question-value operand', () => {
    expect(deriveOperandForQuestion(plainQuestion)).toEqual({
      type: CONDITION_OPERAND_TYPE_QUESTION,
      questionCode: 'Q002',
    })
  })

  it('defaults a matrix question with a boolean row to matrixAnswerSelected', () => {
    expect(deriveOperandForQuestion(matrixWithBooleanRow)).toEqual({
      type: CONDITION_OPERAND_TYPE_MATRIX_ANSWER_SELECTED,
      questionCode: 'Q003',
      subquestionCode: 'S001',
      optionCode: 'A001',
    })
  })

  it('defaults a matrix question without a boolean row to matrixCell', () => {
    expect(deriveOperandForQuestion(matrixWithoutBooleanRow)).toEqual({
      type: CONDITION_OPERAND_TYPE_MATRIX_CELL,
      questionCode: 'Q004',
      subquestionCode: 'S001',
      optionCode: 'A001',
    })
  })

  it('defaults a Multi-Part question with predefined part options to multiPartAnswerSelected', () => {
    expect(deriveOperandForQuestion(multiPartWithPredefinedOptions)).toEqual({
      type: CONDITION_OPERAND_TYPE_MULTI_PART_ANSWER_SELECTED,
      questionCode: 'Q005',
      subquestionCode: 'P001',
      literalValue: true,
    })
  })

  it('defaults a Multi-Part question without predefined part options to answerValue', () => {
    expect(deriveOperandForQuestion(multiPartWithoutPredefinedOptions)).toEqual(
      {
        type: CONDITION_OPERAND_TYPE_ANSWER_VALUE,
        questionCode: 'Q006',
        optionCode: 'P001',
      },
    )
  })
})

describe('deriveOperandForQuestion (preserveType — question changed)', () => {
  it('keeps answerSelected when the new question is also a choice question', () => {
    const result = deriveOperandForQuestion(
      choiceQuestion,
      CONDITION_OPERAND_TYPE_ANSWER_SELECTED,
    )
    expect(result).toEqual({
      type: CONDITION_OPERAND_TYPE_ANSWER_SELECTED,
      questionCode: 'Q001',
      optionCode: 'A001',
    })
  })

  it('keeps answerValue when the new question is also a choice question, defaulting to the OTHER value', () => {
    const result = deriveOperandForQuestion(
      choiceQuestion,
      CONDITION_OPERAND_TYPE_ANSWER_VALUE,
    )
    expect(result).toEqual({
      type: CONDITION_OPERAND_TYPE_ANSWER_VALUE,
      questionCode: 'Q001',
      optionCode: CHOICE_OTHER_VALUE_KEY,
    })
  })

  it('falls back to the default sub-type when the preserved type no longer applies', () => {
    // answerSelected only makes sense for choice questions — switching to a
    // plain text question should fall back to bestDefaultSubType, not keep
    // an answerSelected operand pointed at a question with no options.
    const result = deriveOperandForQuestion(
      plainQuestion,
      CONDITION_OPERAND_TYPE_ANSWER_SELECTED,
    )
    expect(result).toEqual({
      type: CONDITION_OPERAND_TYPE_QUESTION,
      questionCode: 'Q002',
    })
  })

  it('falls back to the default sub-type when switching from Choice to Matrix', () => {
    const result = deriveOperandForQuestion(
      matrixWithBooleanRow,
      CONDITION_OPERAND_TYPE_ANSWER_SELECTED,
    )
    expect(result).toEqual({
      type: CONDITION_OPERAND_TYPE_MATRIX_ANSWER_SELECTED,
      questionCode: 'Q003',
      subquestionCode: 'S001',
      optionCode: 'A001',
    })
  })

  it('does not preserve matrixAnswerSelected when the new matrix question has no boolean row', () => {
    const result = deriveOperandForQuestion(
      matrixWithoutBooleanRow,
      CONDITION_OPERAND_TYPE_MATRIX_ANSWER_SELECTED,
    )
    expect(result).toEqual({
      type: CONDITION_OPERAND_TYPE_MATRIX_CELL,
      questionCode: 'Q004',
      subquestionCode: 'S001',
      optionCode: 'A001',
    })
  })

  it('does not preserve multiPartAnswerSelected when the new Multi-Part question has no predefined options', () => {
    const result = deriveOperandForQuestion(
      multiPartWithoutPredefinedOptions,
      CONDITION_OPERAND_TYPE_MULTI_PART_ANSWER_SELECTED,
    )
    expect(result).toEqual({
      type: CONDITION_OPERAND_TYPE_ANSWER_VALUE,
      questionCode: 'Q006',
      optionCode: 'P001',
    })
  })
})
