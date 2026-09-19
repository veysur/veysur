import { ConditionEvaluator } from './ConditionEvaluator'
import { ExpressionContextBuilder } from '../SurveyExpression/ExpressionContext'
import { ExpressionContext } from '../SurveyExpression/types'
import { QuestionInfo } from './types'

describe('ConditionEvaluator', () => {
  const createContext = (
    overrides: Partial<ExpressionContext> = {},
  ): ExpressionContext => ({
    participant: {
      email: 'test@example.com',
      nameFirst: 'John',
      nameLast: 'Doe',
      language: 'en',
    },
    answers: {
      Q001: { A002: true },
      Q002: 'Hello world',
      Q003: 7,
      Q004: { A001: true, A002: true },
    },
    response: {},
    answerOptionCodes: ['A001', 'A002', 'A003'],
    ...overrides,
  })

  describe('evaluate', () => {
    it('should return shouldShow: true for null condition', () => {
      const result = ConditionEvaluator.evaluate(null, createContext())
      expect(result.shouldShow).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return shouldShow: true for empty condition', () => {
      const result = ConditionEvaluator.evaluate('', createContext())
      expect(result.shouldShow).toBe(true)
    })

    it('should return shouldShow: true for whitespace-only condition', () => {
      const result = ConditionEvaluator.evaluate('   ', createContext())
      expect(result.shouldShow).toBe(true)
    })

    it('should evaluate dot notation for answer selection', () => {
      const context = createContext()
      // answers.Q001.A002 accesses the object property directly
      expect(
        ConditionEvaluator.evaluate('answers.Q001.A002', context).shouldShow,
      ).toBe(true)
      expect(
        ConditionEvaluator.evaluate('answers.Q001.A001', context).shouldShow,
      ).toBe(false)
    })

    it('should evaluate numeric comparisons', () => {
      const context = createContext()
      expect(
        ConditionEvaluator.evaluate('answers.Q003 > 5', context).shouldShow,
      ).toBe(true)
      expect(
        ConditionEvaluator.evaluate('answers.Q003 > 10', context).shouldShow,
      ).toBe(false)
      expect(
        ConditionEvaluator.evaluate('answers.Q003 >= 7', context).shouldShow,
      ).toBe(true)
      expect(
        ConditionEvaluator.evaluate('answers.Q003 < 10', context).shouldShow,
      ).toBe(true)
    })

    it('should evaluate boolean operators', () => {
      const context = createContext()
      expect(
        ConditionEvaluator.evaluate(
          'answers.Q003 > 5 && answers.Q003 < 10',
          context,
        ).shouldShow,
      ).toBe(true)
      expect(
        ConditionEvaluator.evaluate(
          'answers.Q003 < 5 || answers.Q003 > 6',
          context,
        ).shouldShow,
      ).toBe(true)
      expect(
        ConditionEvaluator.evaluate('!(answers.Q003 < 5)', context).shouldShow,
      ).toBe(true)
    })

    it('should evaluate participant variables', () => {
      const context = createContext()
      expect(
        ConditionEvaluator.evaluate(
          'participant.email === "test@example.com"',
          context,
        ).shouldShow,
      ).toBe(true)
      expect(
        ConditionEvaluator.evaluate('participant.language === "en"', context)
          .shouldShow,
      ).toBe(true)
      expect(
        ConditionEvaluator.evaluate('participant.language === "fr"', context)
          .shouldShow,
      ).toBe(false)
    })

    it('should evaluate response variables, distinct from participant', () => {
      const context = createContext({
        participant: { language: 'en' },
        response: { language: 'zh' },
      })
      expect(
        ConditionEvaluator.evaluate('participant.language === "en"', context)
          .shouldShow,
      ).toBe(true)
      expect(
        ConditionEvaluator.evaluate('response.language === "zh"', context)
          .shouldShow,
      ).toBe(true)
      expect(
        ConditionEvaluator.evaluate('response.language === "en"', context)
          .shouldShow,
      ).toBe(false)
    })

    it('should evaluate string methods', () => {
      const context = createContext()
      expect(
        ConditionEvaluator.evaluate('answers.Q002.includes("Hello")', context)
          .shouldShow,
      ).toBe(true)
      expect(
        ConditionEvaluator.evaluate('answers.Q002.includes("Goodbye")', context)
          .shouldShow,
      ).toBe(false)
      expect(
        ConditionEvaluator.evaluate('participant.email.includes("@")', context)
          .shouldShow,
      ).toBe(true)
    })

    it('should evaluate object property access for multiple choice', () => {
      const context = createContext()
      // answers.Q004 is now an object: { A001: true, A002: true }
      expect(
        ConditionEvaluator.evaluate('answers.Q004.A001', context).shouldShow,
      ).toBe(true)
      expect(
        ConditionEvaluator.evaluate('answers.Q004.A003', context).shouldShow,
      ).toBe(false)
      // Object.keys(answers.Q004).length would be 2
      expect(
        ConditionEvaluator.evaluate(
          'Object.keys(answers.Q004).length === 2',
          context,
        ).shouldShow,
      ).toBe(true)
    })

    it('should evaluate complex conditions', () => {
      const context = createContext()
      // Using dot notation for answer selection
      expect(
        ConditionEvaluator.evaluate(
          '(answers.Q001.A002 && answers.Q003 > 5) || participant.language === "fr"',
          context,
        ).shouldShow,
      ).toBe(true)
      expect(
        ConditionEvaluator.evaluate(
          'answers.Q001.A002 && answers.Q004.A001 && answers.Q003 >= 7',
          context,
        ).shouldShow,
      ).toBe(true)
    })

    it('should fail-safe to showing element on error', () => {
      const context = createContext()
      // Reference undefined variable - should show with error
      const result = ConditionEvaluator.evaluate(
        'UNDEFINED_VAR.something',
        context,
      )
      expect(result.shouldShow).toBe(true)
      expect(result.error).toBeDefined()
    })

    it('should block unsafe expressions', () => {
      const context = createContext()
      const result = ConditionEvaluator.evaluate('eval("alert(1)")', context)
      expect(result.shouldShow).toBe(true)
      expect(result.error).toContain('unsafe')
    })

    it('should resolve to undefined (falsy), not throw, when answers has no matching key', () => {
      // Unlike the old flat-identifier scheme (a genuinely unbound variable
      // threw a ReferenceError), answers.<code> is plain property access on
      // an object - a missing key resolves to undefined rather than throwing.
      const context = createContext({
        answers: {},
      })
      const result = ConditionEvaluator.evaluate('answers.Q001', context)
      expect(result.shouldShow).toBe(false)
      expect(result.error).toBeUndefined()
    })

    it('should hide an element with a checkbox condition before any answer is given', () => {
      // Regression: answers.Q002.A002 used to throw a TypeError (cannot read
      // property of undefined) when Q002 had no answer, causing the fail-safe
      // to show the element. The context builder now pre-initialises checkbox
      // questions to {}, so the condition correctly evaluates to false
      // (hidden) until the option is selected.
      const questions: QuestionInfo[] = [
        { code: 'Q001', type: 'text', position: 0 },
        {
          code: 'Q002',
          type: 'checkbox',
          position: 1,
          answerOptionCodes: ['A001', 'A002', 'A003'],
        },
      ]
      const emptyContext = ExpressionContextBuilder.build({}, [], questions)
      expect(
        ConditionEvaluator.evaluate('answers.Q002.A002', emptyContext)
          .shouldShow,
      ).toBe(false)

      const wrongAnswerContext = ExpressionContextBuilder.build(
        {},
        [{ questionCode: 'Q002', value: { A001: true } }],
        questions,
      )
      expect(
        ConditionEvaluator.evaluate('answers.Q002.A002', wrongAnswerContext)
          .shouldShow,
      ).toBe(false)

      const correctAnswerContext = ExpressionContextBuilder.build(
        {},
        [{ questionCode: 'Q002', value: { A002: true } }],
        questions,
      )
      expect(
        ConditionEvaluator.evaluate('answers.Q002.A002', correctAnswerContext)
          .shouldShow,
      ).toBe(true)
    })

    it('should hide an element with an equality condition before any answer is given', () => {
      // Regression: answers.Q001 was omitted entirely from the context when
      // unanswered under the old flat scheme, causing a ReferenceError. The
      // context builder now pre-initialises every question code, so property
      // access correctly resolves to undefined (hidden) until Q001 is answered.
      const questions: QuestionInfo[] = [
        { code: 'Q001', type: 'text', position: 0 },
        { code: 'Q002', type: 'text', position: 1 },
      ]
      const emptyContext = ExpressionContextBuilder.build({}, [], questions)
      const emptyResult = ConditionEvaluator.evaluate(
        "answers.Q001 === 'Liverpool'",
        emptyContext,
      )
      expect(emptyResult.shouldShow).toBe(false)
      expect(emptyResult.error).toBeUndefined()

      const wrongAnswerContext = ExpressionContextBuilder.build(
        {},
        [{ questionCode: 'Q001', value: 'Manchester' }],
        questions,
      )
      expect(
        ConditionEvaluator.evaluate(
          "answers.Q001 === 'Liverpool'",
          wrongAnswerContext,
        ).shouldShow,
      ).toBe(false)

      const correctAnswerContext = ExpressionContextBuilder.build(
        {},
        [{ questionCode: 'Q001', value: 'Liverpool' }],
        questions,
      )
      expect(
        ConditionEvaluator.evaluate(
          "answers.Q001 === 'Liverpool'",
          correctAnswerContext,
        ).shouldShow,
      ).toBe(true)
    })

    it('should handle ternary operator', () => {
      const context = createContext()
      expect(
        ConditionEvaluator.evaluate('answers.Q003 > 5 ? true : false', context)
          .shouldShow,
      ).toBe(true)
      expect(
        ConditionEvaluator.evaluate('answers.Q003 < 5 ? true : false', context)
          .shouldShow,
      ).toBe(false)
    })

    it('should evaluate dot notation answer selection', () => {
      const context = createContext({
        answers: {
          Q001: { A002: true },
        },
      })
      expect(
        ConditionEvaluator.evaluate('answers.Q001.A002', context).shouldShow,
      ).toBe(true)
      expect(
        ConditionEvaluator.evaluate('answers.Q001.A001', context).shouldShow,
      ).toBe(false)
    })

    it('should evaluate dot notation for multiple selections', () => {
      const context = createContext()
      // answers.Q004 is { A001: true, A002: true }
      expect(
        ConditionEvaluator.evaluate('answers.Q004.A001', context).shouldShow,
      ).toBe(true)
      expect(
        ConditionEvaluator.evaluate('answers.Q004.A002', context).shouldShow,
      ).toBe(true)
      // A003 is not selected
      expect(
        ConditionEvaluator.evaluate('answers.Q004.A003', context).shouldShow,
      ).toBe(false)
    })

    it('should substitute bare answer-option-code literals for hand-typed conditions', () => {
      const context = createContext()
      // Hand-typed condition using a bare answer-option code, not generated
      // by the visual builder (which always emits answers.<code> dot
      // notation or quoted literals) - still supported by substituting the
      // bare code into its quoted string form before compiling, rather than
      // binding it as a `new Function` parameter.
      expect(
        ConditionEvaluator.evaluate('A002 in answers.Q001', context).shouldShow,
      ).toBe(true)
      expect(
        ConditionEvaluator.evaluate('A003 in answers.Q001', context).shouldShow,
      ).toBe(false)
    })
  })

  describe('predefined answer options (yesNo/starRating/point5/point10)', () => {
    it('evaluates dot-accessed predefined option codes against a boolean answer', () => {
      const questions: QuestionInfo[] = [
        {
          code: 'Q005',
          type: 'yesNo',
          position: 0,
          answerOptionCodes: ['YES', 'NO'],
        },
      ]
      const yesContext = ExpressionContextBuilder.build(
        {},
        [{ questionCode: 'Q005', value: true }],
        questions,
      )
      expect(
        ConditionEvaluator.evaluate('answers.Q005.YES', yesContext).shouldShow,
      ).toBe(true)
      expect(
        ConditionEvaluator.evaluate('answers.Q005.NO', yesContext).shouldShow,
      ).toBe(false)

      const noContext = ExpressionContextBuilder.build(
        {},
        [{ questionCode: 'Q005', value: false }],
        questions,
      )
      expect(
        ConditionEvaluator.evaluate('answers.Q005.YES', noContext).shouldShow,
      ).toBe(false)
      expect(
        ConditionEvaluator.evaluate('answers.Q005.NO', noContext).shouldShow,
      ).toBe(true)
    })

    it('evaluates dot-accessed predefined option codes against a numeric answer', () => {
      const questions: QuestionInfo[] = [
        {
          code: 'Q006',
          type: 'point5',
          position: 0,
          answerOptionCodes: ['P1', 'P2', 'P3', 'P4', 'P5'],
        },
      ]
      const context = ExpressionContextBuilder.build(
        {},
        [{ questionCode: 'Q006', value: 4 }],
        questions,
      )
      expect(
        ConditionEvaluator.evaluate('answers.Q006.P4', context).shouldShow,
      ).toBe(true)
      expect(
        ConditionEvaluator.evaluate('answers.Q006.P3', context).shouldShow,
      ).toBe(false)
    })

    it('still evaluates a direct value comparison unaffected by the rewrite', () => {
      const questions: QuestionInfo[] = [
        {
          code: 'Q005',
          type: 'yesNo',
          position: 0,
          answerOptionCodes: ['YES', 'NO'],
        },
      ]
      const context = ExpressionContextBuilder.build(
        {},
        [{ questionCode: 'Q005', value: true }],
        questions,
      )
      expect(
        ConditionEvaluator.evaluate('answers.Q005 === true', context)
          .shouldShow,
      ).toBe(true)
    })
  })

  describe('evaluateAll', () => {
    it('should return true when all conditions pass', () => {
      const context = createContext()
      const result = ConditionEvaluator.evaluateAll(
        [
          'answers.Q001.A002',
          'answers.Q003 > 5',
          'participant.language === "en"',
        ],
        context,
      )
      expect(result.shouldShow).toBe(true)
    })

    it('should return false when any condition fails', () => {
      const context = createContext()
      const result = ConditionEvaluator.evaluateAll(
        [
          'answers.Q001.A002',
          'answers.Q003 < 5',
          'participant.language === "en"',
        ],
        context,
      )
      expect(result.shouldShow).toBe(false)
    })

    it('should handle null/empty conditions in array', () => {
      const context = createContext()
      const result = ConditionEvaluator.evaluateAll(
        [null, '', 'answers.Q001.A002'],
        context,
      )
      expect(result.shouldShow).toBe(true)
    })

    it('should return true for empty conditions array', () => {
      const context = createContext()
      const result = ConditionEvaluator.evaluateAll([], context)
      expect(result.shouldShow).toBe(true)
    })

    it('should stop at first failing condition', () => {
      const context = createContext()
      // First condition fails, shouldn't evaluate the rest
      const result = ConditionEvaluator.evaluateAll(
        ['answers.Q003 < 5', 'answers.Q001.A002'],
        context,
      )
      expect(result.shouldShow).toBe(false)
    })
  })

  describe('evaluateIfValid', () => {
    const questions: QuestionInfo[] = [
      {
        code: 'Q001',
        type: 'choiceRadio',
        position: 0,
        answerOptionCodes: ['A001', 'A002'],
      },
    ]

    it('returns shouldShow: true for null condition', () => {
      const result = ConditionEvaluator.evaluateIfValid(
        null,
        createContext(),
        questions,
        1,
      )
      expect(result.shouldShow).toBe(true)
    })

    it('evaluates a structurally valid condition normally', () => {
      const result = ConditionEvaluator.evaluateIfValid(
        'answers.Q001.A002',
        createContext(),
        questions,
        1,
      )
      expect(result.shouldShow).toBe(true)
    })

    it('fails open without evaluating when the condition references an unknown code', () => {
      const result = ConditionEvaluator.evaluateIfValid(
        'answers.Q999',
        createContext(),
        questions,
        1,
      )
      expect(result.shouldShow).toBe(true)
      expect(result.error).toBeDefined()
    })

    it('fails open on a disallowed forward reference', () => {
      const result = ConditionEvaluator.evaluateIfValid(
        'answers.Q001',
        createContext(),
        questions,
        0,
      )
      expect(result.shouldShow).toBe(true)
      expect(result.error).toBeDefined()
    })
  })
})
