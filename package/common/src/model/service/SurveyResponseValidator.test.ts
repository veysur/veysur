// cspell:ignore Spalte Essen Meine
import { MapOptions } from '../constructor/Survey/attributeMeta/types'
import { SurveyResponseValidator } from './SurveyResponseValidator'

describe('SurveyResponseValidator', () => {
  let validator: SurveyResponseValidator

  beforeEach(() => {
    validator = new SurveyResponseValidator()
  })

  describe('required', () => {
    const requiredTextQuestion = {
      code: 'Q1',
      type: 'text',
      attributes: { required: true },
    }

    test('empty string → error', async () => {
      const result = await validator.validate([requiredTextQuestion], {
        Q1: '',
      })
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1).toBeDefined()
      expect(result.errors.Q1.length).toBeGreaterThan(0)
    })

    test('missing answer → error', async () => {
      const result = await validator.validate([requiredTextQuestion], {})
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1).toBeDefined()
    })

    test('filled answer → no error', async () => {
      const result = await validator.validate([requiredTextQuestion], {
        Q1: 'hello',
      })
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual({})
    })

    test('not required, empty → no error', async () => {
      const question = { code: 'Q1', type: 'text', attributes: {} }
      const result = await validator.validate([question], { Q1: '' })
      expect(result.isValid).toBe(true)
    })
  })

  describe('lengthMinMax', () => {
    const lengthQuestion = {
      code: 'Q1',
      type: 'text',
      attributes: { lengthMinMax: { min: 5, max: 10 } },
    }

    test('too short → error', async () => {
      const result = await validator.validate([lengthQuestion], { Q1: 'hi' })
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1).toBeDefined()
    })

    test('too long → error', async () => {
      const result = await validator.validate([lengthQuestion], {
        Q1: 'this is way too long',
      })
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1).toBeDefined()
    })

    test('within range → no error', async () => {
      const result = await validator.validate([lengthQuestion], {
        Q1: 'hello',
      })
      expect(result.isValid).toBe(true)
    })
  })

  describe('textFormat', () => {
    const formatQuestion = (attributes: Record<string, unknown>) => ({
      code: 'Q1',
      type: 'text',
      attributes,
    })

    test('email: invalid → format error, valid → no error', async () => {
      const q = formatQuestion({ textFormat: 'email' })
      const bad = await validator.validate([q], { Q1: 'nope' })
      expect(bad.isValid).toBe(false)
      expect(bad.errors.Q1).toEqual([{ key: 'validation.textFormat_email' }])
      const good = await validator.validate([q], { Q1: 'a@b.co' })
      expect(good.isValid).toBe(true)
    })

    test('url and phone use their own error keys', async () => {
      const url = await validator.validate(
        [formatQuestion({ textFormat: 'url' })],
        { Q1: 'example' },
      )
      expect(url.errors.Q1).toEqual([{ key: 'validation.textFormat_url' }])
      const phone = await validator.validate(
        [formatQuestion({ textFormat: 'phone', textFormatCountries: 'GB' })],
        { Q1: '12345' },
      )
      expect(phone.errors.Q1).toEqual([{ key: 'validation.textFormat_phone' }])
    })

    test('phone: national number for a listed country passes', async () => {
      const result = await validator.validate(
        [formatQuestion({ textFormat: 'phone', textFormatCountries: 'GB' })],
        { Q1: '07911 123456' },
      )
      expect(result.isValid).toBe(true)
    })

    test('custom pattern; an unsafe stored pattern is skipped', async () => {
      const custom = formatQuestion({
        textFormat: 'custom',
        textFormatPattern: '^[A-Z]{2}\\d{4}$',
      })
      expect((await validator.validate([custom], { Q1: 'x' })).isValid).toBe(
        false,
      )
      expect(
        (await validator.validate([custom], { Q1: 'AB1234' })).isValid,
      ).toBe(true)
      const unsafe = formatQuestion({
        textFormat: 'custom',
        textFormatPattern: '(a+)+$',
      })
      expect((await validator.validate([unsafe], { Q1: 'x' })).isValid).toBe(
        true,
      )
    })

    test('empty optional answer passes; empty required answer reports required', async () => {
      const optional = formatQuestion({ textFormat: 'email' })
      expect((await validator.validate([optional], { Q1: '' })).isValid).toBe(
        true,
      )
      const required = formatQuestion({ textFormat: 'email', required: true })
      const result = await validator.validate([required], { Q1: '' })
      expect(result.isValid).toBe(false)
    })

    test('textFormat none or absent does not constrain', async () => {
      const result = await validator.validate(
        [formatQuestion({ textFormat: 'none' })],
        { Q1: 'anything' },
      )
      expect(result.isValid).toBe(true)
    })

    test('matrix text cell reports an invalid-format item error', async () => {
      const matrix = {
        code: 'Q1',
        type: 'matrixComposite',
        attributes: {},
        subquestions: [
          {
            code: 'S1',
            type: 'text',
            text: { en: 'Email' },
            attributes: { textFormat: 'email' },
          },
        ],
        answerOptions: [{ code: 'R1' }],
      }
      const result = await validator.validate([matrix], {
        Q1: { S1: { R1: 'nope' } },
      })
      expect(result.errors.Q1).toEqual([
        { key: 'validation.itemInvalidFormat', params: { label: 'Email' } },
      ])
    })

    test('multi-part text part reports an invalid-format item error', async () => {
      const multi = {
        code: 'Q1',
        type: 'multiPartText',
        attributes: {},
        subquestions: [
          {
            code: 'S1',
            type: 'text',
            text: { en: 'Website' },
            attributes: { textFormat: 'url' },
          },
        ],
      }
      const result = await validator.validate([multi], { Q1: { S1: 'nope' } })
      expect(result.errors.Q1).toEqual([
        { key: 'validation.itemInvalidFormat', params: { label: 'Website' } },
      ])
    })
  })

  describe('numberMinMax', () => {
    const numberQuestion = {
      code: 'Q1',
      type: 'number',
      attributes: { numberMinMax: { min: 1, max: 10 } },
    }

    test('below min → error', async () => {
      const result = await validator.validate([numberQuestion], { Q1: 0 })
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1).toBeDefined()
    })

    test('above max → error', async () => {
      const result = await validator.validate([numberQuestion], { Q1: 11 })
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1).toBeDefined()
    })

    test('within range → no error', async () => {
      const result = await validator.validate([numberQuestion], { Q1: 5 })
      expect(result.isValid).toBe(true)
    })

    test('max=0 skips validation', async () => {
      const question = {
        code: 'Q1',
        type: 'number',
        attributes: { numberMinMax: { min: 0, max: 0 } },
      }
      const result = await validator.validate([question], { Q1: 1000 })
      expect(result.isValid).toBe(true)
    })
  })

  describe('numberNegAllowed', () => {
    const question = {
      code: 'Q1',
      type: 'number',
      attributes: { numberNegAllowed: false },
    }

    test('negative number → error', async () => {
      const result = await validator.validate([question], { Q1: -5 })
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1).toBeDefined()
    })

    test('positive number → no error', async () => {
      const result = await validator.validate([question], { Q1: 5 })
      expect(result.isValid).toBe(true)
    })

    test('zero → no error', async () => {
      const result = await validator.validate([question], { Q1: 0 })
      expect(result.isValid).toBe(true)
    })

    test('numberNegAllowed=true allows negative', async () => {
      const q = {
        code: 'Q1',
        type: 'number',
        attributes: { numberNegAllowed: true },
      }
      const result = await validator.validate([q], { Q1: -5 })
      expect(result.isValid).toBe(true)
    })
  })

  describe('choiceMinMax', () => {
    const checkboxQuestion = {
      code: 'Q1',
      type: 'checkbox',
      attributes: { choiceMinMax: { min: 2, max: 3 } },
    }

    test('too few selected → error with message', async () => {
      const result = await validator.validate([checkboxQuestion], {
        Q1: { A: true },
      })
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1).toBeDefined()
      expect(result.errors.Q1).toContainEqual({
        key: 'validation.choiceCount_between',
        params: { min: 2, max: 3 },
      })
    })

    test('too many selected → error with message', async () => {
      const result = await validator.validate([checkboxQuestion], {
        Q1: { A: true, B: true, C: true, D: true },
      })
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1).toBeDefined()
      expect(result.errors.Q1).toContainEqual({
        key: 'validation.choiceCount_between',
        params: { min: 2, max: 3 },
      })
    })

    test('within range → no error', async () => {
      const result = await validator.validate([checkboxQuestion], {
        Q1: { A: true, B: true },
      })
      expect(result.isValid).toBe(true)
    })

    test('choiceMinMax ignored for non-choice types', async () => {
      const q = {
        code: 'Q1',
        type: 'text',
        attributes: { choiceMinMax: { min: 2, max: 3 } },
      }
      const result = await validator.validate([q], { Q1: 'x' })
      expect(result.isValid).toBe(true)
    })

    test('max=0 (unlimited) and too few selected → "at least" message', async () => {
      const q = {
        code: 'Q1',
        type: 'checkbox',
        attributes: { choiceMinMax: { min: 2, max: 0 } },
      }
      const result = await validator.validate([q], { Q1: { A: true } })
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1).toContainEqual({
        key: 'validation.choiceCount_atLeast',
        params: { min: 2, count: 2 },
      })
    })

    test('min=0 (unlimited) and too many selected → "no more than" message', async () => {
      const q = {
        code: 'Q1',
        type: 'checkbox',
        attributes: { choiceMinMax: { min: 0, max: 2 } },
      }
      const result = await validator.validate([q], {
        Q1: { A: true, B: true, C: true },
      })
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1).toContainEqual({
        key: 'validation.choiceCount_atMost',
        params: { max: 2, count: 2 },
      })
    })
  })

  describe('choiceMinMax ranking', () => {
    test('min and max set, too few ranked → "between" message', async () => {
      const q = {
        code: 'Q1',
        type: 'ranking',
        attributes: { choiceMinMax: { min: 2, max: 3 } },
      }
      const result = await validator.validate([q], { Q1: { ORDER: ['A'] } })
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1).toContainEqual({
        key: 'validation.rankCount_between',
        params: { min: 2, max: 3 },
      })
    })

    test('max=0 (unlimited) and too few ranked → "at least" message', async () => {
      const q = {
        code: 'Q1',
        type: 'ranking',
        attributes: { choiceMinMax: { min: 2, max: 0 } },
      }
      const result = await validator.validate([q], { Q1: { ORDER: ['A'] } })
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1).toContainEqual({
        key: 'validation.rankCount_atLeast',
        params: { min: 2, count: 2 },
      })
    })

    test('min=0 (unlimited) and too many ranked → "no more than" message', async () => {
      const q = {
        code: 'Q1',
        type: 'ranking',
        attributes: { choiceMinMax: { min: 0, max: 2 } },
      }
      const result = await validator.validate([q], {
        Q1: { ORDER: ['A', 'B', 'C'] },
      })
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1).toContainEqual({
        key: 'validation.rankCount_atMost',
        params: { max: 2, count: 2 },
      })
    })
  })

  describe('required choiceOther', () => {
    const checkboxQuestion = {
      code: 'Q1',
      type: 'checkbox',
      attributes: { required: true, choiceOther: true },
    }

    test('Other selected without OTHER_VALUE → error', async () => {
      const result = await validator.validate([checkboxQuestion], {
        Q1: { OTHER: true },
      })
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1).toContainEqual({
        key: 'validation.otherRequired',
      })
    })

    test('Other selected with blank OTHER_VALUE → error', async () => {
      const result = await validator.validate([checkboxQuestion], {
        Q1: { OTHER: true, OTHER_VALUE: '   ' },
      })
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1).toContainEqual({
        key: 'validation.otherRequired',
      })
    })

    test('Other selected with OTHER_VALUE filled → no error', async () => {
      const result = await validator.validate([checkboxQuestion], {
        Q1: { OTHER: true, OTHER_VALUE: 'my answer' },
      })
      expect(result.isValid).toBe(true)
    })

    test('Other not selected, another option selected → no error', async () => {
      const result = await validator.validate([checkboxQuestion], {
        Q1: { A: true },
      })
      expect(result.isValid).toBe(true)
    })

    test('choiceOther not enabled → Other value not required', async () => {
      const q = {
        code: 'Q1',
        type: 'checkbox',
        attributes: { required: true },
      }
      const result = await validator.validate([q], { Q1: { OTHER: true } })
      expect(result.isValid).toBe(true)
    })
  })

  describe('matrix subquestion validation', () => {
    const matrixQuestion = {
      code: 'Q1',
      type: 'matrixComposite',
      attributes: {},
      subquestions: [
        {
          code: 'S1',
          type: 'text',
          text: { en: 'Column A' },
          attributes: { required: true },
        },
        {
          code: 'S2',
          type: 'text',
          text: { en: 'Column B' },
          attributes: {},
        },
      ],
      answerOptions: [{ code: 'R1' }, { code: 'R2' }],
    }

    test('required subquestion column empty → single error per column', async () => {
      const result = await validator.validate([matrixQuestion], {
        Q1: {
          S1: { R1: '', R2: '' },
        },
      })
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1).toBeDefined()
      // Should have exactly one error for S1 (not one per row)
      expect(result.errors.Q1.length).toBe(1)
      expect(result.errors.Q1[0]).toEqual({
        key: 'validation.itemRequired',
        params: { label: 'Column A' },
      })
    })

    test('required subquestion column partially filled → error', async () => {
      const result = await validator.validate([matrixQuestion], {
        Q1: {
          S1: { R1: 'answer', R2: '' }, // R2 missing
        },
      })
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1.length).toBe(1)
    })

    test('required subquestion column filled → no error', async () => {
      const result = await validator.validate([matrixQuestion], {
        Q1: {
          S1: { R1: 'answer1', R2: 'answer2' },
        },
      })
      expect(result.isValid).toBe(true)
    })

    test('non-required subquestion column empty → no error', async () => {
      // S2 not required, only S1 is required. S1 values are missing → error.
      // Actually S1 is required so missing entirely = error
      // Let's test with S1 filled
      const result2 = await validator.validate([matrixQuestion], {
        Q1: {
          S1: { R1: 'filled', R2: 'filled' },
        },
      })
      expect(result2.isValid).toBe(true)
    })

    test('uses getLang method on L10n text objects', async () => {
      const question = {
        code: 'Q1',
        type: 'matrixComposite',
        attributes: {},
        subquestions: [
          {
            code: 'S1',
            type: 'text',
            text: {
              getLang: (lang: string) => (lang === 'en' ? 'My Column' : ''),
            },
            attributes: { required: true },
          },
        ],
        answerOptions: [{ code: 'R1' }],
      }
      const result = await validator.validate([question], { Q1: {} })
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1[0]).toEqual({
        key: 'validation.itemRequired',
        params: { label: 'My Column' },
      })
    })

    test('uses the response language for the label, not English', async () => {
      const question = {
        code: 'Q1',
        type: 'matrixComposite',
        attributes: {},
        subquestions: [
          {
            code: 'S1',
            type: 'text',
            text: { en: 'Column A', de: 'Spalte A' },
            attributes: { required: true },
          },
        ],
        answerOptions: [{ code: 'R1' }],
      }
      const result = await validator.validate(
        [question],
        { Q1: {} },
        { language: 'de' },
      )
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1[0]).toEqual({
        key: 'validation.itemRequired',
        params: { label: 'Spalte A' },
      })
    })

    test('falls back to the survey default language when text is missing in the response language', async () => {
      const question = {
        code: 'Q1',
        type: 'matrixComposite',
        attributes: {},
        subquestions: [
          {
            code: 'S1',
            type: 'text',
            text: { en: 'Column A' },
            attributes: { required: true },
          },
        ],
        answerOptions: [{ code: 'R1' }],
      }
      const result = await validator.validate(
        [question],
        { Q1: {} },
        { language: 'de', defaultLanguage: 'en' },
      )
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1[0]).toEqual({
        key: 'validation.itemRequired',
        params: { label: 'Column A' },
      })
    })

    test('falls back to the subquestion code only when text exists in no language', async () => {
      const question = {
        code: 'S001',
        type: 'matrixComposite',
        attributes: {},
        subquestions: [
          {
            code: 'S001',
            type: 'text',
            text: {},
            attributes: { required: true },
          },
        ],
        answerOptions: [{ code: 'R1' }],
      }
      const result = await validator.validate(
        [question],
        { S001: {} },
        { language: 'de', defaultLanguage: 'en' },
      )
      expect(result.isValid).toBe(false)
      expect(result.errors.S001[0]).toEqual({
        key: 'validation.itemRequired',
        params: { label: 'S001' },
      })
    })

    test('getLang-based text also uses the response language and default language', async () => {
      const question = {
        code: 'Q1',
        type: 'matrixComposite',
        attributes: {},
        subquestions: [
          {
            code: 'S1',
            type: 'text',
            text: {
              getLang: (lang: string, defaultLang: string) =>
                ({ de: 'Meine Spalte', en: 'My Column' })[lang] ||
                { de: 'Meine Spalte', en: 'My Column' }[defaultLang] ||
                '',
            },
            attributes: { required: true },
          },
        ],
        answerOptions: [{ code: 'R1' }],
      }
      const result = await validator.validate(
        [question],
        { Q1: {} },
        { language: 'de' },
      )
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1[0]).toEqual({
        key: 'validation.itemRequired',
        params: { label: 'Meine Spalte' },
      })
    })

    test('empty matrix value → errors for required subquestions', async () => {
      const result = await validator.validate([matrixQuestion], {
        Q1: null,
      })
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1).toBeDefined()
    })

    test('no subquestions → no matrix errors', async () => {
      const question = {
        code: 'Q1',
        type: 'matrixComposite',
        attributes: {},
        subquestions: [],
        answerOptions: [{ code: 'R1' }],
      }
      const result = await validator.validate([question], { Q1: {} })
      expect(result.isValid).toBe(true)
    })
  })

  describe('matrix question-level required', () => {
    const matrixRequiredQuestion = {
      code: 'Q1',
      type: 'matrixComposite',
      attributes: { required: true },
      subquestions: [
        {
          code: 'S1',
          type: 'text',
          text: { en: 'Col' },
          attributes: {},
        },
      ],
      answerOptions: [{ code: 'R1' }, { code: 'R2' }],
    }

    test('no cells filled → error', async () => {
      const result = await validator.validate([matrixRequiredQuestion], {
        Q1: {},
      })
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1).toBeDefined()
      expect(result.errors.Q1[0]).toEqual({ key: 'validation.required' })
    })

    test('row keys present but cells empty → error', async () => {
      const result = await validator.validate([matrixRequiredQuestion], {
        Q1: { S1: {} },
      })
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1).toBeDefined()
    })

    test('null matrix value → error', async () => {
      const result = await validator.validate([matrixRequiredQuestion], {
        Q1: null,
      })
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1).toBeDefined()
    })

    test('at least one cell filled → no error', async () => {
      const result = await validator.validate([matrixRequiredQuestion], {
        Q1: { S1: { R1: 'answer' } },
      })
      expect(result.isValid).toBe(true)
    })

    test('false cell value counts as filled (yes/no answer)', async () => {
      const q = {
        ...matrixRequiredQuestion,
        subquestions: [
          { code: 'S1', type: 'yesNo', text: { en: 'Col' }, attributes: {} },
        ],
      }
      const result = await validator.validate([q], {
        Q1: { S1: { R1: false } },
      })
      expect(result.isValid).toBe(true)
    })

    test('not required, all cells empty → no error', async () => {
      const q = {
        ...matrixRequiredQuestion,
        attributes: {},
      }
      const result = await validator.validate([q], { Q1: {} })
      expect(result.isValid).toBe(true)
    })
  })

  describe('multiple questions', () => {
    test('errors reported per question code', async () => {
      const questions = [
        { code: 'Q1', type: 'text', attributes: { required: true } },
        { code: 'Q2', type: 'text', attributes: { required: true } },
        { code: 'Q3', type: 'text', attributes: {} },
      ]
      const result = await validator.validate(questions, {
        Q1: '',
        Q2: '',
        Q3: '',
      })
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1).toBeDefined()
      expect(result.errors.Q2).toBeDefined()
      expect(result.errors.Q3).toBeUndefined()
    })
  })

  describe('conditional question filtering', () => {
    const requiredQuestion = {
      code: 'Q1',
      type: 'text',
      attributes: { required: true },
    }

    test('question with false condition is skipped — no validation error', async () => {
      const questions = [{ ...requiredQuestion, condition: 'false' }]
      const result = await validator.validate(questions, { Q1: '' })
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual({})
    })

    test('question with true condition is validated', async () => {
      const questions = [{ ...requiredQuestion, condition: 'true' }]
      const result = await validator.validate(questions, { Q1: '' })
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1).toBeDefined()
    })

    test('condition referencing another answer — skips when condition is false', async () => {
      const questions = [
        { code: 'Q1', type: 'text', attributes: {} },
        // Q2 only required when Q1 === 'yes'
        {
          code: 'Q2',
          type: 'text',
          attributes: { required: true },
          condition: "answers.Q1 === 'yes'",
        },
      ]
      const result = await validator.validate(questions, { Q1: 'no', Q2: '' })
      expect(result.isValid).toBe(true)
    })

    test('condition referencing another answer — validates when condition is true', async () => {
      const questions = [
        { code: 'Q1', type: 'text', attributes: {} },
        {
          code: 'Q2',
          type: 'text',
          attributes: { required: true },
          condition: "answers.Q1 === 'yes'",
        },
      ]
      const result = await validator.validate(questions, { Q1: 'yes', Q2: '' })
      expect(result.isValid).toBe(false)
      expect(result.errors.Q2).toBeDefined()
    })

    test('condition referencing response.language uses the language option, not a participant field', async () => {
      const questions = [
        { code: 'Q1', type: 'text', attributes: {} },
        {
          code: 'Q2',
          type: 'text',
          attributes: { required: true },
          condition: "response.language === 'zh'",
        },
      ]
      const skipped = await validator.validate(
        questions,
        { Q1: '', Q2: '' },
        { language: 'en' },
      )
      expect(skipped.isValid).toBe(true)

      const validated = await validator.validate(
        questions,
        { Q1: '', Q2: '' },
        { language: 'zh' },
      )
      expect(validated.isValid).toBe(false)
      expect(validated.errors.Q2).toBeDefined()
    })

    test('question hidden by group condition is skipped', async () => {
      const questions = [{ ...requiredQuestion, sectionId: 'G1' }]
      const sections = [{ _id: 'G1', condition: 'false' }]
      const result = await validator.validate(
        questions,
        { Q1: '' },
        { sections },
      )
      expect(result.isValid).toBe(true)
    })

    test('question in visible group is validated', async () => {
      const questions = [{ ...requiredQuestion, sectionId: 'G1' }]
      const sections = [{ _id: 'G1', condition: 'true' }]
      const result = await validator.validate(
        questions,
        { Q1: '' },
        { sections },
      )
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1).toBeDefined()
    })

    test('no conditions — all questions validated (fast path)', async () => {
      const questions = [
        { code: 'Q1', type: 'text', attributes: { required: true } },
        { code: 'Q2', type: 'text', attributes: { required: true } },
      ]
      const result = await validator.validate(questions, { Q1: '', Q2: '' })
      expect(result.isValid).toBe(false)
      expect(result.errors.Q1).toBeDefined()
      expect(result.errors.Q2).toBeDefined()
    })
  })

  describe('all-valid response', () => {
    test('isValid true, empty errors', async () => {
      const questions = [
        { code: 'Q1', type: 'text', attributes: { required: true } },
        {
          code: 'Q2',
          type: 'number',
          attributes: { numberMinMax: { min: 1, max: 5 } },
        },
      ]
      const result = await validator.validate(questions, {
        Q1: 'some text',
        Q2: 3,
      })
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual({})
    })
  })
  describe('map', () => {
    const mapQuestion = (
      mapOptions: Partial<MapOptions> = {},
      required = false,
    ) => ({
      code: 'Q1',
      type: 'map',
      attributes: { required, mapOptions: mapOptions as MapOptions },
    })
    const pin = { lat: 51.5074, lng: -0.1278, precision: 'exact' }
    const coarsePin = { lat: 51.5, lng: -0.1, precision: 'coarse' }

    test('accepts a valid pin', async () => {
      const result = await validator.validate([mapQuestion()], { Q1: pin })
      expect(result.isValid).toBe(true)
    })

    test('an unanswered optional question is valid', async () => {
      const result = await validator.validate([mapQuestion()], {})
      expect(result.isValid).toBe(true)
    })

    test('an unanswered required question is rejected', async () => {
      const result = await validator.validate([mapQuestion({}, true)], {})
      expect(result.errors.Q1).toEqual([{ key: 'validation.required' }])
    })

    test('a malformed pin is rejected', async () => {
      const result = await validator.validate([mapQuestion()], {
        Q1: { lat: 'x', lng: 1 },
      })
      expect(result.errors.Q1).toEqual([
        { key: 'validation.mapLocationInvalid' },
      ])
    })

    test('a coarse question rejects an exact pin', async () => {
      const result = await validator.validate(
        [mapQuestion({ precision: 'coarse' })],
        { Q1: pin },
      )
      expect(result.errors.Q1).toEqual([{ key: 'validation.mapPrecision' }])
    })

    test('an anonymous survey rejects an exact pin on an exact question', async () => {
      const result = await validator.validate(
        [mapQuestion({ precision: 'exact' })],
        { Q1: pin },
        { anonymous: true },
      )
      expect(result.errors.Q1).toEqual([{ key: 'validation.mapPrecision' }])
    })

    test('an anonymous survey accepts a coarse pin', async () => {
      const result = await validator.validate(
        [mapQuestion({ precision: 'exact' })],
        { Q1: coarsePin },
        { anonymous: true },
      )
      expect(result.isValid).toBe(true)
    })

    test('a country restriction rejects an unlisted country', async () => {
      const result = await validator.validate(
        [mapQuestion({ countries: 'GB' })],
        { Q1: { ...pin, countryCode: 'FR' } },
      )
      expect(result.errors.Q1).toEqual([{ key: 'validation.mapCountry' }])
    })

    test('a country restriction accepts a listed country', async () => {
      const result = await validator.validate(
        [mapQuestion({ countries: 'GB' })],
        { Q1: { ...pin, countryCode: 'GB' } },
      )
      expect(result.isValid).toBe(true)
    })
  })
})
