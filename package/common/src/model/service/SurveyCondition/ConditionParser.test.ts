import { ConditionParser } from './ConditionParser'

describe('ConditionParser', () => {
  describe('extractVariables', () => {
    it('should return empty array for null/undefined/empty condition', () => {
      expect(
        ConditionParser.extractVariables(null as unknown as string),
      ).toEqual([])
      expect(
        ConditionParser.extractVariables(undefined as unknown as string),
      ).toEqual([])
      expect(ConditionParser.extractVariables('')).toEqual([])
    })

    it('should extract participant variables', () => {
      const variables = ConditionParser.extractVariables(
        'participant.email === "test@example.com"',
      )
      expect(variables).toEqual([{ name: 'email', type: 'participant' }])
    })

    it('should extract all participant variables', () => {
      const variables = ConditionParser.extractVariables(
        'participant.email && participant.nameFirst && participant.nameLast && participant.token && participant.language',
      )
      const names = variables.map((v) => v.name)
      expect(names).toContain('email')
      expect(names).toContain('nameFirst')
      expect(names).toContain('nameLast')
      expect(names).toContain('token')
      expect(names).toContain('language')
      expect(variables.every((v) => v.type === 'participant')).toBe(true)
    })

    it('should extract a custom participant attribute the same way as a system one', () => {
      const variables = ConditionParser.extractVariables(
        'participant.city === "Liverpool"',
      )
      expect(variables).toEqual([{ name: 'city', type: 'participant' }])
    })

    it('should extract response variables, kept distinct from participant', () => {
      const variables = ConditionParser.extractVariables(
        'response.language === "zh"',
      )
      expect(variables).toEqual([{ name: 'language', type: 'response' }])
    })

    it('should not confuse response with answers', () => {
      const variables = ConditionParser.extractVariables(
        'response.language === "zh" && answers.Q001 === "yes"',
      )
      expect(variables).toHaveLength(2)
      expect(variables.find((v) => v.name === 'language')?.type).toBe(
        'response',
      )
      expect(variables.find((v) => v.name === 'Q001')?.type).toBe('question')
    })

    it('should extract question code variables', () => {
      const variables = ConditionParser.extractVariables(
        'answers.Q001 === "yes"',
      )
      expect(variables).toEqual([
        { name: 'Q001', type: 'question', questionCode: 'Q001' },
      ])
    })

    it('should extract answer option references', () => {
      const variables = ConditionParser.extractVariables(
        'answers.Q001.A001 === true',
      )
      expect(variables).toEqual([
        {
          name: 'Q001.A001',
          type: 'answerOption',
          questionCode: 'Q001',
          answerOptionCode: 'A001',
        },
      ])
    })

    it('should handle mixed variable types', () => {
      const variables = ConditionParser.extractVariables(
        'participant.email && answers.Q001 > 3 && answers.Q002.A001',
      )
      expect(variables).toHaveLength(3)
      expect(variables.find((v) => v.name === 'email')?.type).toBe(
        'participant',
      )
      expect(variables.find((v) => v.name === 'Q001')?.type).toBe('question')
      expect(variables.find((v) => v.name === 'Q002.A001')?.type).toBe(
        'answerOption',
      )
    })

    it('should not duplicate variables', () => {
      const variables = ConditionParser.extractVariables(
        'answers.Q001 > 3 && answers.Q001 < 10',
      )
      expect(variables).toHaveLength(1)
      expect(variables[0].name).toBe('Q001')
    })

    it('should handle complex expressions', () => {
      const variables = ConditionParser.extractVariables(
        '(answers.Q001 >= 5 || answers.Q002.A001) && participant.language === "en"',
      )
      expect(variables).toHaveLength(3)
    })

    it('should extract standalone answer codes when availableAnswerCodes is provided', () => {
      const availableAnswerCodes = new Set(['A001', 'A002', 'A003'])
      const variables = ConditionParser.extractVariables(
        'answers.Q001 === A001',
        availableAnswerCodes,
      )
      expect(variables).toHaveLength(2)
      expect(variables.find((v) => v.name === 'Q001')?.type).toBe('question')
      expect(variables.find((v) => v.name === 'A001')?.type).toBe('answerCode')
      expect(variables.find((v) => v.name === 'A001')?.answerOptionCode).toBe(
        'A001',
      )
    })

    it('should still classify an unknown bare identifier as an answer code (for the validator to flag)', () => {
      const availableAnswerCodes = new Set(['A001', 'A002'])
      const variables = ConditionParser.extractVariables(
        'answers.Q001 === X999',
        availableAnswerCodes,
      )
      expect(variables).toHaveLength(2)
      expect(variables.find((v) => v.name === 'X999')?.type).toBe('answerCode')
    })

    it('should handle mixed syntax (quoted and unquoted answer codes)', () => {
      const availableAnswerCodes = new Set(['A001', 'A002'])
      // Note: Quoted "A003" is removed by removeStringLiterals, so it won't be extracted
      // Q001, A001 (answerCode), and Q002 will be extracted
      const variables = ConditionParser.extractVariables(
        'answers.Q001 === A001 && answers.Q002 === "A003"',
        availableAnswerCodes,
      )
      expect(variables).toHaveLength(3)
      expect(variables.find((v) => v.name === 'Q001')?.type).toBe('question')
      expect(variables.find((v) => v.name === 'A001')?.type).toBe('answerCode')
      expect(variables.find((v) => v.name === 'Q002')?.type).toBe('question')
    })

    it('should handle unquoted answer codes in includes() calls', () => {
      const availableAnswerCodes = new Set(['A001', 'A002'])
      const variables = ConditionParser.extractVariables(
        'answers.Q004.includes(A001)',
        availableAnswerCodes,
      )
      expect(variables).toHaveLength(2)
      expect(variables.find((v) => v.name === 'A001')?.type).toBe('answerCode')
    })
  })

  describe('getReferencedQuestionCodes', () => {
    it('should return question codes from direct references', () => {
      const codes = ConditionParser.getReferencedQuestionCodes(
        'answers.Q001 === "yes" && answers.Q002 > 5',
      )
      expect(codes).toContain('Q001')
      expect(codes).toContain('Q002')
    })

    it('should return question codes from answer option references', () => {
      const codes = ConditionParser.getReferencedQuestionCodes(
        'answers.Q001.A001 && answers.Q002.A003',
      )
      expect(codes).toContain('Q001')
      expect(codes).toContain('Q002')
    })

    it('should not include participant variables', () => {
      const codes = ConditionParser.getReferencedQuestionCodes(
        'participant.email && answers.Q001',
      )
      expect(codes).toEqual(['Q001'])
    })

    it('should not duplicate question codes', () => {
      const codes = ConditionParser.getReferencedQuestionCodes(
        'answers.Q001 && answers.Q001.A001 && answers.Q001.A002',
      )
      expect(codes).toEqual(['Q001'])
    })

    it('should return question code from matrix cell references', () => {
      const codes = ConditionParser.getReferencedQuestionCodes(
        'answers.Q001.S001.A001 > 5',
      )
      expect(codes).toContain('Q001')
    })
  })

  describe('getReferencedCodes', () => {
    it('excludes participant and response variables from the cache', () => {
      const codes = ConditionParser.getReferencedCodes(
        'participant.email && response.language === "zh" && answers.Q001',
      )
      expect(codes).toEqual(['Q001'])
    })
  })

  describe('matrixCell extraction', () => {
    it('should extract matrix cell references (answers.Q001.S001.A001)', () => {
      const variables = ConditionParser.extractVariables(
        'answers.Q001.S001.A001 === 5',
      )
      expect(variables).toHaveLength(1)
      expect(variables[0]).toEqual({
        name: 'Q001.S001.A001',
        type: 'matrixCell',
        questionCode: 'Q001',
        answerOptionCode: 'A001',
        subquestionCode: 'S001',
      })
    })

    it('should not extract the two-part components of a matrix cell reference', () => {
      const variables = ConditionParser.extractVariables(
        'answers.Q001.S001.A001 === 5',
      )
      // Should have only one variable (the full matrix cell), not Q001.S001 or Q001 separately
      expect(variables).toHaveLength(1)
      expect(variables[0].type).toBe('matrixCell')
    })

    it('should extract matrix cell and other variable types in mixed expression', () => {
      const variables = ConditionParser.extractVariables(
        'answers.Q001.S001.A001 > 100 && answers.Q002 === "yes" && participant.language === "en"',
      )
      expect(variables).toHaveLength(3)
      expect(variables.find((v) => v.type === 'matrixCell')?.name).toBe(
        'Q001.S001.A001',
      )
      expect(variables.find((v) => v.name === 'Q002')?.type).toBe('question')
      expect(variables.find((v) => v.name === 'language')?.type).toBe(
        'participant',
      )
    })

    it('should not duplicate matrix cell variables', () => {
      const variables = ConditionParser.extractVariables(
        'answers.Q001.S001.A001 > 3 && answers.Q001.S001.A001 < 10',
      )
      expect(variables.filter((v) => v.type === 'matrixCell')).toHaveLength(1)
    })

    it('should still extract plain answers.Q001.A001 when no third dot follows', () => {
      const variables = ConditionParser.extractVariables(
        'answers.Q001.A001 === true',
      )
      expect(variables).toHaveLength(1)
      expect(variables[0].type).toBe('answerOption')
      expect(variables[0].answerOptionCode).toBe('A001')
    })
  })
})
