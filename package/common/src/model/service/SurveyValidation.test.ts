import { Survey } from '../constructor/Survey'
import { SettingSurvey } from '../constructor/SettingSurvey'
import { L10n } from '../constructor/L10n'
import { SurveyValidation } from './SurveyValidation'

jest.mock('../schema-manager', () => ({
  schemaManager: { getSchema: () => undefined },
}))

describe('SurveyValidation - L10n content validation', () => {
  const validator = new SurveyValidation()

  const baseSurvey = () =>
    new Survey({
      _id: 's1',
      language: { default: 'en' },
      sections: [{ _id: 'g1', name: { en: 'Group 1' } }],
      elements: [],
    })

  describe('question text', () => {
    test('question with no default-language text produces an error', async () => {
      const survey = new Survey({
        ...baseSurvey(),
        elements: [{ _id: 'q1', sectionId: 'g1', text: {} }],
      })

      const result = await validator.validate(survey)

      expect(result.errors['questions.q1.text']).toBeDefined()
      expect(result.errors['questions.q1.text'][0]).toMatch(/default language/)
    })

    test('question with empty-string default-language text produces an error', async () => {
      const survey = new Survey({
        ...baseSurvey(),
        elements: [{ _id: 'q1', sectionId: 'g1', text: { en: '' } }],
      })

      const result = await validator.validate(survey)

      expect(result.errors['questions.q1.text']).toBeDefined()
    })

    test('question with whitespace-only default-language text produces an error', async () => {
      const survey = new Survey({
        ...baseSurvey(),
        elements: [{ _id: 'q1', sectionId: 'g1', text: { en: '   ' } }],
      })

      const result = await validator.validate(survey)

      expect(result.errors['questions.q1.text']).toBeDefined()
    })

    test('question with valid default-language text produces no text error', async () => {
      const survey = new Survey({
        ...baseSurvey(),
        elements: [
          { _id: 'q1', sectionId: 'g1', text: { en: 'What is your name?' } },
        ],
      })

      const result = await validator.validate(survey)

      expect(result.errors['questions.q1.text']).toBeUndefined()
    })
  })

  describe('subquestion text', () => {
    test('subquestion with no default-language text produces an error', async () => {
      const survey = new Survey({
        ...baseSurvey(),
        elements: [
          {
            _id: 'q1',
            sectionId: 'g1',
            type: 'matrixComposite',
            text: { en: 'Main question' },
            subquestions: [{ _id: 'sq1', text: {} }],
          },
        ],
      })

      const result = await validator.validate(survey)

      expect(result.errors['questions.q1.subquestions.sq1.text']).toBeDefined()
      expect(result.errors['questions.q1.subquestions.sq1.text'][0]).toMatch(
        /default language/,
      )
    })

    test('subquestion with valid default-language text produces no subquestion error', async () => {
      const survey = new Survey({
        ...baseSurvey(),
        elements: [
          {
            _id: 'q1',
            sectionId: 'g1',
            type: 'matrixComposite',
            text: { en: 'Main question' },
            subquestions: [{ _id: 'sq1', text: { en: 'Row 1' } }],
          },
        ],
      })

      const result = await validator.validate(survey)

      expect(
        result.errors['questions.q1.subquestions.sq1.text'],
      ).toBeUndefined()
    })

    test('orphaned subquestions on a non-matrix type produce no error', async () => {
      const survey = new Survey({
        ...baseSurvey(),
        elements: [
          {
            _id: 'q1',
            sectionId: 'g1',
            type: 'text',
            text: { en: 'Main question' },
            subquestions: [{ _id: 'sq1', text: {} }],
          },
        ],
      })

      const result = await validator.validate(survey)

      expect(
        result.errors['questions.q1.subquestions.sq1.text'],
      ).toBeUndefined()
    })
  })

  describe('answer option label', () => {
    test('answer option with no default-language label produces an error', async () => {
      const survey = new Survey({
        ...baseSurvey(),
        elements: [
          {
            _id: 'q1',
            sectionId: 'g1',
            type: 'checkbox',
            text: { en: 'Choose one' },
            answerOptions: [{ _id: 'ao1', code: 'A', label: new L10n({}) }],
          },
        ],
      })

      const result = await validator.validate(survey)

      expect(
        result.errors['questions.q1.answerOptions.ao1.label'],
      ).toBeDefined()
      expect(result.errors['questions.q1.answerOptions.ao1.label'][0]).toMatch(
        /default language/,
      )
    })

    test('answer option with valid default-language label produces no label error', async () => {
      const survey = new Survey({
        ...baseSurvey(),
        elements: [
          {
            _id: 'q1',
            sectionId: 'g1',
            type: 'checkbox',
            text: { en: 'Choose one' },
            answerOptions: [
              { _id: 'ao1', code: 'A', label: new L10n({ en: 'Option A' }) },
            ],
          },
        ],
      })

      const result = await validator.validate(survey)

      expect(
        result.errors['questions.q1.answerOptions.ao1.label'],
      ).toBeUndefined()
    })

    test('orphaned answer options on a non-choice type produce no error', async () => {
      const survey = new Survey({
        ...baseSurvey(),
        elements: [
          {
            _id: 'q1',
            sectionId: 'g1',
            type: 'text',
            text: { en: 'Choose one' },
            answerOptions: [{ _id: 'ao1', code: 'A', label: new L10n({}) }],
          },
        ],
      })

      const result = await validator.validate(survey)

      expect(
        result.errors['questions.q1.answerOptions.ao1.label'],
      ).toBeUndefined()
    })

    test('orphaned answer options on a predefined-option type (yesNo) produce no error', async () => {
      const survey = new Survey({
        ...baseSurvey(),
        elements: [
          {
            _id: 'q1',
            sectionId: 'g1',
            type: 'yesNo',
            text: { en: 'Choose one' },
            answerOptions: [{ _id: 'ao1', code: 'A', label: new L10n({}) }],
          },
        ],
      })

      const result = await validator.validate(survey)

      expect(
        result.errors['questions.q1.answerOptions.ao1.label'],
      ).toBeUndefined()
    })
  })

  describe('code uniqueness validation', () => {
    test('duplicate question codes across the survey produce errors on both questions', async () => {
      const survey = new Survey({
        ...baseSurvey(),
        sections: [{ _id: 'g1', name: { en: 'Group 1' } }],
        elements: [
          { _id: 'q1', sectionId: 'g1', code: 'Q001', text: { en: 'Q1' } },
          { _id: 'q2', sectionId: 'g1', code: 'Q001', text: { en: 'Q2' } },
        ],
      })

      const result = await validator.validate(survey)

      expect(result.errors['questions.q1.code']).toBeDefined()
      expect(result.errors['questions.q2.code']).toBeDefined()
    })

    test('unique question codes produce no code errors', async () => {
      const survey = new Survey({
        ...baseSurvey(),
        elements: [
          { _id: 'q1', sectionId: 'g1', code: 'Q001', text: { en: 'Q1' } },
          { _id: 'q2', sectionId: 'g1', code: 'Q002', text: { en: 'Q2' } },
        ],
      })

      const result = await validator.validate(survey)

      expect(result.errors['questions.q1.code']).toBeUndefined()
      expect(result.errors['questions.q2.code']).toBeUndefined()
    })

    test('duplicate group codes across the survey produce errors on both groups', async () => {
      const survey = new Survey({
        ...baseSurvey(),
        sections: [
          { _id: 'g1', code: 'G001', name: { en: 'Group 1' } },
          { _id: 'g2', code: 'G001', name: { en: 'Group 2' } },
        ],
        elements: [],
      })

      const result = await validator.validate(survey)

      expect(result.errors['groups.g1.code']).toBeDefined()
      expect(result.errors['groups.g2.code']).toBeDefined()
    })

    test('duplicate subquestion codes within the same question produce errors', async () => {
      const survey = new Survey({
        ...baseSurvey(),
        elements: [
          {
            _id: 'q1',
            sectionId: 'g1',
            type: 'matrixComposite',
            text: { en: 'Main question' },
            subquestions: [
              { _id: 'sq1', code: 'S001', text: { en: 'Row 1' } },
              { _id: 'sq2', code: 'S001', text: { en: 'Row 2' } },
            ],
          },
        ],
      })

      const result = await validator.validate(survey)

      expect(result.errors['questions.q1.subquestions.sq1.code']).toBeDefined()
      expect(result.errors['questions.q1.subquestions.sq2.code']).toBeDefined()
    })

    test('duplicate subquestion codes across different questions do not produce errors', async () => {
      const survey = new Survey({
        ...baseSurvey(),
        elements: [
          {
            _id: 'q1',
            sectionId: 'g1',
            code: 'Q001',
            type: 'matrixComposite',
            text: { en: 'Question 1' },
            subquestions: [{ _id: 'sq1', code: 'S001', text: { en: 'Row 1' } }],
          },
          {
            _id: 'q2',
            sectionId: 'g1',
            code: 'Q002',
            type: 'matrixComposite',
            text: { en: 'Question 2' },
            subquestions: [{ _id: 'sq2', code: 'S001', text: { en: 'Row 1' } }],
          },
        ],
      })

      const result = await validator.validate(survey)

      expect(
        result.errors['questions.q1.subquestions.sq1.code'],
      ).toBeUndefined()
      expect(
        result.errors['questions.q2.subquestions.sq2.code'],
      ).toBeUndefined()
    })

    test('duplicate answer option codes within the same question produce errors', async () => {
      const survey = new Survey({
        ...baseSurvey(),
        elements: [
          {
            _id: 'q1',
            sectionId: 'g1',
            type: 'checkbox',
            text: { en: 'Choose one' },
            answerOptions: [
              { _id: 'ao1', code: 'A001', label: new L10n({ en: 'Option A' }) },
              { _id: 'ao2', code: 'A001', label: new L10n({ en: 'Option B' }) },
            ],
          },
        ],
      })

      const result = await validator.validate(survey)

      expect(result.errors['questions.q1.answerOptions.ao1.code']).toBeDefined()
      expect(result.errors['questions.q1.answerOptions.ao2.code']).toBeDefined()
    })
  })

  describe('fully populated survey', () => {
    test('survey with all L10n fields populated produces no L10n errors', async () => {
      const survey = new Survey({
        _id: 's1',
        language: { default: 'en' },
        sections: [{ _id: 'g1', name: { en: 'Group 1' } }],
        elements: [
          {
            _id: 'q1',
            sectionId: 'g1',
            type: 'matrixComposite',
            text: { en: 'Main question' },
            subquestions: [{ _id: 'sq1', text: { en: 'Row 1' } }],
            answerOptions: [
              { _id: 'ao1', code: 'A', label: new L10n({ en: 'Option A' }) },
            ],
          },
        ],
      })

      const result = await validator.validate(survey)

      expect(result.errors['questions.q1.text']).toBeUndefined()
      expect(
        result.errors['questions.q1.subquestions.sq1.text'],
      ).toBeUndefined()
      expect(
        result.errors['questions.q1.answerOptions.ao1.label'],
      ).toBeUndefined()
    })
  })

  describe('content format validation', () => {
    test('markdown-mode with embedded <script> never passes through raw (already neutralised by html:false at render time, so no validation error is needed)', async () => {
      const survey = new Survey({
        ...baseSurvey(),
        // markdownAllowed defaults to true
        elements: [
          {
            _id: 'q1',
            sectionId: 'g1',
            text: { en: 'Question <script>alert(1)</script>' },
          },
        ],
      })

      const result = await validator.validate(survey)

      expect(result.errors['questions.q1.text.en']).toBeUndefined()
    })

    test('html-mode with <script> and scriptTagsAllowed: false is rejected', async () => {
      const survey = new Survey({
        ...baseSurvey(),
        contentFormat: { htmlAllowed: true, markdownAllowed: false },
        elements: [
          {
            _id: 'q1',
            sectionId: 'g1',
            text: { en: 'Question <script>alert(1)</script>' },
          },
        ],
      })

      const result = await validator.validate(survey)

      expect(result.errors['questions.q1.text.en']).toBeDefined()
    })

    test('html-mode with <script> and scriptTagsAllowed: true is accepted', async () => {
      const survey = new Survey({
        ...baseSurvey(),
        contentFormat: {
          htmlAllowed: true,
          markdownAllowed: false,
          scriptTagsAllowed: true,
        },
        elements: [
          {
            _id: 'q1',
            sectionId: 'g1',
            text: { en: 'Question <script>alert(1)</script>' },
          },
        ],
      })

      const result = await validator.validate(survey)

      expect(result.errors['questions.q1.text.en']).toBeUndefined()
    })

    test('plain-mode with any HTML tags is rejected', async () => {
      const survey = new Survey({
        ...baseSurvey(),
        contentFormat: { htmlAllowed: false, markdownAllowed: false },
        elements: [
          {
            _id: 'q1',
            sectionId: 'g1',
            text: { en: 'Question <b>bold</b>' },
          },
        ],
      })

      const result = await validator.validate(survey)

      expect(result.errors['questions.q1.text.en']).toBeDefined()
    })

    test('markdown-mode with legitimate **bold**/links is accepted', async () => {
      const survey = new Survey({
        ...baseSurvey(),
        elements: [
          {
            _id: 'q1',
            sectionId: 'g1',
            text: { en: '**bold** and [a link](https://example.com)' },
          },
        ],
      })

      const result = await validator.validate(survey)

      expect(result.errors['questions.q1.text.en']).toBeUndefined()
    })

    test('survey-level null inherits the project default (override to html)', async () => {
      const settingSurvey = new SettingSurvey({
        _id: 'ss1',
      }).updateContentFormat({
        htmlAllowed: true,
        markdownAllowed: false,
      })
      const survey = new Survey({
        ...baseSurvey(),
        elements: [
          {
            _id: 'q1',
            sectionId: 'g1',
            // Not valid raw HTML by the sanitizer (unclosed tag stripped)
            text: { en: 'Question <script>alert(1)</script>' },
          },
        ],
      })

      const result = await validator.validate(survey, settingSurvey)

      expect(result.errors['questions.q1.text.en']).toBeDefined()
    })

    test('survey-level null inherits the project default (project allows markdown)', async () => {
      const settingSurvey = new SettingSurvey({ _id: 'ss1' })
      const survey = new Survey({
        ...baseSurvey(),
        elements: [
          {
            _id: 'q1',
            sectionId: 'g1',
            text: { en: '**bold**' },
          },
        ],
      })

      const result = await validator.validate(survey, settingSurvey)

      expect(result.errors['questions.q1.text.en']).toBeUndefined()
    })

    test('survey-level override wins over project default', async () => {
      const settingSurvey = new SettingSurvey({ _id: 'ss1' }) // markdownAllowed: true
      const survey = new Survey({
        ...baseSurvey(),
        contentFormat: { htmlAllowed: false, markdownAllowed: false }, // survey forces plain
        elements: [
          {
            _id: 'q1',
            sectionId: 'g1',
            text: { en: 'Question <b>bold</b>' },
          },
        ],
      })

      const result = await validator.validate(survey, settingSurvey)

      expect(result.errors['questions.q1.text.en']).toBeDefined()
    })
  })

  describe('embedded text-expression validation', () => {
    const surveyWith = (overrides: Record<string, unknown>) =>
      new Survey({
        _id: 's1',
        language: { default: 'en' },
        sections: [{ _id: 'g1', code: 'G001', name: { en: 'Group 1' } }],
        elements: [
          { _id: 'q1', sectionId: 'g1', code: 'Q001', text: { en: 'First?' } },
          { _id: 'q2', sectionId: 'g1', code: 'Q002', text: { en: 'Second?' } },
        ],
        ...overrides,
      })

    test('an unknown question code in question detail blocks publishing', async () => {
      const survey = surveyWith({
        elements: [
          {
            _id: 'q1',
            sectionId: 'g1',
            code: 'Q001',
            text: { en: 'First?' },
            detail: { en: 'You said {{answers.Q999}}' },
          },
        ],
      })

      const result = await validator.validate(survey)

      expect(result.isValid).toBe(false)
      expect(result.errors['questions.q1.detail']).toBeDefined()
      expect(result.errors['questions.q1.detail'][0]).toMatch(
        /Unknown question code/,
      )
    })

    test('a nonsense labels.* path in the welcome message blocks publishing', async () => {
      const survey = surveyWith({
        sections: [
          { _id: 'g1', code: 'G001', name: { en: 'Group 1' } },
          {
            _id: 'WELCOME',
            code: 'WELCOME',
            kind: 'welcome',
            desc: { en: 'Hi {{labels.Q001.desc.detail.desc.A001.detail}}' },
          },
        ],
      })

      const result = await validator.validate(survey)

      expect(result.errors['welcome.message']).toBeDefined()
    })

    test('a forward reference in a question text expression blocks publishing', async () => {
      const survey = surveyWith({
        elements: [
          {
            _id: 'q1',
            sectionId: 'g1',
            code: 'Q001',
            text: { en: 'Earlier you chose {{answerLabels.Q002}}' },
          },
          { _id: 'q2', sectionId: 'g1', code: 'Q002', text: { en: 'Second?' } },
        ],
      })

      const result = await validator.validate(survey)

      expect(result.errors['questions.q1.text']).toBeDefined()
      expect(result.errors['questions.q1.text'][0]).toMatch(/Forward reference/)
    })

    test('valid expressions do not produce a text-expression error', async () => {
      const survey = surveyWith({
        elements: [
          { _id: 'q1', sectionId: 'g1', code: 'Q001', text: { en: 'First?' } },
          {
            _id: 'q2',
            sectionId: 'g1',
            code: 'Q002',
            text: { en: 'You picked {{answerLabels.Q001}}' },
            detail: { en: 'Hello {{participant.nameFirst}}' },
          },
        ],
      })

      const result = await validator.validate(survey)

      expect(result.errors['questions.q2.text']).toBeUndefined()
      expect(result.errors['questions.q2.detail']).toBeUndefined()
    })
  })

  describe('welcome / thank-you section count', () => {
    test('two welcome sections produce a sections.welcome error', async () => {
      const survey = new Survey({
        ...baseSurvey(),
        elements: [
          { _id: 'q1', sectionId: 'g1', code: 'Q001', text: { en: 'Q' } },
        ],
        sections: [
          { _id: 'w1', kind: 'welcome', code: 'WELCOME', name: {} },
          { _id: 'w2', kind: 'welcome', code: 'WELCOME2', name: {} },
          { _id: 'g1', code: 'G001', name: { en: 'Group 1' } },
        ],
      })

      const result = await validator.validate(survey)
      expect(result.errors['sections.welcome']).toBeDefined()
    })

    test('one welcome section is fine', async () => {
      const survey = new Survey({
        ...baseSurvey(),
        elements: [
          { _id: 'q1', sectionId: 'g1', code: 'Q001', text: { en: 'Q' } },
        ],
        sections: [
          { _id: 'w1', kind: 'welcome', code: 'WELCOME', name: {} },
          { _id: 'g1', code: 'G001', name: { en: 'Group 1' } },
        ],
      })

      const result = await validator.validate(survey)
      expect(result.errors['sections.welcome']).toBeUndefined()
    })
  })
})
