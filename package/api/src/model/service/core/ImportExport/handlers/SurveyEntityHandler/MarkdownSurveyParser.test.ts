// cspell:ignore Kundenzufriedenheitsumfrage Allgemein Würden einem Freund empfehlen
import { Survey, L10n, ENTITY_CODE_PATTERN } from 'veysur-common'

import { exportSurveyToMarkdown } from './MarkdownSurveyExporter'
import { parseMarkdownSurvey } from './MarkdownSurveyParser'

describe('parseMarkdownSurvey — round-trip against the exporter', () => {
  test('Example B (attributes + checkbox/dropdown options) round-trips', () => {
    const survey = new Survey({
      title: { en: 'Product Feedback' },
      language: { default: 'en', options: ['en'] },
      sectionIds: ['section-1'],
      elementIds: ['q1', 'q2', 'q3'],
      sections: [{ _id: 'section-1', kind: 'group', name: { en: 'Usage' } }],
      elements: [
        {
          _id: 'q1',
          kind: 'question',
          code: 'Q001',
          type: 'number',
          sectionId: 'section-1',
          text: { en: 'How many years have you used the product?' },
          attributes: { numberMinMax: { min: 0, max: 50 } },
        },
        {
          _id: 'q2',
          kind: 'question',
          code: 'Q002',
          type: 'checkbox',
          sectionId: 'section-1',
          text: { en: 'Which features do you use regularly?' },
          attributes: {
            choiceMinMax: { min: 1, max: 0 },
            choiceOther: true,
            choiceRandomise: true,
          },
          answerOptions: [
            { code: 'A001', label: new L10n({ en: 'Reporting' }) },
            { code: 'A002', label: new L10n({ en: 'Dashboards' }) },
          ],
        },
      ],
    })

    const markdown = exportSurveyToMarkdown(survey)
    const bundle = parseMarkdownSurvey(markdown)

    expect(bundle.sourceFormat).toBe('markdown')
    expect(bundle.survey.title).toEqual({ en: 'Product Feedback' })
    expect(bundle.survey.language).toEqual({ default: 'en', options: ['en'] })
    expect(bundle.sections).toHaveLength(1)
    expect(bundle.sections[0].name).toEqual({ en: 'Usage' })
    expect(bundle.elements).toHaveLength(2)

    const q1 = bundle.elements.find((e) => e.code === 'Q001')
    expect(q1?.type).toBe('number')
    expect(q1?.text).toEqual({
      en: 'How many years have you used the product?',
    })
    expect(q1?.attributes).toEqual({ numberMinMax: { min: 0, max: 50 } })

    const q2 = bundle.elements.find((e) => e.code === 'Q002')
    expect(q2?.attributes).toEqual({
      choiceMinMax: { min: 1, max: 0 },
      choiceOther: true,
      choiceRandomise: true,
    })
    expect(q2?.answerOptions).toEqual([
      expect.objectContaining({ code: 'A001', label: { en: 'Reporting' } }),
      expect.objectContaining({ code: 'A002', label: { en: 'Dashboards' } }),
    ])
  })

  test('Example C (multi-language) round-trips', () => {
    const survey = new Survey({
      title: {
        en: 'Customer Satisfaction Survey',
        de: 'Kundenzufriedenheitsumfrage',
      },
      language: { default: 'en', options: ['en', 'de'] },
      sectionIds: ['section-1'],
      elementIds: ['q1'],
      sections: [
        {
          _id: 'section-1',
          kind: 'group',
          name: { en: 'General', de: 'Allgemein' },
        },
      ],
      elements: [
        {
          _id: 'q1',
          kind: 'question',
          code: 'Q001',
          type: 'yesNo',
          sectionId: 'section-1',
          text: {
            en: 'Would you recommend us to a friend?',
            de: 'Würden Sie uns einem Freund empfehlen?',
          },
        },
      ],
    })

    const bundle = parseMarkdownSurvey(exportSurveyToMarkdown(survey))
    expect(bundle.survey.title).toEqual({
      en: 'Customer Satisfaction Survey',
      de: 'Kundenzufriedenheitsumfrage',
    })
    expect(bundle.sections[0].name).toEqual({ en: 'General', de: 'Allgemein' })
    expect(bundle.elements[0].text).toEqual({
      en: 'Would you recommend us to a friend?',
      de: 'Würden Sie uns einem Freund empfehlen?',
    })
  })

  test('Example D (empty question text) round-trips', () => {
    const survey = new Survey({
      title: { en: 'Untitled Survey' },
      language: { default: 'en', options: ['en'] },
      sectionIds: ['section-1'],
      elementIds: ['q1'],
      sections: [{ _id: 'section-1', kind: 'group', name: { en: 'G001' } }],
      elements: [
        {
          _id: 'q1',
          kind: 'question',
          code: 'Q001',
          type: 'text',
          sectionId: 'section-1',
          text: { en: '' },
        },
      ],
    })

    const bundle = parseMarkdownSurvey(exportSurveyToMarkdown(survey))
    expect(bundle.elements[0].text).toEqual({ en: '' })
  })

  test('Example E (interleaved content) round-trips', () => {
    const survey = new Survey({
      title: { en: 'Customer Satisfaction Survey' },
      language: { default: 'en', options: ['en'] },
      sectionIds: ['section-1'],
      elementIds: ['c1', 'q1', 'q2'],
      sections: [{ _id: 'section-1', kind: 'group', name: { en: 'General' } }],
      elements: [
        {
          _id: 'c1',
          kind: 'content',
          code: 'C001',
          type: 'contentText',
          sectionId: 'section-1',
          text: {
            en: 'Thank you for taking the time to complete this survey. It should take about two\nminutes.',
          },
        },
        {
          _id: 'q1',
          kind: 'question',
          code: 'Q001',
          type: 'yesNo',
          sectionId: 'section-1',
          text: { en: 'Would you recommend us to a friend?' },
        },
        {
          _id: 'q2',
          kind: 'question',
          code: 'Q002',
          type: 'starRating',
          sectionId: 'section-1',
          text: { en: 'How would you rate your overall experience?' },
        },
      ],
    })

    const bundle = parseMarkdownSurvey(exportSurveyToMarkdown(survey))
    expect(bundle.elements.map((e) => e.code)).toEqual(['C001', 'Q001', 'Q002'])
    const c1 = bundle.elements.find((e) => e.code === 'C001')
    expect(c1?.kind).toBe('content')
    expect(c1?.text).toEqual({
      en: 'Thank you for taking the time to complete this survey. It should take about two\nminutes.',
    })
  })

  test('Example F (contentVideoYoutube) round-trips videoId/startAt via parseYoutubeUrl', () => {
    const survey = new Survey({
      title: { en: 'Product Feedback' },
      language: { default: 'en', options: ['en'] },
      sectionIds: ['section-1'],
      elementIds: ['c1'],
      sections: [{ _id: 'section-1', kind: 'group', name: { en: 'Usage' } }],
      elements: [
        {
          _id: 'c1',
          kind: 'content',
          code: 'C002',
          type: 'contentVideoYoutube',
          sectionId: 'section-1',
          text: { en: 'A quick walkthrough of how to complete this survey.' },
          config: {
            youtube: {
              url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90s',
              videoId: 'dQw4w9WgXcQ',
              startAt: 90,
            },
          },
        },
      ],
    })

    const bundle = parseMarkdownSurvey(exportSurveyToMarkdown(survey))
    const c1 = bundle.elements[0]
    expect(c1.config).toEqual({
      youtube: {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90s',
        videoId: 'dQw4w9WgXcQ',
        startAt: 90,
      },
    })
    expect(c1.text).toEqual({
      en: 'A quick walkthrough of how to complete this survey.',
    })
  })
})

describe('parseMarkdownSurvey — literal spec fixtures', () => {
  test('Example A parses into the expected structure', () => {
    const markdown = `---
spec: v1
language:
  default: en
  options: [en]
---

# Customer Satisfaction Survey

## General

### Q001 · yesNo
Would you recommend us to a friend?

### Q002 · starRating
How would you rate your overall experience?

### Q003 · text
Any other comments?

*Optional: leave blank if you have nothing to add.*

- required: false
`
    const bundle = parseMarkdownSurvey(markdown)
    expect(bundle.survey.title).toEqual({ en: 'Customer Satisfaction Survey' })
    expect(bundle.survey.name).toBe('Customer Satisfaction Survey')
    expect(bundle.elements).toHaveLength(3)
    const q3 = bundle.elements.find((e) => e.code === 'Q003')
    expect(q3?.detail).toEqual({
      en: 'Optional: leave blank if you have nothing to add.',
    })
    expect(q3?.attributes).toEqual({ required: false })
  })

  test("Example E's literal --- dividers are insignificant whitespace (§4)", () => {
    const markdown = `---
spec: v1
language:
  default: en
  options: [en]
---

# Customer Satisfaction Survey

## General

### C001 · contentText
Thank you for taking the time to complete this survey. It should take about two
minutes.

---

### Q001 · yesNo
Would you recommend us to a friend?

---

### Q002 · starRating
How would you rate your overall experience?
`
    const bundle = parseMarkdownSurvey(markdown)
    expect(bundle.elements.map((e) => e.code)).toEqual(['C001', 'Q001', 'Q002'])
  })

  test('reordered attribute bullets normalize (order is not semantic)', () => {
    const markdown = `---
spec: v1
language:
  default: en
  options: [en]
---

# Survey

## Group

### Q001 · checkbox
Pick some

- choiceOther: true
- choiceMinMax: { min: 1, max: 0 }

Options:
- [ ] A001 · One
`
    const bundle = parseMarkdownSurvey(markdown)
    expect(bundle.elements[0].attributes).toEqual({
      choiceOther: true,
      choiceMinMax: { min: 1, max: 0 },
    })
  })

  test('missing --- divider between questions normalizes fine', () => {
    const markdown = `---
spec: v1
language:
  default: en
  options: [en]
---

# Survey

## Group

### Q001 · yesNo
A?
### Q002 · yesNo
B?
`
    const bundle = parseMarkdownSurvey(markdown)
    expect(bundle.elements.map((e) => e.code)).toEqual(['Q001', 'Q002'])
  })
})

describe('parseMarkdownSurvey — survey.name derivation (§2.1)', () => {
  // Regression test: `name` (a plain, admin-only label, distinct from the
  // localized `title`) has no grammar slot in v1 and was previously left
  // unset entirely, leaving every imported survey's admin-list "Name" column
  // and delete-confirmation dialog blank.
  test('derives name from the default-language title', () => {
    const markdown = `---
spec: v1
language:
  default: en
  options: [en]
---

# Customer Satisfaction Survey

## General

### Q001 · yesNo
Would you recommend us to a friend?
`
    const bundle = parseMarkdownSurvey(markdown)
    expect(bundle.survey.name).toBe('Customer Satisfaction Survey')
  })

  test("falls back to 'Untitled Survey' when the title itself is empty (§3.5 Example D)", () => {
    const markdown =
      `---
spec: v1
language:
  default: en
  options: [en]
---

# ` +
      `
## G001

### Q001 · text
`
    const bundle = parseMarkdownSurvey(markdown)
    expect(bundle.survey.title).toEqual({ en: '' })
    expect(bundle.survey.name).toBe('Untitled Survey')
  })
})

describe('parseMarkdownSurvey — section code generation (§2.2/§4)', () => {
  // Regression test for a production 500: the markdown grammar has no code
  // slot for a group heading ('## <Group Name>' carries no code), so a
  // section's code must always be auto-generated on import. A generated
  // code of '' (the SurveySection constructor's fallback for a missing
  // code) doesn't match SchemaSurveySection's ENTITY_CODE_PATTERN regex,
  // which throws an unhandled 500 at insertOne time (a mocked repo in the
  // round-trip test doesn't run real schema validation, so this asserts
  // against the actual regex the schema enforces instead).

  test('every section gets a code matching ENTITY_CODE_PATTERN', () => {
    const markdown = `---
spec: v1
language:
  default: en
  options: [en]
---

# Survey

> Welcome!

## First Group

### Q001 · yesNo
A?

## Second Group

### Q002 · yesNo
B?

## Thank you

Thanks for participating.
`
    const bundle = parseMarkdownSurvey(markdown)
    expect(bundle.sections).toHaveLength(4)

    for (const section of bundle.sections) {
      expect(section.code).toBeTruthy()
      expect(section.code).toMatch(ENTITY_CODE_PATTERN)
    }
  })

  test('welcome/thankYou sections get the fixed singleton codes; groups get sequential G-codes', () => {
    const markdown = `---
spec: v1
language:
  default: en
  options: [en]
---

# Survey

> Welcome!

## First Group

### Q001 · yesNo
A?

## Second Group

### Q002 · yesNo
B?

## Thank you

Thanks for participating.
`
    const bundle = parseMarkdownSurvey(markdown)
    const byKind = (kind: string) =>
      bundle.sections.find((s) => s.kind === kind)

    expect(byKind('welcome')?.code).toBe('WELCOME')
    expect(byKind('thankYou')?.code).toBe('THANKYOU')
    expect(
      bundle.sections.filter((s) => s.kind === 'group').map((s) => s.code),
    ).toEqual(['G001', 'G002'])
  })
})

describe('parseMarkdownSurvey — §4 reject table', () => {
  const wrap = (body: string) => `---
spec: v1
language:
  default: en
  options: [en]
---

# Survey

## Group

${body}`

  test('rejects an attribute bullet not applicable to the question type', () => {
    const markdown = wrap(
      `### Q001 · checkbox\nPick\n\n- inputSize: medium\n\nOptions:\n- [ ] A001 · One\n`,
    )
    expect(() => parseMarkdownSurvey(markdown)).toThrow(/not applicable/)
  })

  test('expands a Labels block into P1..Pn answer options', () => {
    const bundle = parseMarkdownSurvey(
      wrap(`### Q001 · point5\nRate\n\nLabels:\n- 1 · Low\n- 5 · High\n`),
    )
    const question = bundle.elements[0] as unknown as {
      answerOptions: Array<{ code: string; label: Record<string, string> }>
    }
    expect(question.answerOptions.map((o) => o.code)).toEqual([
      'P1',
      'P2',
      'P3',
      'P4',
      'P5',
    ])
    expect(question.answerOptions[0].label).toEqual({ en: 'Low' })
    expect(question.answerOptions[2].label).toEqual({})
    expect(question.answerOptions[4].label).toEqual({ en: 'High' })
  })

  test('rejects a Labels point outside the scale', () => {
    const markdown = wrap(`### Q001 · point5\nRate\n\nLabels:\n- 6 · High\n`)
    expect(() => parseMarkdownSurvey(markdown)).toThrow(/outside 1-5/)
  })

  test('rejects an unrecognised question type', () => {
    const markdown = wrap(`### Q001 · matrixText\nSomething\n`)
    expect(() => parseMarkdownSurvey(markdown)).toThrow(/Unsupported type/)
  })

  test('rejects an unrecognised content type', () => {
    const markdown = wrap(`### C001 · contentImage\nSomething\n`)
    expect(() => parseMarkdownSurvey(markdown)).toThrow(/Unsupported type/)
  })

  test('rejects an attribute bullet list under a content block', () => {
    const markdown = wrap(
      `### C001 · contentText\nBody text\n\n- required: true\n`,
    )
    expect(() => parseMarkdownSurvey(markdown)).toThrow(/has no attributes/)
  })

  test('rejects a contentVideoYoutube block with no URL line', () => {
    const markdown = wrap(
      `### C002 · contentVideoYoutube\nCaption only, no URL\n`,
    )
    expect(() => parseMarkdownSurvey(markdown)).toThrow(/missing its required/)
  })

  test('rejects a condition: line under a question', () => {
    const markdown = wrap(
      `### Q001 · yesNo\nA?\n\n- condition: \${Q000} == 1\n`,
    )
    expect(() => parseMarkdownSurvey(markdown)).toThrow(/not supported in v1/)
  })

  test('rejects a missing spec: key', () => {
    const markdown = `---
language:
  default: en
  options: [en]
---

# Survey
`
    expect(() => parseMarkdownSurvey(markdown)).toThrow(/spec/)
  })

  test('rejects a non-v1 spec: value', () => {
    const markdown = `---
spec: v2
language:
  default: en
  options: [en]
---

# Survey
`
    expect(() => parseMarkdownSurvey(markdown)).toThrow(
      /Unsupported spec version/,
    )
  })

  test('passes a {{expression}} token through verbatim', () => {
    const markdown = wrap(`### Q001 · yesNo\nDo you like {{answers.Q000}}?\n`)
    const bundle = parseMarkdownSurvey(markdown)
    expect(bundle.elements[0].text).toEqual({
      en: 'Do you like {{answers.Q000}}?',
    })
  })
})
