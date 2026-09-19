import { ConditionValidator } from './ConditionValidator'
import { QuestionInfo } from './types'

describe('ConditionValidator', () => {
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
  ]

  describe('validate', () => {
    it('should return valid for null/empty condition', () => {
      const result = ConditionValidator.validate(null, mockQuestions, 5)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should return valid for empty string condition', () => {
      const result = ConditionValidator.validate('', mockQuestions, 5)
      expect(result.isValid).toBe(true)
    })

    it('should return valid for whitespace-only condition', () => {
      const result = ConditionValidator.validate('   ', mockQuestions, 5)
      expect(result.isValid).toBe(true)
    })

    it('should validate simple comparison', () => {
      const result = ConditionValidator.validate(
        'answers.Q001 === "A001"',
        mockQuestions,
        5,
      )
      expect(result.isValid).toBe(true)
    })

    it('should validate numeric comparison', () => {
      const result = ConditionValidator.validate(
        'answers.Q003 > 5',
        mockQuestions,
        5,
      )
      expect(result.isValid).toBe(true)
    })

    it('should validate boolean operators', () => {
      const result = ConditionValidator.validate(
        'answers.Q001 && answers.Q002',
        mockQuestions,
        5,
      )
      expect(result.isValid).toBe(true)
    })

    it('should validate answer option references', () => {
      const result = ConditionValidator.validate(
        'answers.Q001.A001 === true',
        mockQuestions,
        5,
      )
      expect(result.isValid).toBe(true)
    })

    it('should validate participant variables', () => {
      const result = ConditionValidator.validate(
        'participant.email === "test@example.com"',
        mockQuestions,
        5,
      )
      expect(result.isValid).toBe(true)
    })

    it('should validate a known response field', () => {
      const result = ConditionValidator.validate(
        'response.language === "zh"',
        mockQuestions,
        5,
      )
      expect(result.isValid).toBe(true)
    })

    it('should reject an unknown response field', () => {
      const result = ConditionValidator.validate(
        'response.deviceType === "mobile"',
        mockQuestions,
        5,
      )
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('Unknown response field')
    })

    it('should detect invalid syntax', () => {
      const result = ConditionValidator.validate(
        'answers.Q001 ===',
        mockQuestions,
        5,
      )
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('Invalid syntax')
    })

    it('should detect unknown question codes', () => {
      const result = ConditionValidator.validate(
        'answers.UNKNOWN === "test"',
        mockQuestions,
        5,
      )
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('Unknown question code')
    })

    it('should detect unknown answer option codes', () => {
      const result = ConditionValidator.validate(
        'answers.Q001.A999 === true',
        mockQuestions,
        5,
      )
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('Unknown answer option code')
    })

    it.each([
      ['yesNo', 'YES'],
      ['starRating', 'P4'],
      ['point5', 'P4'],
      ['point10', 'P4'],
    ])(
      "should validate references to a fixed-scale preset type's predefined answer option code (%s.%s)",
      (presetType, predefinedCode) => {
        const questions: QuestionInfo[] = [
          {
            code: 'Q001',
            type: presetType,
            position: 0,
            answerOptionCodes: [predefinedCode],
          },
        ]
        const result = ConditionValidator.validate(
          `answers.Q001.${predefinedCode} === true`,
          questions,
          5,
        )
        expect(result.isValid).toBe(true)
      },
    )

    it.each(['yesNo', 'starRating', 'point5', 'point10'])(
      'should reject stale/unknown answer option codes on fixed-scale preset types (%s)',
      (presetType) => {
        // A question that used to be a checkbox (A001/A002 still stored on
        // answerOptions) but has since been changed to a preset type, whose
        // only addressable codes are its own predefined ones.
        const questions: QuestionInfo[] = [
          {
            code: 'Q001',
            type: presetType,
            position: 0,
            answerOptionCodes: ['YES', 'NO', 'P1'],
          },
        ]
        const result = ConditionValidator.validate(
          'answers.Q001.A001 === true',
          questions,
          5,
        )
        expect(result.isValid).toBe(false)
        expect(result.errors[0]).toContain('Unknown answer option code')
      },
    )

    it('should allow OTHER and OTHER_VALUE codes for questions with choiceOther', () => {
      const questions: QuestionInfo[] = [
        {
          code: 'Q001',
          type: 'checkbox',
          position: 0,
          answerOptionCodes: ['A001', 'A002'],
          choiceOtherValue: true,
        },
      ]
      const otherResult = ConditionValidator.validate(
        'answers.Q001.OTHER',
        questions,
        5,
      )
      expect(otherResult.isValid).toBe(true)

      const otherValueResult = ConditionValidator.validate(
        'answers.Q001.OTHER_VALUE === "custom"',
        questions,
        5,
      )
      expect(otherValueResult.isValid).toBe(true)

      const combinedResult = ConditionValidator.validate(
        'answers.Q001.OTHER && answers.Q001.OTHER_VALUE === "custom"',
        questions,
        5,
      )
      expect(combinedResult.isValid).toBe(true)
    })

    it('should reject OTHER and OTHER_VALUE codes for questions without choiceOther', () => {
      const result = ConditionValidator.validate(
        'answers.Q004.OTHER',
        mockQuestions,
        5,
      )
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('"Other" option is not enabled')
    })

    it('should detect forward references', () => {
      // Current position is 1, Q002 is at position 1, Q003 is at position 2
      const result = ConditionValidator.validate(
        'answers.Q003 > 5',
        mockQuestions,
        1,
      )
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('Forward reference not allowed')
    })

    it('should allow referencing questions before current position', () => {
      const result = ConditionValidator.validate(
        'answers.Q001 === "A001"',
        mockQuestions,
        2,
      )
      expect(result.isValid).toBe(true)
    })

    it('should not allow self-reference (same position)', () => {
      const result = ConditionValidator.validate(
        'answers.Q002 === "test"',
        mockQuestions,
        1,
      )
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('Forward reference not allowed')
    })

    it('should track referenced variables', () => {
      const result = ConditionValidator.validate(
        'participant.email && answers.Q001 > 3 && answers.Q001.A001',
        mockQuestions,
        5,
      )
      expect(result.referencedVariables).toHaveLength(3)
      expect(
        result.referencedVariables.find((v) => v.name === 'email'),
      ).toBeTruthy()
      expect(
        result.referencedVariables.find((v) => v.name === 'Q001'),
      ).toBeTruthy()
      expect(
        result.referencedVariables.find((v) => v.name === 'Q001.A001'),
      ).toBeTruthy()
    })

    it('should detect multiple errors', () => {
      const result = ConditionValidator.validate(
        'answers.UNKNOWN1 && answers.UNKNOWN2',
        mockQuestions,
        5,
      )
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(2)
    })

    it('should validate unquoted answer codes', () => {
      const result = ConditionValidator.validate(
        'answers.Q001 === A001',
        mockQuestions,
        5,
      )
      expect(result.isValid).toBe(true)
      // Should have both Q001 (question) and A001 (answerCode) as referenced variables
      expect(result.referencedVariables).toHaveLength(2)
      expect(
        result.referencedVariables.find((v) => v.name === 'A001')?.type,
      ).toBe('answerCode')
    })

    it('should validate unquoted answer codes in includes()', () => {
      const result = ConditionValidator.validate(
        'answers.Q004.includes(A001)',
        mockQuestions,
        5,
      )
      expect(result.isValid).toBe(true)
    })

    it('should detect an unknown bare answer-code literal', () => {
      // A999 is not one of Q001's answerOptionCodes, so it's flagged as an
      // unknown answer code (bare identifiers are always answer-code
      // literals under the answers./participant. grammar - there's no
      // longer a "maybe it's a question code" fallback for bare identifiers).
      const result = ConditionValidator.validate(
        'answers.Q001 === A999',
        mockQuestions,
        5,
      )
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('Unknown answer code')
    })

    it('should support quoted answer codes', () => {
      const result = ConditionValidator.validate(
        'answers.Q001 === "A001"',
        mockQuestions,
        5,
      )
      expect(result.isValid).toBe(true)
    })
  })

  describe('matrix cell validation', () => {
    const matrixQuestions: QuestionInfo[] = [
      {
        code: 'Q001',
        type: 'matrixComposite',
        position: 0,
        answerOptionCodes: ['A001', 'A002'],
        subquestions: [
          { code: 'S001', type: 'number', text: 'Subquestion 1' },
          { code: 'S002', type: 'checkbox', text: 'Subquestion 2' },
        ],
      },
      { code: 'Q002', type: 'text', position: 1 },
    ]

    it('should validate a valid matrix cell reference', () => {
      const result = ConditionValidator.validate(
        'answers.Q001.S001.A001 > 3',
        matrixQuestions,
        5,
      )
      expect(result.isValid).toBe(true)
    })

    it('should error for matrix cell on non-matrix question', () => {
      const questions: QuestionInfo[] = [
        { code: 'Q002', type: 'text', position: 0 },
      ]
      const result = ConditionValidator.validate(
        'answers.Q002.S001.A001 === 5',
        questions,
        5,
      )
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('not a matrix question')
    })

    it('should error for unknown question in matrix cell reference', () => {
      const result = ConditionValidator.validate(
        'answers.UNKNOWN.S001.A001 === 5',
        matrixQuestions,
        5,
      )
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('Unknown question code')
    })

    it('should error for forward reference in matrix cell', () => {
      const result = ConditionValidator.validate(
        'answers.Q001.S001.A001 > 3',
        matrixQuestions,
        0, // current position is 0, Q001 is also at position 0
      )
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('Forward reference not allowed')
    })

    it('should error for unknown answer option in matrix cell', () => {
      const result = ConditionValidator.validate(
        'answers.Q001.S001.A999 > 3',
        matrixQuestions,
        5,
      )
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('Unknown answer option')
    })

    it('should error for unknown subquestion in matrix cell', () => {
      const result = ConditionValidator.validate(
        'answers.Q001.BAD.A001 > 3',
        matrixQuestions,
        5,
      )
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('Unknown subquestion')
    })

    it('explains that a bare matrix row needs a cell reference', () => {
      const result = ConditionValidator.validate(
        'answers.Q001.S001 === "x"',
        matrixQuestions,
        5,
      )
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain(
        'is a matrix row, not an answer option',
      )
    })
  })

  describe('isSafeExpression', () => {
    it('should allow safe expressions', () => {
      expect(
        ConditionValidator.isSafeExpression('answers.Q001 === "yes"'),
      ).toBe(true)
      expect(
        ConditionValidator.isSafeExpression(
          'answers.Q001 > 5 && answers.Q002 < 10',
        ),
      ).toBe(true)
      expect(
        ConditionValidator.isSafeExpression('participant.email.includes("@")'),
      ).toBe(true)
    })

    it('should block eval', () => {
      expect(ConditionValidator.isSafeExpression('eval("alert(1)")')).toBe(
        false,
      )
    })

    it('should block Function constructor', () => {
      expect(ConditionValidator.isSafeExpression('Function("return 1")')).toBe(
        false,
      )
    })

    it('should block window access', () => {
      expect(ConditionValidator.isSafeExpression('window.location')).toBe(false)
    })

    it('should block document access', () => {
      expect(ConditionValidator.isSafeExpression('document.cookie')).toBe(false)
    })

    it('should block fetch', () => {
      expect(
        ConditionValidator.isSafeExpression('fetch("http://evil.com")'),
      ).toBe(false)
    })

    it('should block prototype access', () => {
      expect(ConditionValidator.isSafeExpression('obj.__proto__')).toBe(false)
      expect(ConditionValidator.isSafeExpression('obj.constructor')).toBe(false)
    })

    it('should return true for empty/null condition', () => {
      expect(ConditionValidator.isSafeExpression('')).toBe(true)
      expect(
        ConditionValidator.isSafeExpression(null as unknown as string),
      ).toBe(true)
    })
  })
})
