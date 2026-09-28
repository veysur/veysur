// cspell:ignore Kundenzufriedenheitsumfrage Allgemein Würden einem Freund empfehlen
import { Survey, L10n } from 'veysur-common'

import { exportSurveyToMarkdown } from './MarkdownSurveyExporter'

/**
 * Golden-file tests against the worked examples in
 * survey-markdown-format.md §3.5. Two deliberate deviations from the
 * examples' literal byte content, both documented at their call sites
 * below:
 *
 * 1. `---` dividers between question/content blocks: examples A-D never
 *    emit one, example E does. The exporter picks the majority/simpler
 *    canonical form (never emit `---`) since §4 requires exactly one
 *    canonical serialization and the importer treats `---` as
 *    insignificant whitespace regardless (§3.4) — so example E's fixture
 *    below has its `---` lines stripped.
 * 2. Example B's `numberNegAllowed: false` bullet: `false` is
 *    `numberNegAllowedMeta.initialValue` (confirmed in
 *    `MarkdownSurveyExporter/attributeDefaults.test.ts`), so per §3.4's
 *    "only non-default attributes are emitted" rule this bullet must be
 *    suppressed — the example's literal text is inconsistent with the
 *    spec's own stated rule here, so the rule wins.
 */
describe('exportSurveyToMarkdown', () => {
  test('Example A: simple satisfaction survey (single language, no optional fields)', () => {
    const survey = new Survey({
      title: { en: 'Customer Satisfaction Survey' },
      language: { default: 'en', options: ['en'] },
      sectionIds: ['section-1'],
      elementIds: ['q1', 'q2', 'q3'],
      sections: [{ _id: 'section-1', kind: 'group', name: { en: 'General' } }],
      elements: [
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
        {
          _id: 'q3',
          kind: 'question',
          code: 'Q003',
          type: 'text',
          sectionId: 'section-1',
          text: { en: 'Any other comments?' },
          detail: {
            en: 'Optional: leave blank if you have nothing to add.',
          },
          attributes: { required: false },
        },
      ],
    })

    expect(exportSurveyToMarkdown(survey)).toBe(
      `---
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
`,
    )
  })

  test('Example B: mixed question types with non-default attributes', () => {
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
          attributes: {
            numberMinMax: { min: 0, max: 50 },
            numberNegAllowed: false,
          },
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
            { code: 'A003', label: new L10n({ en: 'API access' }) },
          ],
        },
        {
          _id: 'q3',
          kind: 'question',
          code: 'Q003',
          type: 'dropdown',
          sectionId: 'section-1',
          text: { en: 'Which plan are you on?' },
          attributes: { choiceMinMax: { min: 1, max: 1 } },
          answerOptions: [
            { code: 'A001', label: new L10n({ en: 'Free' }) },
            { code: 'A002', label: new L10n({ en: 'Pro' }) },
            { code: 'A003', label: new L10n({ en: 'Enterprise' }) },
          ],
        },
      ],
    })

    expect(exportSurveyToMarkdown(survey)).toBe(
      `---
spec: v1
language:
  default: en
  options: [en]
---

# Product Feedback

## Usage

### Q001 · number
How many years have you used the product?

- numberMinMax: { min: 0, max: 50 }

### Q002 · checkbox
Which features do you use regularly?

- choiceMinMax: { min: 1, max: 0 }
- choiceOther: true
- choiceRandomise: true

Options:
- [ ] A001 · Reporting
- [ ] A002 · Dashboards
- [ ] A003 · API access

### Q003 · dropdown
Which plan are you on?

- choiceMinMax: { min: 1, max: 1 }

Options:
- [ ] A001 · Free
- [ ] A002 · Pro
- [ ] A003 · Enterprise
`,
    )
  })

  test('Example C: multi-language content', () => {
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

    expect(exportSurveyToMarkdown(survey)).toBe(
      `---
spec: v1
language:
  default: en
  options: [en, de]
---

# Customer Satisfaction Survey
::lang[de]
# Kundenzufriedenheitsumfrage
::end

## General
::lang[de]
## Allgemein
::end

### Q001 · yesNo
Would you recommend us to a friend?
::lang[de]
### Q001 · yesNo
Würden Sie uns einem Freund empfehlen?
::end
`,
    )
  })

  test('Example D, edge case: empty/optional fields', () => {
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

    expect(exportSurveyToMarkdown(survey)).toBe(
      `---
spec: v1
language:
  default: en
  options: [en]
---

# Untitled Survey

## G001

### Q001 · text
`,
    )
  })

  test('Example E: a content block interleaved between two questions', () => {
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

    expect(exportSurveyToMarkdown(survey)).toBe(
      `---
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

### Q001 · yesNo
Would you recommend us to a friend?

### Q002 · starRating
How would you rate your overall experience?
`,
    )
  })

  test('Example F: a contentVideoYoutube block', () => {
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

    expect(exportSurveyToMarkdown(survey)).toBe(
      `---
spec: v1
language:
  default: en
  options: [en]
---

# Product Feedback

## Usage

### C002 · contentVideoYoutube
<https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90s>

A quick walkthrough of how to complete this survey.
`,
    )
  })

  test('§7 item 4: a field populated for the default language only emits no ::lang block', () => {
    const survey = new Survey({
      title: { en: 'Survey' },
      language: { default: 'en', options: ['en', 'de'] },
      sectionIds: ['section-1'],
      elementIds: ['q1'],
      sections: [{ _id: 'section-1', kind: 'group', name: { en: 'Group' } }],
      elements: [
        {
          _id: 'q1',
          kind: 'question',
          code: 'Q001',
          type: 'checkbox',
          sectionId: 'section-1',
          text: { en: 'Pick one' },
          answerOptions: [
            { code: 'A001', label: new L10n({ en: 'Only English' }) },
          ],
        },
      ],
    })

    const markdown = exportSurveyToMarkdown(survey)
    expect(markdown).not.toContain('::lang[de]')
    expect(markdown).toContain('- [ ] A001 · Only English')
  })

  test('§3.6 last paragraph: an explicit empty string for a non-default language still emits an empty ::lang block', () => {
    const survey = new Survey({
      title: { en: 'Survey' },
      language: { default: 'en', options: ['en', 'de'] },
      sectionIds: ['section-1'],
      elementIds: ['q1'],
      sections: [{ _id: 'section-1', kind: 'group', name: { en: 'Group' } }],
      elements: [
        {
          _id: 'q1',
          kind: 'question',
          code: 'Q001',
          type: 'yesNo',
          sectionId: 'section-1',
          text: { en: 'Recommend us?', de: '' },
        },
      ],
    })

    expect(exportSurveyToMarkdown(survey)).toContain(
      '### Q001 · yesNo\nRecommend us?\n::lang[de]\n### Q001 · yesNo\n\n::end\n',
    )
  })
})
