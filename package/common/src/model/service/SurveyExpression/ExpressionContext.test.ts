import { ExpressionContextBuilder, SurveyAnswer } from './ExpressionContext'
import { ParticipantData } from './types'
import { QuestionInfo } from '../SurveyCondition/types'

describe('ExpressionContextBuilder', () => {
  const mockParticipant: ParticipantData = {
    email: 'test@example.com',
    nameFirst: 'John',
    nameLast: 'Doe',
    token: 'abc123',
    language: 'en',
  }

  const mockQuestions: QuestionInfo[] = [
    {
      code: 'Q001',
      type: 'button',
      position: 0,
      answerOptionCodes: ['A001', 'A002', 'A003'],
    },
    { code: 'Q002', type: 'text', position: 1 },
    { code: 'Q003', type: 'number', position: 2 },
    {
      code: 'Q004',
      type: 'checkbox',
      position: 3,
      answerOptionCodes: ['A001', 'A002'],
    },
    {
      code: 'Q005',
      type: 'yesNo',
      position: 4,
      answerOptionCodes: ['YES', 'NO'],
    },
    {
      code: 'Q006',
      type: 'matrix',
      position: 5,
      answerOptionCodes: ['A004', 'A005'],
      subquestions: [
        { code: 'S001', type: 'radio' },
        { code: 'S002', type: 'radio' },
      ],
    },
  ]

  // Mock answers using the object format for multiple choice
  const mockAnswers: SurveyAnswer[] = [
    { questionCode: 'Q001', value: { A002: true } },
    { questionCode: 'Q002', value: 'Hello world' },
    { questionCode: 'Q003', value: 7 },
    { questionCode: 'Q004', value: { A001: true, A002: true } },
    { questionCode: 'Q005', value: true },
  ]

  describe('build', () => {
    it('should include participant data', () => {
      const context = ExpressionContextBuilder.build(
        mockParticipant,
        [],
        mockQuestions,
      )
      expect(context.participant.email).toBe('test@example.com')
      expect(context.participant.nameFirst).toBe('John')
      expect(context.participant.nameLast).toBe('Doe')
      expect(context.participant.token).toBe('abc123')
      expect(context.participant.language).toBe('en')
    })

    it('should map question codes to answer values', () => {
      const context = ExpressionContextBuilder.build(
        mockParticipant,
        mockAnswers,
        mockQuestions,
      )
      // Object format for multiple choice
      expect(context.answers['Q001']).toEqual({ A002: true })
      expect(context.answers['Q002']).toBe('Hello world')
      expect(context.answers['Q003']).toBe(7)
      expect(context.answers['Q004']).toEqual({ A001: true, A002: true })
      // yesNo keeps its raw boolean value - not synthesised into an
      // options-object - so existing `Q005 === true` style conditions keep
      // working; see `answerOptionLiterals` for how `Q005.YES` is handled.
      expect(context.answers['Q005']).toBe(true)
    })

    it('should build answerOptionLiterals for predefined-answer-option question types', () => {
      const context = ExpressionContextBuilder.build(
        mockParticipant,
        mockAnswers,
        mockQuestions,
      )

      expect(context.answerOptionLiterals).toEqual({
        'answers.Q005.YES': 'true',
        'answers.Q005.NO': 'false',
      })
    })

    it('should collect all answer option codes', () => {
      const context = ExpressionContextBuilder.build(
        mockParticipant,
        mockAnswers,
        mockQuestions,
      )

      expect(context.answerOptionCodes).toContain('A001')
      expect(context.answerOptionCodes).toContain('A002')
      expect(context.answerOptionCodes).toContain('A003')
    })

    it('should handle empty answers', () => {
      const context = ExpressionContextBuilder.build(
        mockParticipant,
        [],
        mockQuestions,
      )

      // Questions with answerOptionCodes are pre-initialised to {} so that
      // dot-notation access like Q001.A002 returns undefined (falsy) instead
      // of throwing a TypeError when no answer has been given yet.
      expect(context.answers['Q001']).toEqual({})
      expect(context.answers['Q004']).toEqual({})
      // Text/number questions without option codes are not pre-initialised.
      expect(context.answers['Q002']).toBeUndefined()
      expect(context.answers['Q003']).toBeUndefined()
      expect(context.answerOptionCodes).toContain('A001')
      expect(context.answerOptionCodes).toContain('A002')
    })

    it('should pre-initialise matrix questions with a per-option skeleton so unanswered rows are falsy, not throwing', () => {
      const context = ExpressionContextBuilder.build(
        mockParticipant,
        [],
        mockQuestions,
      )

      // Matrix answers are shaped { [subquestionCode]: { [answerOptionCode]: value } },
      // so Q006.S001 must be an object (not undefined) for Q006.S001.A005 to
      // evaluate to undefined (falsy) rather than throwing a TypeError.
      expect(context.answers['Q006']).toEqual({ S001: {}, S002: {} })
      const q006 = context.answers['Q006'] as Record<
        string,
        Record<string, unknown>
      >
      expect(q006.S001.A005).toBeUndefined()
      expect(q006.S002.A005).toBeUndefined()
    })

    it('should keep the skeleton object for matrix subquestion rows the participant has not touched', () => {
      // Matrix answers are stored sparsely - only rows the participant has
      // interacted with are present (see QuestionTypeMatrix.tsx). Only S001
      // has been touched here; S002 must still resolve to an object (not be
      // dropped) so that Q006.S002.A005 evaluates to undefined rather than
      // throwing when combined with Q006.S001.A005 in an && condition.
      const sparseMatrixAnswers: SurveyAnswer[] = [
        { questionCode: 'Q006', value: { S001: { A005: true } } },
      ]

      const context = ExpressionContextBuilder.build(
        mockParticipant,
        sparseMatrixAnswers,
        mockQuestions,
      )

      const q006 = context.answers['Q006'] as Record<
        string,
        Record<string, unknown>
      >
      expect(q006.S001.A005).toBe(true)
      expect(q006.S002).toEqual({})
      expect(q006.S002.A005).toBeUndefined()
    })

    it('should handle empty participant data', () => {
      const context = ExpressionContextBuilder.build(
        {},
        mockAnswers,
        mockQuestions,
      )
      expect(context.participant).toEqual({})
    })

    it('should expose response separately from both answers and participant', () => {
      // Regression: participant.language must always reflect the stored
      // profile value, never the live content-language selection - the two
      // can legitimately differ (e.g. a participant profiled as "en" taking
      // the survey in "zh"). response is a container of its own,
      // deliberately distinct from answers (question-code-keyed answers) so
      // a question coded "language" can never collide with it.
      const context = ExpressionContextBuilder.build(
        mockParticipant, // participant.language === 'en'
        [],
        mockQuestions,
        { language: 'zh' },
      )
      expect(context.participant.language).toBe('en')
      expect(context.response.language).toBe('zh')
      expect(context.answers.language).toBeUndefined()
    })

    it('should default response to an empty object when omitted', () => {
      const context = ExpressionContextBuilder.build(
        mockParticipant,
        [],
        mockQuestions,
      )
      expect(context.response).toEqual({})
    })

    it('should never let response collide with a same-coded question', () => {
      const questionsWithLanguageCode: QuestionInfo[] = [
        { code: 'language', type: 'text', position: 0 },
      ]
      const context = ExpressionContextBuilder.build(
        {},
        [{ questionCode: 'language', value: 'some answer' }],
        questionsWithLanguageCode,
        { language: 'zh' },
      )
      // The question's own answer is reachable via answers.language...
      expect(context.answers.language).toBe('some answer')
      // ...and response.language is unaffected, since it's a separate object
      expect(context.response.language).toBe('zh')
    })
  })

  describe('buildEmpty', () => {
    it('should return empty context', () => {
      const context = ExpressionContextBuilder.buildEmpty()
      expect(context.participant).toEqual({})
      expect(context.answers).toEqual({})
      expect(context.response).toEqual({})
      expect(context.answerOptionCodes).toEqual([])
      expect(context.answerOptionLiterals).toEqual({})
    })
  })
})
