import { ResponseMapper } from './ResponseMapper'
import {
  Survey,
  SurveyQuestion,
  SurveyResponse,
  SurveyAnswerOptionCollection,
  SurveySubquestionCollection,
  SurveyElementCollection,
  ATTRIBUTE_CHOICE_MIN_MAX,
} from 'veysur-common'

describe('ResponseMapper', () => {
  describe('mapResponse', () => {
    describe('metadata keys', () => {
      test('should transfer LANG metadata key directly', () => {
        const sourceSurvey = new Survey({
          _id: 'source',
          title: { en: 'Source' },
        })
        const targetSurvey = new Survey({
          _id: 'target',
          title: { en: 'Target' },
        })
        const sourceResponse = new SurveyResponse({
          _id: 'r1',
          answers: {
            LANG: 'fr',
          },
        })

        const result = ResponseMapper.mapResponse(
          sourceResponse,
          sourceSurvey,
          targetSurvey,
        )

        expect(result.mappedAnswers.LANG).toBe('fr')
        expect(result.skippedAnswers).toHaveLength(0)
      })

      test('should transfer metadata keys without question validation', () => {
        const sourceSurvey = new Survey({
          _id: 'source',
          title: { en: 'Source' },
        })
        const targetSurvey = new Survey({
          _id: 'target',
          title: { en: 'Target' },
        })
        const sourceResponse = new SurveyResponse({
          _id: 'r1',
          answers: {
            LANG: 'es',
          },
        })

        const result = ResponseMapper.mapResponse(
          sourceResponse,
          sourceSurvey,
          targetSurvey,
        )

        expect(result.mappedAnswers.LANG).toBe('es')
      })
    })

    describe('missing questions', () => {
      test('should skip answer when question missing in target survey', () => {
        const sourceSurvey = new Survey({
          _id: 'source',
          title: { en: 'Source' },
          elements: new SurveyElementCollection().add({
            _id: 'q1',
            code: 'Q001',
            type: 'text',
            text: { en: 'Question 1' },
          }),
        })
        const targetSurvey = new Survey({
          _id: 'target',
          title: { en: 'Target' },
        })
        const sourceResponse = new SurveyResponse({
          _id: 'r1',
          answers: {
            Q001: 'Some answer',
          },
        })

        const result = ResponseMapper.mapResponse(
          sourceResponse,
          sourceSurvey,
          targetSurvey,
        )

        expect(result.mappedAnswers).toEqual({})
        expect(result.skippedAnswers).toHaveLength(1)
        expect(result.skippedAnswers[0]).toEqual({
          questionCode: 'Q001',
          reason: 'missing_question',
          originalValue: 'Some answer',
        })
      })

      test('should skip answer when question missing in source survey', () => {
        const sourceSurvey = new Survey({
          _id: 'source',
          title: { en: 'Source' },
        })
        const targetSurvey = new Survey({
          _id: 'target',
          title: { en: 'Target' },
        })
        const sourceResponse = new SurveyResponse({
          _id: 'r1',
          answers: {
            Q001: 'Some answer',
          },
        })

        const result = ResponseMapper.mapResponse(
          sourceResponse,
          sourceSurvey,
          targetSurvey,
        )

        expect(result.mappedAnswers).toEqual({})
        expect(result.skippedAnswers).toHaveLength(1)
        expect(result.skippedAnswers[0]).toEqual({
          questionCode: 'Q001',
          reason: 'missing_question',
          originalValue: 'Some answer',
        })
      })
    })

    describe('simple input types', () => {
      test.each(['text', 'number', 'date', 'time', 'dateTime'])(
        'should map %s type directly',
        (questionType) => {
          const sourceSurvey = new Survey({
            _id: 'source',
            title: { en: 'Source' },
            elements: new SurveyElementCollection().add({
              _id: 'q1',
              code: 'Q001',
              type: questionType,
              text: { en: 'Question 1' },
            }),
          })
          const targetSurvey = new Survey({
            _id: 'target',
            title: { en: 'Target' },
            elements: new SurveyElementCollection().add({
              _id: 'q2',
              code: 'Q001',
              type: questionType,
              text: { en: 'Question 1' },
            }),
          })
          const sourceResponse = new SurveyResponse({
            _id: 'r1',
            answers: {
              Q001: 'Test answer',
            },
          })

          const result = ResponseMapper.mapResponse(
            sourceResponse,
            sourceSurvey,
            targetSurvey,
          )

          expect(result.mappedAnswers.Q001).toBe('Test answer')
          expect(result.skippedAnswers).toHaveLength(0)
        },
      )

      test('should map surveyLangSelect type directly', () => {
        const sourceSurvey = new Survey({
          _id: 'source',
          title: { en: 'Source' },
          elements: new SurveyElementCollection().add({
            _id: 'q1',
            code: 'Q001',
            type: 'surveyLangSelect',
            text: { en: 'Question 1' },
          }),
        })
        const targetSurvey = new Survey({
          _id: 'target',
          title: { en: 'Target' },
          elements: new SurveyElementCollection().add({
            _id: 'q2',
            code: 'Q001',
            type: 'surveyLangSelect',
            text: { en: 'Question 1' },
          }),
        })
        const sourceResponse = new SurveyResponse({
          _id: 'r1',
          answers: {
            Q001: 'en',
          },
        })

        const result = ResponseMapper.mapResponse(
          sourceResponse,
          sourceSurvey,
          targetSurvey,
        )

        expect(result.mappedAnswers.Q001).toBe('en')
        expect(result.skippedAnswers).toHaveLength(0)
      })
    })
  })

  describe('validateAnswer', () => {
    describe('type compatibility', () => {
      test('should allow same question types', () => {
        const sourceQuestion = new SurveyQuestion({
          _id: 'q1',
          code: 'Q001',
          type: 'text',
          text: { en: 'Question 1' },
        })
        const targetQuestion = new SurveyQuestion({
          _id: 'q2',
          code: 'Q001',
          type: 'text',
          text: { en: 'Question 1' },
        })

        const result = ResponseMapper.validateAnswer(
          'Q001',
          'test answer',
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(true)
        expect(result.mappedValue).toBe('test answer')
      })

      test('should allow date-typed questions (regression: date/time/dateTime were previously rejected as incompatible_type)', () => {
        const sourceQuestion = new SurveyQuestion({
          _id: 'q1',
          code: 'Q001',
          type: 'date',
          text: { en: 'Question 1' },
        })
        const targetQuestion = new SurveyQuestion({
          _id: 'q2',
          code: 'Q001',
          type: 'date',
          text: { en: 'Question 1' },
        })

        const result = ResponseMapper.validateAnswer(
          'Q001',
          '2026-01-15',
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(true)
        expect(result.mappedValue).toBe('2026-01-15')
      })

      test('should reject any type change', () => {
        const sourceQuestion = new SurveyQuestion({
          _id: 'q1',
          code: 'Q001',
          type: 'text',
          text: { en: 'Question 1' },
        })
        const targetQuestion = new SurveyQuestion({
          _id: 'q2',
          code: 'Q001',
          type: 'number',
          text: { en: 'Question 1' },
        })

        const result = ResponseMapper.validateAnswer(
          'Q001',
          'test answer',
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(false)
        expect(result.reason).toBe('incompatible_type')
      })
    })

    describe('multiple choice questions', () => {
      let sourceOptions: SurveyAnswerOptionCollection
      let targetOptions: SurveyAnswerOptionCollection

      beforeEach(() => {
        sourceOptions = new SurveyAnswerOptionCollection()
          .add({ _id: 'a1', code: 'A001', label: { en: 'Option 1' } })
          .add({ _id: 'a2', code: 'A002', label: { en: 'Option 2' } })
          .add({ _id: 'a3', code: 'A003', label: { en: 'Option 3' } })

        targetOptions = new SurveyAnswerOptionCollection()
          .add({ _id: 'b1', code: 'A001', label: { en: 'Option 1' } })
          .add({ _id: 'b2', code: 'A002', label: { en: 'Option 2' } })
      })

      test('should map multipleChoice answer with all matching options', () => {
        const sourceQuestion = new SurveyQuestion({
          _id: 'q1',
          code: 'Q001',
          type: 'checkbox',
          text: { en: 'Question 1' },
          answerOptions: sourceOptions,
        })
        const targetQuestion = new SurveyQuestion({
          _id: 'q2',
          code: 'Q001',
          type: 'checkbox',
          text: { en: 'Question 1' },
          answerOptions: targetOptions,
        })

        const result = ResponseMapper.validateAnswer(
          'Q001',
          { A001: true, A002: true },
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(true)
        expect(result.mappedValue).toEqual({ A001: true, A002: true })
      })

      test('should filter out missing options in multipleChoice answer', () => {
        const sourceQuestion = new SurveyQuestion({
          _id: 'q1',
          code: 'Q001',
          type: 'checkbox',
          text: { en: 'Question 1' },
          answerOptions: sourceOptions,
        })
        const targetQuestion = new SurveyQuestion({
          _id: 'q2',
          code: 'Q001',
          type: 'checkbox',
          text: { en: 'Question 1' },
          answerOptions: targetOptions,
        })

        const result = ResponseMapper.validateAnswer(
          'Q001',
          { A001: true, A003: true },
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(true)
        expect(result.mappedValue).toEqual({ A001: true })
      })

      test('should handle empty object', () => {
        const sourceQuestion = new SurveyQuestion({
          _id: 'q1',
          code: 'Q001',
          type: 'checkbox',
          text: { en: 'Question 1' },
          answerOptions: sourceOptions,
        })
        const targetQuestion = new SurveyQuestion({
          _id: 'q2',
          code: 'Q001',
          type: 'checkbox',
          text: { en: 'Question 1' },
          answerOptions: targetOptions,
        })

        const result = ResponseMapper.validateAnswer(
          'Q001',
          {},
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(true)
        expect(result.mappedValue).toEqual({})
      })

      test('should reject when no valid options remain', () => {
        const targetOptionsEmpty = new SurveyAnswerOptionCollection()

        const sourceQuestion = new SurveyQuestion({
          _id: 'q1',
          code: 'Q001',
          type: 'checkbox',
          text: { en: 'Question 1' },
          answerOptions: sourceOptions,
        })
        const targetQuestion = new SurveyQuestion({
          _id: 'q2',
          code: 'Q001',
          type: 'checkbox',
          text: { en: 'Question 1' },
          answerOptions: targetOptionsEmpty,
        })

        const result = ResponseMapper.validateAnswer(
          'Q001',
          { A001: true, A002: true },
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(false)
        expect(result.reason).toBe('missing_option')
      })

      test('should reject non-object value for multipleChoice', () => {
        const sourceQuestion = new SurveyQuestion({
          _id: 'q1',
          code: 'Q001',
          type: 'checkbox',
          text: { en: 'Question 1' },
          answerOptions: sourceOptions,
        })
        const targetQuestion = new SurveyQuestion({
          _id: 'q2',
          code: 'Q001',
          type: 'checkbox',
          text: { en: 'Question 1' },
          answerOptions: targetOptions,
        })

        const result = ResponseMapper.validateAnswer(
          'Q001',
          'A001',
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(false)
        expect(result.reason).toBe('incompatible_type')
      })

      test('should skip invalid option codes in object', () => {
        const sourceQuestion = new SurveyQuestion({
          _id: 'q1',
          code: 'Q001',
          type: 'checkbox',
          text: { en: 'Question 1' },
          answerOptions: sourceOptions,
        })
        const targetQuestion = new SurveyQuestion({
          _id: 'q2',
          code: 'Q001',
          type: 'checkbox',
          text: { en: 'Question 1' },
          answerOptions: targetOptions,
        })

        const result = ResponseMapper.validateAnswer(
          'Q001',
          { A001: true, invalid: true, A002: true },
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(true)
        expect(result.mappedValue).toEqual({ A001: true, A002: true })
      })
    })

    describe('chooseMax constraint validation', () => {
      let sourceOptions: SurveyAnswerOptionCollection
      let targetOptions: SurveyAnswerOptionCollection

      beforeEach(() => {
        sourceOptions = new SurveyAnswerOptionCollection()
          .add({ _id: 'a1', code: 'A001', label: { en: 'Option 1' } })
          .add({ _id: 'a2', code: 'A002', label: { en: 'Option 2' } })
          .add({ _id: 'a3', code: 'A003', label: { en: 'Option 3' } })
          .add({ _id: 'a4', code: 'A004', label: { en: 'Option 4' } })
          .add({ _id: 'a5', code: 'A005', label: { en: 'Option 5' } })

        targetOptions = new SurveyAnswerOptionCollection()
          .add({ _id: 'b1', code: 'A001', label: { en: 'Option 1' } })
          .add({ _id: 'b2', code: 'A002', label: { en: 'Option 2' } })
          .add({ _id: 'b3', code: 'A003', label: { en: 'Option 3' } })
          .add({ _id: 'b4', code: 'A004', label: { en: 'Option 4' } })
          .add({ _id: 'b5', code: 'A005', label: { en: 'Option 5' } })
      })

      test('should merge answer at exactly max constraint', () => {
        const sourceQuestion = new SurveyQuestion({
          _id: 'q1',
          code: 'Q001',
          type: 'checkbox',
          text: { en: 'Question 1' },
          answerOptions: sourceOptions,
        })
        const targetQuestion = new SurveyQuestion({
          _id: 'q2',
          code: 'Q001',
          type: 'checkbox',
          text: { en: 'Question 1' },
          answerOptions: targetOptions,
          attributes: {
            [ATTRIBUTE_CHOICE_MIN_MAX]: { min: 1, max: 3 },
          },
        })

        const result = ResponseMapper.validateAnswer(
          'Q001',
          { A001: true, A002: true, A003: true }, // Exactly 3 options
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(true)
        expect(result.mappedValue).toEqual({
          A001: true,
          A002: true,
          A003: true,
        })
      })

      test('should skip answer that exceeds max constraint', () => {
        const sourceQuestion = new SurveyQuestion({
          _id: 'q1',
          code: 'Q001',
          type: 'checkbox',
          text: { en: 'Question 1' },
          answerOptions: sourceOptions,
        })
        const targetQuestion = new SurveyQuestion({
          _id: 'q2',
          code: 'Q001',
          type: 'checkbox',
          text: { en: 'Question 1' },
          answerOptions: targetOptions,
          attributes: {
            [ATTRIBUTE_CHOICE_MIN_MAX]: { min: 1, max: 3 },
          },
        })

        const result = ResponseMapper.validateAnswer(
          'Q001',
          { A001: true, A002: true, A003: true, A004: true }, // 4 options, exceeds max: 3
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(false)
        expect(result.reason).toBe('exceeds_maximum')
      })

      test('should merge answer below max constraint (best attempt merge)', () => {
        const sourceQuestion = new SurveyQuestion({
          _id: 'q1',
          code: 'Q001',
          type: 'checkbox',
          text: { en: 'Question 1' },
          answerOptions: sourceOptions,
        })
        const targetQuestion = new SurveyQuestion({
          _id: 'q2',
          code: 'Q001',
          type: 'checkbox',
          text: { en: 'Question 1' },
          answerOptions: targetOptions,
          attributes: {
            [ATTRIBUTE_CHOICE_MIN_MAX]: { min: 3, max: 5 },
          },
        })

        const result = ResponseMapper.validateAnswer(
          'Q001',
          { A001: true, A002: true }, // 2 options, below min: 3, but should still merge
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(true)
        expect(result.mappedValue).toEqual({ A001: true, A002: true })
      })

      test('should merge answer when no max constraint (max: 0)', () => {
        const sourceQuestion = new SurveyQuestion({
          _id: 'q1',
          code: 'Q001',
          type: 'checkbox',
          text: { en: 'Question 1' },
          answerOptions: sourceOptions,
        })
        const targetQuestion = new SurveyQuestion({
          _id: 'q2',
          code: 'Q001',
          type: 'checkbox',
          text: { en: 'Question 1' },
          answerOptions: targetOptions,
          attributes: {
            [ATTRIBUTE_CHOICE_MIN_MAX]: { min: 0, max: 0 },
          },
        })

        const result = ResponseMapper.validateAnswer(
          'Q001',
          { A001: true, A002: true, A003: true, A004: true, A005: true }, // All 5 options
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(true)
        expect(result.mappedValue).toEqual({
          A001: true,
          A002: true,
          A003: true,
          A004: true,
          A005: true,
        })
      })

      test('should merge answer when no chooseMinMax attribute', () => {
        const sourceQuestion = new SurveyQuestion({
          _id: 'q1',
          code: 'Q001',
          type: 'checkbox',
          text: { en: 'Question 1' },
          answerOptions: sourceOptions,
        })
        const targetQuestion = new SurveyQuestion({
          _id: 'q2',
          code: 'Q001',
          type: 'checkbox',
          text: { en: 'Question 1' },
          answerOptions: targetOptions,
          // No attributes set
        })

        const result = ResponseMapper.validateAnswer(
          'Q001',
          { A001: true, A002: true, A003: true, A004: true, A005: true }, // All 5 options
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(true)
        expect(result.mappedValue).toEqual({
          A001: true,
          A002: true,
          A003: true,
          A004: true,
          A005: true,
        })
      })

      test('should skip answer when options filtered but still exceed max', () => {
        // Target only has 3 of the 5 source options
        const limitedTargetOptions = new SurveyAnswerOptionCollection()
          .add({ _id: 'b1', code: 'A001', label: { en: 'Option 1' } })
          .add({ _id: 'b2', code: 'A002', label: { en: 'Option 2' } })
          .add({ _id: 'b3', code: 'A003', label: { en: 'Option 3' } })

        const sourceQuestion = new SurveyQuestion({
          _id: 'q1',
          code: 'Q001',
          type: 'checkbox',
          text: { en: 'Question 1' },
          answerOptions: sourceOptions,
        })
        const targetQuestion = new SurveyQuestion({
          _id: 'q2',
          code: 'Q001',
          type: 'checkbox',
          text: { en: 'Question 1' },
          answerOptions: limitedTargetOptions,
          attributes: {
            [ATTRIBUTE_CHOICE_MIN_MAX]: { min: 1, max: 2 },
          },
        })

        const result = ResponseMapper.validateAnswer(
          'Q001',
          { A001: true, A002: true, A003: true, A004: true, A005: true }, // 5 options in source
          sourceQuestion,
          targetQuestion,
        )

        // After filtering: 3 options remain (A001, A002, A003)
        // But max is 2, so should skip
        expect(result.valid).toBe(false)
        expect(result.reason).toBe('exceeds_maximum')
      })

      test('should merge answer when filtering brings it within max', () => {
        // Target only has 2 of the 5 source options
        const limitedTargetOptions = new SurveyAnswerOptionCollection()
          .add({ _id: 'b1', code: 'A001', label: { en: 'Option 1' } })
          .add({ _id: 'b2', code: 'A002', label: { en: 'Option 2' } })

        const sourceQuestion = new SurveyQuestion({
          _id: 'q1',
          code: 'Q001',
          type: 'checkbox',
          text: { en: 'Question 1' },
          answerOptions: sourceOptions,
        })
        const targetQuestion = new SurveyQuestion({
          _id: 'q2',
          code: 'Q001',
          type: 'checkbox',
          text: { en: 'Question 1' },
          answerOptions: limitedTargetOptions,
          attributes: {
            [ATTRIBUTE_CHOICE_MIN_MAX]: { min: 3, max: 5 },
          },
        })

        const result = ResponseMapper.validateAnswer(
          'Q001',
          { A001: true, A002: true, A003: true, A004: true, A005: true }, // 5 options in source
          sourceQuestion,
          targetQuestion,
        )

        // After filtering: 2 options remain (A001, A002)
        // This is below min: 3, but we still merge (best attempt)
        expect(result.valid).toBe(true)
        expect(result.mappedValue).toEqual({ A001: true, A002: true })
      })
    })

    describe('matrix questions', () => {
      let sourceOptions: SurveyAnswerOptionCollection
      let targetOptions: SurveyAnswerOptionCollection
      let sourceSubquestions: SurveySubquestionCollection
      let targetSubquestions: SurveySubquestionCollection

      beforeEach(() => {
        sourceOptions = new SurveyAnswerOptionCollection()
          .add({ _id: 'a1', code: 'R001', label: { en: 'Row 1' } })
          .add({ _id: 'a2', code: 'R002', label: { en: 'Row 2' } })

        targetOptions = new SurveyAnswerOptionCollection()
          .add({ _id: 'b1', code: 'R001', label: { en: 'Row 1' } })
          .add({ _id: 'b2', code: 'R002', label: { en: 'Row 2' } })

        sourceSubquestions = new SurveySubquestionCollection()
          .add({ _id: 's1', code: 'C001', text: { en: 'Col 1' } })
          .add({ _id: 's2', code: 'C002', text: { en: 'Col 2' } })

        targetSubquestions = new SurveySubquestionCollection()
          .add({ _id: 't1', code: 'C001', text: { en: 'Col 1' } })
          .add({ _id: 't2', code: 'C002', text: { en: 'Col 2' } })
      })

      const makeQuestion = (
        id: string,
        options: SurveyAnswerOptionCollection,
        subquestions: SurveySubquestionCollection,
      ) =>
        new SurveyQuestion({
          _id: id,
          code: 'Q001',
          type: 'matrixComposite',
          text: { en: 'Matrix Question' },
          answerOptions: options,
          subquestions,
        })

      test('should merge matrix answer when all rows and cells are valid', () => {
        const sourceQuestion = makeQuestion(
          'q1',
          sourceOptions,
          sourceSubquestions,
        )
        const targetQuestion = makeQuestion(
          'q2',
          targetOptions,
          targetSubquestions,
        )

        const result = ResponseMapper.validateAnswer(
          'Q001',
          { C001: { R001: 1, R002: 2 }, C002: { R001: 'yes' } },
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(true)
        expect(result.mappedValue).toEqual({
          C001: { R001: 1, R002: 2 },
          C002: { R001: 'yes' },
        })
      })

      test('should drop row silently when subquestion code missing from target', () => {
        const limitedTargetSubquestions = new SurveySubquestionCollection().add(
          {
            _id: 't1',
            code: 'C001',
            text: { en: 'Col 1' },
          },
        )
        const sourceQuestion = makeQuestion(
          'q1',
          sourceOptions,
          sourceSubquestions,
        )
        const targetQuestion = makeQuestion(
          'q2',
          targetOptions,
          limitedTargetSubquestions,
        )

        const result = ResponseMapper.validateAnswer(
          'Q001',
          { C001: { R001: 1 }, C002: { R001: 2 } },
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(true)
        expect(result.mappedValue).toEqual({ C001: { R001: 1 } })
      })

      test('should return missing_subquestion when all subquestion codes missing from target', () => {
        const emptyTargetSubquestions = new SurveySubquestionCollection()
        const sourceQuestion = makeQuestion(
          'q1',
          sourceOptions,
          sourceSubquestions,
        )
        const targetQuestion = makeQuestion(
          'q2',
          targetOptions,
          emptyTargetSubquestions,
        )

        const result = ResponseMapper.validateAnswer(
          'Q001',
          { C001: { R001: 1 }, C002: { R001: 2 } },
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(false)
        expect(result.reason).toBe('missing_subquestion')
      })

      test('should drop cell silently when option missing from target, row still merged', () => {
        const limitedTargetOptions = new SurveyAnswerOptionCollection().add({
          _id: 'b1',
          code: 'R001',
          label: { en: 'Row 1' },
        })
        const sourceQuestion = makeQuestion(
          'q1',
          sourceOptions,
          sourceSubquestions,
        )
        const targetQuestion = makeQuestion(
          'q2',
          limitedTargetOptions,
          targetSubquestions,
        )

        const result = ResponseMapper.validateAnswer(
          'Q001',
          { C001: { R001: 1, R002: 'yes' } },
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(true)
        expect(result.mappedValue).toEqual({ C001: { R001: 1 } })
      })

      test('should return missing_option when all cells stripped but subquestion codes valid', () => {
        const emptyTargetOptions = new SurveyAnswerOptionCollection()
        const sourceQuestion = makeQuestion(
          'q1',
          sourceOptions,
          sourceSubquestions,
        )
        const targetQuestion = makeQuestion(
          'q2',
          emptyTargetOptions,
          targetSubquestions,
        )

        const result = ResponseMapper.validateAnswer(
          'Q001',
          { C001: { R001: 1 }, C002: { R002: 'yes' } },
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(false)
        expect(result.reason).toBe('missing_option')
      })

      test('should drop row whose cells are all removed, but still merge other valid rows', () => {
        const limitedTargetOptions = new SurveyAnswerOptionCollection().add({
          _id: 'b2',
          code: 'R002',
          label: { en: 'Row 2' },
        })
        const sourceQuestion = makeQuestion(
          'q1',
          sourceOptions,
          sourceSubquestions,
        )
        const targetQuestion = makeQuestion(
          'q2',
          limitedTargetOptions,
          targetSubquestions,
        )

        // C001 only has R001 cells (stripped), C002 has R002 which survives
        const result = ResponseMapper.validateAnswer(
          'Q001',
          { C001: { R001: 1 }, C002: { R002: 'yes' } },
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(true)
        expect(result.mappedValue).toEqual({ C002: { R002: 'yes' } })
      })

      test('should return incompatible_type for non-object answer value', () => {
        const sourceQuestion = makeQuestion(
          'q1',
          sourceOptions,
          sourceSubquestions,
        )
        const targetQuestion = makeQuestion(
          'q2',
          targetOptions,
          targetSubquestions,
        )

        const result = ResponseMapper.validateAnswer(
          'Q001',
          'not-an-object',
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(false)
        expect(result.reason).toBe('incompatible_type')
      })

      test('should return incompatible_type for array answer value', () => {
        const sourceQuestion = makeQuestion(
          'q1',
          sourceOptions,
          sourceSubquestions,
        )
        const targetQuestion = makeQuestion(
          'q2',
          targetOptions,
          targetSubquestions,
        )

        const result = ResponseMapper.validateAnswer(
          'Q001',
          [],
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(false)
        expect(result.reason).toBe('incompatible_type')
      })

      test('should return missing_subquestion for empty object answer', () => {
        const sourceQuestion = makeQuestion(
          'q1',
          sourceOptions,
          sourceSubquestions,
        )
        const targetQuestion = makeQuestion(
          'q2',
          targetOptions,
          targetSubquestions,
        )

        const result = ResponseMapper.validateAnswer(
          'Q001',
          {},
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(false)
        expect(result.reason).toBe('missing_subquestion')
      })
    })

    describe('multi-part questions', () => {
      let sourceSubquestions: SurveySubquestionCollection
      let targetSubquestions: SurveySubquestionCollection

      beforeEach(() => {
        sourceSubquestions = new SurveySubquestionCollection()
          .add({ _id: 's1', code: 'P001', text: { en: 'Part 1' } })
          .add({ _id: 's2', code: 'P002', text: { en: 'Part 2' } })

        targetSubquestions = new SurveySubquestionCollection()
          .add({ _id: 't1', code: 'P001', text: { en: 'Part 1' } })
          .add({ _id: 't2', code: 'P002', text: { en: 'Part 2' } })
      })

      const makeQuestion = (
        id: string,
        subquestions: SurveySubquestionCollection,
      ) =>
        new SurveyQuestion({
          _id: id,
          code: 'Q001',
          type: 'multiPartText',
          text: { en: 'Multi-Part Question' },
          subquestions,
        })

      test('should merge Multi-Part answer when all parts are valid', () => {
        const sourceQuestion = makeQuestion('q1', sourceSubquestions)
        const targetQuestion = makeQuestion('q2', targetSubquestions)

        const result = ResponseMapper.validateAnswer(
          'Q001',
          { P001: 'first answer', P002: 'second answer' },
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(true)
        expect(result.mappedValue).toEqual({
          P001: 'first answer',
          P002: 'second answer',
        })
      })

      test('should drop a part silently when its code is missing from target', () => {
        const limitedTargetSubquestions = new SurveySubquestionCollection().add(
          {
            _id: 't1',
            code: 'P001',
            text: { en: 'Part 1' },
          },
        )
        const sourceQuestion = makeQuestion('q1', sourceSubquestions)
        const targetQuestion = makeQuestion('q2', limitedTargetSubquestions)

        const result = ResponseMapper.validateAnswer(
          'Q001',
          { P001: 'first answer', P002: 'second answer' },
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(true)
        expect(result.mappedValue).toEqual({ P001: 'first answer' })
      })

      test('should return missing_subquestion when every part code is missing from target', () => {
        const emptyTargetSubquestions = new SurveySubquestionCollection()
        const sourceQuestion = makeQuestion('q1', sourceSubquestions)
        const targetQuestion = makeQuestion('q2', emptyTargetSubquestions)

        const result = ResponseMapper.validateAnswer(
          'Q001',
          { P001: 'first answer' },
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(false)
        expect(result.reason).toBe('missing_subquestion')
      })

      test('should reject a non-object answer value', () => {
        const sourceQuestion = makeQuestion('q1', sourceSubquestions)
        const targetQuestion = makeQuestion('q2', targetSubquestions)

        const result = ResponseMapper.validateAnswer(
          'Q001',
          'not an object',
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(false)
        expect(result.reason).toBe('incompatible_type')
      })
    })

    describe('ranking questions', () => {
      let sourceOptions: SurveyAnswerOptionCollection
      let targetOptions: SurveyAnswerOptionCollection

      beforeEach(() => {
        sourceOptions = new SurveyAnswerOptionCollection()
          .add({ _id: 'a1', code: 'A001', label: { en: 'Option 1' } })
          .add({ _id: 'a2', code: 'A002', label: { en: 'Option 2' } })
          .add({ _id: 'a3', code: 'A003', label: { en: 'Option 3' } })

        targetOptions = new SurveyAnswerOptionCollection()
          .add({ _id: 'b1', code: 'A001', label: { en: 'Option 1' } })
          .add({ _id: 'b2', code: 'A002', label: { en: 'Option 2' } })
      })

      test('should map ranking answer preserving ORDER', () => {
        const sourceQuestion = new SurveyQuestion({
          _id: 'q1',
          code: 'Q001',
          type: 'ranking',
          text: { en: 'Rank these' },
          answerOptions: sourceOptions,
        })
        const targetQuestion = new SurveyQuestion({
          _id: 'q2',
          code: 'Q001',
          type: 'ranking',
          text: { en: 'Rank these' },
          answerOptions: targetOptions,
        })

        const result = ResponseMapper.validateAnswer(
          'Q001',
          { A001: true, A002: true, ORDER: ['A002', 'A001'] },
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(true)
        expect(result.mappedValue).toEqual({
          A001: true,
          A002: true,
          ORDER: ['A002', 'A001'],
        })
      })

      test('should filter out codes missing in target and rebuild ORDER', () => {
        const sourceQuestion = new SurveyQuestion({
          _id: 'q1',
          code: 'Q001',
          type: 'ranking',
          text: { en: 'Rank these' },
          answerOptions: sourceOptions,
        })
        const targetQuestion = new SurveyQuestion({
          _id: 'q2',
          code: 'Q001',
          type: 'ranking',
          text: { en: 'Rank these' },
          answerOptions: targetOptions,
        })

        // A003 exists in source but not target
        const result = ResponseMapper.validateAnswer(
          'Q001',
          { A001: true, A003: true, ORDER: ['A003', 'A001'] },
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(true)
        expect(result.mappedValue).toEqual({ A001: true, ORDER: ['A001'] })
      })

      test('should return invalid when all ranked codes are missing in target', () => {
        const sourceQuestion = new SurveyQuestion({
          _id: 'q1',
          code: 'Q001',
          type: 'ranking',
          text: { en: 'Rank these' },
          answerOptions: sourceOptions,
        })
        const targetQuestion = new SurveyQuestion({
          _id: 'q2',
          code: 'Q001',
          type: 'ranking',
          text: { en: 'Rank these' },
          answerOptions: targetOptions,
        })

        const result = ResponseMapper.validateAnswer(
          'Q001',
          { A003: true, ORDER: ['A003'] },
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(false)
        expect(result.reason).toBe('missing_option')
      })

      test('should return invalid for non-object ranking answer', () => {
        const sourceQuestion = new SurveyQuestion({
          _id: 'q1',
          code: 'Q001',
          type: 'ranking',
          text: { en: 'Rank these' },
          answerOptions: sourceOptions,
        })
        const targetQuestion = new SurveyQuestion({
          _id: 'q2',
          code: 'Q001',
          type: 'ranking',
          text: { en: 'Rank these' },
          answerOptions: targetOptions,
        })

        const result = ResponseMapper.validateAnswer(
          'Q001',
          'A001,A002',
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(false)
        expect(result.reason).toBe('incompatible_type')
      })
    })

    describe('unknown question types', () => {
      test('should reject unknown types', () => {
        const sourceQuestion = new SurveyQuestion({
          _id: 'q1',
          code: 'Q001',
          type: 'custom-type',
          text: { en: 'Question 1' },
        })
        const targetQuestion = new SurveyQuestion({
          _id: 'q2',
          code: 'Q001',
          type: 'custom-type',
          text: { en: 'Question 1' },
        })

        const result = ResponseMapper.validateAnswer(
          'Q001',
          'some value',
          sourceQuestion,
          targetQuestion,
        )

        expect(result.valid).toBe(false)
        expect(result.reason).toBe('incompatible_type')
      })
    })
  })

  describe('mapAnswerOptions', () => {
    let sourceOptions: SurveyAnswerOptionCollection
    let targetOptions: SurveyAnswerOptionCollection

    beforeEach(() => {
      sourceOptions = new SurveyAnswerOptionCollection()
        .add({ _id: 'a1', code: 'A001', label: { en: 'Option 1' } })
        .add({ _id: 'a2', code: 'A002', label: { en: 'Option 2' } })
        .add({ _id: 'a3', code: 'A003', label: { en: 'Option 3' } })

      targetOptions = new SurveyAnswerOptionCollection()
        .add({ _id: 'b1', code: 'A001', label: { en: 'Option 1' } })
        .add({ _id: 'b2', code: 'A002', label: { en: 'Option 2' } })
    })

    describe('single choice', () => {
      test('should map single option code', () => {
        const result = ResponseMapper.mapAnswerOptions(
          'A001',
          sourceOptions,
          targetOptions,
        )

        expect(result.mappedValue).toBe('A001')
        expect(result.skippedCodes).toEqual([])
      })

      test('should return null and skip code when option not in target', () => {
        const result = ResponseMapper.mapAnswerOptions(
          'A003',
          sourceOptions,
          targetOptions,
        )

        expect(result.mappedValue).toBeNull()
        expect(result.skippedCodes).toEqual(['A003'])
      })

      test('should return null and skip code when option not in source', () => {
        const result = ResponseMapper.mapAnswerOptions(
          'A999',
          sourceOptions,
          targetOptions,
        )

        expect(result.mappedValue).toBeNull()
        expect(result.skippedCodes).toEqual(['A999'])
      })
    })

    describe('multiple choice (object format)', () => {
      test('should map multiple option codes', () => {
        const result = ResponseMapper.mapAnswerOptions(
          { A001: true, A002: true },
          sourceOptions,
          targetOptions,
        )

        expect(result.mappedValue).toEqual({ A001: true, A002: true })
        expect(result.skippedCodes).toEqual([])
      })

      test('should filter out missing options and track skipped codes', () => {
        const result = ResponseMapper.mapAnswerOptions(
          { A001: true, A003: true },
          sourceOptions,
          targetOptions,
        )

        expect(result.mappedValue).toEqual({ A001: true })
        expect(result.skippedCodes).toEqual(['A003'])
      })

      test('should handle empty object', () => {
        const result = ResponseMapper.mapAnswerOptions(
          {},
          sourceOptions,
          targetOptions,
        )

        expect(result.mappedValue).toEqual({})
        expect(result.skippedCodes).toEqual([])
      })

      test('should skip invalid source option codes', () => {
        const result = ResponseMapper.mapAnswerOptions(
          { A001: true, invalid: true, A002: true },
          sourceOptions,
          targetOptions,
        )

        expect(result.mappedValue).toEqual({ A001: true, A002: true })
        expect(result.skippedCodes).toEqual(['invalid'])
      })

      test('should handle mix of valid and invalid options', () => {
        const result = ResponseMapper.mapAnswerOptions(
          { A001: true, invalid: true, A003: true },
          sourceOptions,
          targetOptions,
        )

        expect(result.mappedValue).toEqual({ A001: true })
        expect(result.skippedCodes).toEqual(['invalid', 'A003'])
      })
    })
  })

  describe('integration tests', () => {
    test('should map complete response with mixed question types', () => {
      const sourceSurvey = new Survey({
        _id: 'source',
        title: { en: 'Source Survey' },
        elements: new SurveyElementCollection()
          .add({
            _id: 'q1',
            code: 'Q001',
            type: 'text',
            text: { en: 'Name' },
          })
          .add({
            _id: 'q2',
            code: 'Q002',
            type: 'number',
            text: { en: 'Age' },
          })
          .add({
            _id: 'q3',
            code: 'Q003',
            type: 'checkbox',
            text: { en: 'Interests' },
            answerOptions: new SurveyAnswerOptionCollection()
              .add({ _id: 'a3', code: 'A003', label: { en: 'Sports' } })
              .add({ _id: 'a4', code: 'A004', label: { en: 'Music' } })
              .add({ _id: 'a5', code: 'A005', label: { en: 'Reading' } }),
          }),
      })

      const targetSurvey = new Survey({
        _id: 'target',
        title: { en: 'Target Survey' },
        elements: new SurveyElementCollection()
          .add({
            _id: 'q10',
            code: 'Q001',
            type: 'text',
            text: { en: 'Name' },
          })
          .add({
            _id: 'q20',
            code: 'Q002',
            type: 'number',
            text: { en: 'Age' },
          })
          .add({
            _id: 'q30',
            code: 'Q003',
            type: 'checkbox',
            text: { en: 'Interests' },
            answerOptions: new SurveyAnswerOptionCollection()
              .add({ _id: 'b3', code: 'A003', label: { en: 'Sports' } })
              .add({ _id: 'b4', code: 'A004', label: { en: 'Music' } }),
          }),
      })

      const sourceResponse = new SurveyResponse({
        _id: 'r1',
        answers: {
          LANG: 'en',
          Q001: 'John Doe',
          Q002: '25',
          Q003: { A003: true, A004: true, A005: true },
        },
      })

      const result = ResponseMapper.mapResponse(
        sourceResponse,
        sourceSurvey,
        targetSurvey,
      )

      expect(result.mappedAnswers).toEqual({
        LANG: 'en',
        Q001: 'John Doe',
        Q002: '25',
        Q003: { A003: true, A004: true },
      })
      expect(result.skippedAnswers).toHaveLength(0)
      expect(result.originalAnswers).toEqual({
        LANG: 'en',
        Q001: 'John Doe',
        Q002: '25',
        Q003: { A003: true, A004: true, A005: true },
      })
    })

    test('should track all skipped answers with reasons', () => {
      const sourceSurvey = new Survey({
        _id: 'source',
        title: { en: 'Source Survey' },
        elements: new SurveyElementCollection()
          .add({
            _id: 'q1',
            code: 'Q001',
            type: 'text',
            text: { en: 'Name' },
          })
          .add({
            _id: 'q2',
            code: 'Q002',
            type: 'checkbox',
            text: { en: 'Choice' },
            answerOptions: new SurveyAnswerOptionCollection().add({
              _id: 'a1',
              code: 'A001',
              label: { en: 'Option 1' },
            }),
          }),
      })

      const targetSurvey = new Survey({
        _id: 'target',
        title: { en: 'Target Survey' },
        elements: new SurveyElementCollection().add({
          _id: 'q10',
          code: 'Q001',
          type: 'number',
          text: { en: 'Name' },
        }),
      })

      const sourceResponse = new SurveyResponse({
        _id: 'r1',
        answers: {
          Q001: 'John Doe',
          Q002: { A001: true },
          Q003: 'answer to missing question',
        },
      })

      const result = ResponseMapper.mapResponse(
        sourceResponse,
        sourceSurvey,
        targetSurvey,
      )

      expect(result.mappedAnswers).toEqual({})
      expect(result.skippedAnswers).toHaveLength(3)
      expect(result.skippedAnswers).toContainEqual({
        questionCode: 'Q001',
        reason: 'incompatible_type',
        originalValue: 'John Doe',
      })
      expect(result.skippedAnswers).toContainEqual({
        questionCode: 'Q002',
        reason: 'missing_question',
        originalValue: { A001: true },
      })
      expect(result.skippedAnswers).toContainEqual({
        questionCode: 'Q003',
        reason: 'missing_question',
        originalValue: 'answer to missing question',
      })
    })

    test('should handle empty response', () => {
      const sourceSurvey = new Survey({
        _id: 'source',
        title: { en: 'Source' },
      })
      const targetSurvey = new Survey({
        _id: 'target',
        title: { en: 'Target' },
      })
      const sourceResponse = new SurveyResponse({
        _id: 'r1',
        answers: {},
      })

      const result = ResponseMapper.mapResponse(
        sourceResponse,
        sourceSurvey,
        targetSurvey,
      )

      expect(result.mappedAnswers).toEqual({})
      expect(result.skippedAnswers).toEqual([])
      expect(result.originalAnswers).toEqual({})
    })

    test('should map complete response including a matrix question', () => {
      const sourceSubquestions = new SurveySubquestionCollection()
        .add({ _id: 's1', code: 'C001', text: { en: 'Col 1' } })
        .add({ _id: 's2', code: 'C002', text: { en: 'Col 2' } })

      const targetSubquestions = new SurveySubquestionCollection().add({
        _id: 't1',
        code: 'C001',
        text: { en: 'Col 1' },
      })

      const sourceSurvey = new Survey({
        _id: 'source',
        title: { en: 'Source Survey' },
        elements: new SurveyElementCollection()
          .add({
            _id: 'q1',
            code: 'Q001',
            type: 'text',
            text: { en: 'Name' },
          })
          .add({
            _id: 'q2',
            code: 'Q002',
            type: 'matrixComposite',
            text: { en: 'Matrix' },
            answerOptions: new SurveyAnswerOptionCollection()
              .add({ _id: 'a1', code: 'R001', label: { en: 'Row 1' } })
              .add({ _id: 'a2', code: 'R002', label: { en: 'Row 2' } }),
            subquestions: sourceSubquestions,
          }),
      })

      const targetSurvey = new Survey({
        _id: 'target',
        title: { en: 'Target Survey' },
        elements: new SurveyElementCollection()
          .add({
            _id: 'q10',
            code: 'Q001',
            type: 'text',
            text: { en: 'Name' },
          })
          .add({
            _id: 'q20',
            code: 'Q002',
            type: 'matrixComposite',
            text: { en: 'Matrix' },
            answerOptions: new SurveyAnswerOptionCollection().add({
              _id: 'b1',
              code: 'R001',
              label: { en: 'Row 1' },
            }),
            subquestions: targetSubquestions,
          }),
      })

      const sourceResponse = new SurveyResponse({
        _id: 'r1',
        answers: {
          Q001: 'Alice',
          Q002: {
            C001: { R001: 3, R002: 1 }, // R001 valid; R002 dropped from target options
            C002: { R001: 'yes' }, // C002 dropped from target subquestions
          },
        },
      })

      const result = ResponseMapper.mapResponse(
        sourceResponse,
        sourceSurvey,
        targetSurvey,
      )

      expect(result.mappedAnswers).toEqual({
        Q001: 'Alice',
        Q002: { C001: { R001: 3 } },
      })
      expect(result.skippedAnswers).toHaveLength(0)
    })

    test('should handle response with no answers property', () => {
      const sourceSurvey = new Survey({
        _id: 'source',
        title: { en: 'Source' },
      })
      const targetSurvey = new Survey({
        _id: 'target',
        title: { en: 'Target' },
      })
      const sourceResponse = new SurveyResponse({
        _id: 'r1',
      })

      const result = ResponseMapper.mapResponse(
        sourceResponse,
        sourceSurvey,
        targetSurvey,
      )

      expect(result.mappedAnswers).toEqual({})
      expect(result.skippedAnswers).toEqual([])
      expect(result.originalAnswers).toEqual({})
    })
  })
})
