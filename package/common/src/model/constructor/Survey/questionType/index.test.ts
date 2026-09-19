import {
  getAllPredefinedAnswerOptionCodes,
  getPredefinedAnswerOptions,
  getQuestionTypeDefinition,
  questionTypeHasPredefinedAnswerOptions,
  registerQuestionTypeDefinition,
} from './index'

describe('questionType registry', () => {
  it('registers yesNo with Yes/No predefined answer options', () => {
    const options = getPredefinedAnswerOptions('yesNo')
    expect(options).toEqual([
      { code: 'YES', label: 'Yes', value: true },
      { code: 'NO', label: 'No', value: false },
    ])
  })

  it('registers starRating and point5 with a shared 1-5 point scale', () => {
    for (const type of ['starRating', 'point5']) {
      const options = getPredefinedAnswerOptions(type)
      expect(options?.map((o) => o.code)).toEqual([
        'P1',
        'P2',
        'P3',
        'P4',
        'P5',
      ])
      expect(options?.[3]).toEqual({ code: 'P4', label: '4', value: 4 })
    }
  })

  it('registers point10 with a 1-10 point scale', () => {
    const options = getPredefinedAnswerOptions('point10')
    expect(options?.map((o) => o.code)).toEqual([
      'P1',
      'P2',
      'P3',
      'P4',
      'P5',
      'P6',
      'P7',
      'P8',
      'P9',
      'P10',
    ])
  })

  it('returns undefined for a type with no predefined answer options', () => {
    expect(getPredefinedAnswerOptions('text')).toBeUndefined()
    expect(getQuestionTypeDefinition('text')).toBeUndefined()
    expect(questionTypeHasPredefinedAnswerOptions('text')).toBe(false)
  })

  it('reports true only for the four predefined-answer-option types', () => {
    expect(questionTypeHasPredefinedAnswerOptions('yesNo')).toBe(true)
    expect(questionTypeHasPredefinedAnswerOptions('starRating')).toBe(true)
    expect(questionTypeHasPredefinedAnswerOptions('point5')).toBe(true)
    expect(questionTypeHasPredefinedAnswerOptions('point10')).toBe(true)
    expect(questionTypeHasPredefinedAnswerOptions('checkbox')).toBe(false)
  })

  it('allows a new question type to register its own definition at runtime', () => {
    // Smoke test for future dynamically-loaded custom question types.
    registerQuestionTypeDefinition({
      type: 'customTestType',
      predefinedAnswerOptions: [{ code: 'CUSTOM', label: 'Custom', value: 1 }],
    })

    expect(questionTypeHasPredefinedAnswerOptions('customTestType')).toBe(true)
    expect(getPredefinedAnswerOptions('customTestType')).toEqual([
      { code: 'CUSTOM', label: 'Custom', value: 1 },
    ])
  })

  describe('getAllPredefinedAnswerOptionCodes', () => {
    it("includes every built-in type's predefined codes", () => {
      const codes = getAllPredefinedAnswerOptionCodes()
      expect(codes).toEqual(
        expect.arrayContaining(['YES', 'NO', 'P1', 'P5', 'P10']),
      )
    })

    it('reflects a type registered after this module was first loaded', () => {
      registerQuestionTypeDefinition({
        type: 'anotherCustomTestType',
        predefinedAnswerOptions: [
          { code: 'CUSTOM_LIVE', label: 'Custom live', value: true },
        ],
      })

      expect(getAllPredefinedAnswerOptionCodes()).toContain('CUSTOM_LIVE')
    })
  })
})
