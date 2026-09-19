import { SurveyQuestion } from '../../constructor/Survey/SurveyQuestion'
import { AttributeCompatibilityChecker } from './AttributeCompatibilityChecker'
import {
  ATTRIBUTE_QUESTION_REQUIRED,
  ATTRIBUTE_CHOICE_MIN_MAX,
  ATTRIBUTE_QUESTION_LENGTH_MIN_MAX,
  ATTRIBUTE_QUESTION_NUMBER_MIN_MAX,
  ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED,
  QUESTION_TYPE_TEXT,
  QUESTION_TYPE_NUMBER,
  QUESTION_TYPE_CHECKBOX,
} from '../../constructor/Survey/attributeMeta'

describe('AttributeCompatibilityChecker', () => {
  const checker = new AttributeCompatibilityChecker()

  describe('checkQuestionAttributes', () => {
    test('should return empty array when questions have no attributes', () => {
      const questionA = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_TEXT,
        text: { en: 'Question 1' },
        attributes: {},
      })
      const questionB = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_TEXT,
        text: { en: 'Question 1' },
        attributes: {},
      })

      const result = checker.checkQuestionAttributes(questionA, questionB)

      expect(result).toEqual([])
    })

    test('should return empty array when attributes are compatible', () => {
      const questionA = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_TEXT,
        text: { en: 'Question 1' },
        attributes: {
          [ATTRIBUTE_QUESTION_REQUIRED]: true,
          [ATTRIBUTE_QUESTION_LENGTH_MIN_MAX]: { min: 5, max: 100 },
        },
      })
      const questionB = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_TEXT,
        text: { en: 'Question 1' },
        attributes: {
          [ATTRIBUTE_QUESTION_REQUIRED]: true,
          [ATTRIBUTE_QUESTION_LENGTH_MIN_MAX]: { min: 5, max: 100 },
        },
      })

      const result = checker.checkQuestionAttributes(questionA, questionB)

      expect(result).toEqual([])
    })
  })

  describe('required attribute', () => {
    test('should be compatible when both required', () => {
      const questionA = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_TEXT,
        text: { en: 'Question 1' },
        attributes: { [ATTRIBUTE_QUESTION_REQUIRED]: true },
      })
      const questionB = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_TEXT,
        text: { en: 'Question 1' },
        attributes: { [ATTRIBUTE_QUESTION_REQUIRED]: true },
      })

      const result = checker.checkQuestionAttributes(questionA, questionB)

      expect(result).toEqual([])
    })

    test('should be compatible when both optional', () => {
      const questionA = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_TEXT,
        text: { en: 'Question 1' },
        attributes: { [ATTRIBUTE_QUESTION_REQUIRED]: false },
      })
      const questionB = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_TEXT,
        text: { en: 'Question 1' },
        attributes: { [ATTRIBUTE_QUESTION_REQUIRED]: false },
      })

      const result = checker.checkQuestionAttributes(questionA, questionB)

      expect(result).toEqual([])
    })

    test('should be compatible when source required, target optional', () => {
      const questionA = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_TEXT,
        text: { en: 'Question 1' },
        attributes: { [ATTRIBUTE_QUESTION_REQUIRED]: true },
      })
      const questionB = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_TEXT,
        text: { en: 'Question 1' },
        attributes: { [ATTRIBUTE_QUESTION_REQUIRED]: false },
      })

      const result = checker.checkQuestionAttributes(questionA, questionB)

      expect(result).toEqual([])
    })

    test('should be INCOMPATIBLE when source optional, target required', () => {
      const questionA = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_TEXT,
        text: { en: 'Question 1' },
        attributes: { [ATTRIBUTE_QUESTION_REQUIRED]: false },
      })
      const questionB = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_TEXT,
        text: { en: 'Question 1' },
        attributes: { [ATTRIBUTE_QUESTION_REQUIRED]: true },
      })

      const result = checker.checkQuestionAttributes(questionA, questionB)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        path: `questions[Q1].attributes.${ATTRIBUTE_QUESTION_REQUIRED}`,
        reason: 'incompatible_required_constraint',
        itemType: 'question',
        itemCode: 'Q1',
        attributeName: ATTRIBUTE_QUESTION_REQUIRED,
        sourceAttributeValue: false,
        targetAttributeValue: true,
        message: expect.stringContaining('now required but was optional'),
      })
    })
  })

  describe('choiceMinMax attribute (answer-option types)', () => {
    test('should be compatible with same constraints', () => {
      const questionA = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_CHECKBOX,
        text: { en: 'Question 1' },
        attributes: {
          [ATTRIBUTE_CHOICE_MIN_MAX]: { min: 2, max: 5 },
        },
      })
      const questionB = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_CHECKBOX,
        text: { en: 'Question 1' },
        attributes: {
          [ATTRIBUTE_CHOICE_MIN_MAX]: { min: 2, max: 5 },
        },
      })

      const result = checker.checkQuestionAttributes(questionA, questionB)

      expect(result).toEqual([])
    })

    test('should be compatible when target has lower min', () => {
      const questionA = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_CHECKBOX,
        text: { en: 'Question 1' },
        attributes: {
          [ATTRIBUTE_CHOICE_MIN_MAX]: { min: 2, max: 5 },
        },
      })
      const questionB = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_CHECKBOX,
        text: { en: 'Question 1' },
        attributes: {
          [ATTRIBUTE_CHOICE_MIN_MAX]: { min: 1, max: 5 },
        },
      })

      const result = checker.checkQuestionAttributes(questionA, questionB)

      expect(result).toEqual([])
    })

    test('should be compatible when target has higher max', () => {
      const questionA = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_CHECKBOX,
        text: { en: 'Question 1' },
        attributes: {
          [ATTRIBUTE_CHOICE_MIN_MAX]: { min: 2, max: 5 },
        },
      })
      const questionB = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_CHECKBOX,
        text: { en: 'Question 1' },
        attributes: {
          [ATTRIBUTE_CHOICE_MIN_MAX]: { min: 2, max: 10 },
        },
      })

      const result = checker.checkQuestionAttributes(questionA, questionB)

      expect(result).toEqual([])
    })

    test('should be compatible when target has no max (unlimited)', () => {
      const questionA = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_CHECKBOX,
        text: { en: 'Question 1' },
        attributes: {
          [ATTRIBUTE_CHOICE_MIN_MAX]: { min: 2, max: 5 },
        },
      })
      const questionB = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_CHECKBOX,
        text: { en: 'Question 1' },
        attributes: {
          [ATTRIBUTE_CHOICE_MIN_MAX]: { min: 2, max: 0 },
        },
      })

      const result = checker.checkQuestionAttributes(questionA, questionB)

      expect(result).toEqual([])
    })

    test('should be INCOMPATIBLE when target has higher min', () => {
      const questionA = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_CHECKBOX,
        text: { en: 'Question 1' },
        attributes: {
          [ATTRIBUTE_CHOICE_MIN_MAX]: { min: 2, max: 5 },
        },
      })
      const questionB = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_CHECKBOX,
        text: { en: 'Question 1' },
        attributes: {
          [ATTRIBUTE_CHOICE_MIN_MAX]: { min: 3, max: 5 },
        },
      })

      const result = checker.checkQuestionAttributes(questionA, questionB)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        reason: 'incompatible_choice_constraint',
        itemCode: 'Q1',
        sourceAttributeValue: { min: 2, max: 5 },
        targetAttributeValue: { min: 3, max: 5 },
      })
    })

    test('should be INCOMPATIBLE when target has lower max', () => {
      const questionA = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_CHECKBOX,
        text: { en: 'Question 1' },
        attributes: {
          [ATTRIBUTE_CHOICE_MIN_MAX]: { min: 2, max: 5 },
        },
      })
      const questionB = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_CHECKBOX,
        text: { en: 'Question 1' },
        attributes: {
          [ATTRIBUTE_CHOICE_MIN_MAX]: { min: 2, max: 4 },
        },
      })

      const result = checker.checkQuestionAttributes(questionA, questionB)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        reason: 'incompatible_choice_constraint',
        itemCode: 'Q1',
        sourceAttributeValue: { min: 2, max: 5 },
        targetAttributeValue: { min: 2, max: 4 },
      })
    })

    test('should be INCOMPATIBLE when target adds max constraint', () => {
      const questionA = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_CHECKBOX,
        text: { en: 'Question 1' },
        attributes: {
          [ATTRIBUTE_CHOICE_MIN_MAX]: { min: 2, max: 0 },
        },
      })
      const questionB = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_CHECKBOX,
        text: { en: 'Question 1' },
        attributes: {
          [ATTRIBUTE_CHOICE_MIN_MAX]: { min: 2, max: 5 },
        },
      })

      const result = checker.checkQuestionAttributes(questionA, questionB)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        reason: 'incompatible_choice_constraint',
        itemCode: 'Q1',
      })
    })
  })

  describe('lengthMinMax attribute (text)', () => {
    test('should be compatible with same constraints', () => {
      const questionA = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_TEXT,
        text: { en: 'Question 1' },
        attributes: {
          [ATTRIBUTE_QUESTION_LENGTH_MIN_MAX]: { min: 10, max: 100 },
        },
      })
      const questionB = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_TEXT,
        text: { en: 'Question 1' },
        attributes: {
          [ATTRIBUTE_QUESTION_LENGTH_MIN_MAX]: { min: 10, max: 100 },
        },
      })

      const result = checker.checkQuestionAttributes(questionA, questionB)

      expect(result).toEqual([])
    })

    test('should be INCOMPATIBLE when target has higher min', () => {
      const questionA = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_TEXT,
        text: { en: 'Question 1' },
        attributes: {
          [ATTRIBUTE_QUESTION_LENGTH_MIN_MAX]: { min: 10, max: 100 },
        },
      })
      const questionB = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_TEXT,
        text: { en: 'Question 1' },
        attributes: {
          [ATTRIBUTE_QUESTION_LENGTH_MIN_MAX]: { min: 20, max: 100 },
        },
      })

      const result = checker.checkQuestionAttributes(questionA, questionB)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        reason: 'incompatible_length_constraint',
        itemCode: 'Q1',
      })
    })

    test('should be INCOMPATIBLE when target has lower max', () => {
      const questionA = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_TEXT,
        text: { en: 'Question 1' },
        attributes: {
          [ATTRIBUTE_QUESTION_LENGTH_MIN_MAX]: { min: 10, max: 100 },
        },
      })
      const questionB = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_TEXT,
        text: { en: 'Question 1' },
        attributes: {
          [ATTRIBUTE_QUESTION_LENGTH_MIN_MAX]: { min: 10, max: 50 },
        },
      })

      const result = checker.checkQuestionAttributes(questionA, questionB)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        reason: 'incompatible_length_constraint',
        itemCode: 'Q1',
      })
    })
  })

  describe('numberMinMax attribute (number)', () => {
    test('should be compatible with same constraints', () => {
      const questionA = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_NUMBER,
        text: { en: 'Question 1' },
        attributes: {
          [ATTRIBUTE_QUESTION_NUMBER_MIN_MAX]: { min: 0, max: 100 },
        },
      })
      const questionB = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_NUMBER,
        text: { en: 'Question 1' },
        attributes: {
          [ATTRIBUTE_QUESTION_NUMBER_MIN_MAX]: { min: 0, max: 100 },
        },
      })

      const result = checker.checkQuestionAttributes(questionA, questionB)

      expect(result).toEqual([])
    })

    test('should be INCOMPATIBLE when target has higher min', () => {
      const questionA = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_NUMBER,
        text: { en: 'Question 1' },
        attributes: {
          [ATTRIBUTE_QUESTION_NUMBER_MIN_MAX]: { min: 0, max: 100 },
        },
      })
      const questionB = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_NUMBER,
        text: { en: 'Question 1' },
        attributes: {
          [ATTRIBUTE_QUESTION_NUMBER_MIN_MAX]: { min: 10, max: 100 },
        },
      })

      const result = checker.checkQuestionAttributes(questionA, questionB)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        reason: 'incompatible_number_constraint',
        itemCode: 'Q1',
      })
    })
  })

  describe('numberNegAllowed attribute (number)', () => {
    test('should be compatible when both allow negatives', () => {
      const questionA = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_NUMBER,
        text: { en: 'Question 1' },
        attributes: { [ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED]: true },
      })
      const questionB = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_NUMBER,
        text: { en: 'Question 1' },
        attributes: { [ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED]: true },
      })

      const result = checker.checkQuestionAttributes(questionA, questionB)

      expect(result).toEqual([])
    })

    test('should be compatible when both disallow negatives', () => {
      const questionA = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_NUMBER,
        text: { en: 'Question 1' },
        attributes: { [ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED]: false },
      })
      const questionB = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_NUMBER,
        text: { en: 'Question 1' },
        attributes: { [ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED]: false },
      })

      const result = checker.checkQuestionAttributes(questionA, questionB)

      expect(result).toEqual([])
    })

    test('should be compatible when source disallows, target allows', () => {
      const questionA = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_NUMBER,
        text: { en: 'Question 1' },
        attributes: { [ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED]: false },
      })
      const questionB = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_NUMBER,
        text: { en: 'Question 1' },
        attributes: { [ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED]: true },
      })

      const result = checker.checkQuestionAttributes(questionA, questionB)

      expect(result).toEqual([])
    })

    test('should be INCOMPATIBLE when source allows, target disallows', () => {
      const questionA = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_NUMBER,
        text: { en: 'Question 1' },
        attributes: { [ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED]: true },
      })
      const questionB = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_NUMBER,
        text: { en: 'Question 1' },
        attributes: { [ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED]: false },
      })

      const result = checker.checkQuestionAttributes(questionA, questionB)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        path: `questions[Q1].attributes.${ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED}`,
        reason: 'incompatible_negative_constraint',
        itemType: 'question',
        itemCode: 'Q1',
        attributeName: ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED,
        sourceAttributeValue: true,
        targetAttributeValue: false,
        message: expect.stringContaining('no longer allows negative numbers'),
      })
    })
  })

  describe('multiple attribute incompatibilities', () => {
    test('should detect multiple incompatibilities in a single question', () => {
      const questionA = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_NUMBER,
        text: { en: 'Question 1' },
        attributes: {
          [ATTRIBUTE_QUESTION_REQUIRED]: false,
          [ATTRIBUTE_QUESTION_NUMBER_MIN_MAX]: { min: 0, max: 100 },
          [ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED]: true,
        },
      })
      const questionB = new SurveyQuestion({
        code: 'Q1',
        type: QUESTION_TYPE_NUMBER,
        text: { en: 'Question 1' },
        attributes: {
          [ATTRIBUTE_QUESTION_REQUIRED]: true,
          [ATTRIBUTE_QUESTION_NUMBER_MIN_MAX]: { min: 10, max: 50 },
          [ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED]: false,
        },
      })

      const result = checker.checkQuestionAttributes(questionA, questionB)

      expect(result).toHaveLength(3)
      expect(result.map((r) => r.reason)).toEqual(
        expect.arrayContaining([
          'incompatible_required_constraint',
          'incompatible_number_constraint',
          'incompatible_negative_constraint',
        ]),
      )
    })
  })
})
