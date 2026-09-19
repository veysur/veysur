import {
  resolveTextExpressions,
  validateTextExpressions,
} from './resolveTextExpressions'
import { ExpressionContext } from './types'
import { ExpressionContextBuilder } from './ExpressionContext'
import { GroupInfo, QuestionInfo } from '../SurveyCondition/types'
import { renderMarkdownToHtml } from '../../content/renderMarkdown'
import {
  QUESTION_TYPE_CHECKBOX,
  QUESTION_TYPE_TEXT,
  QUESTION_TYPE_MATRIX_CHECKBOX,
  QUESTION_TYPE_MATRIX_NUMBER,
} from '../../constructor/Survey/attributeMeta/types'

describe('resolveTextExpressions', () => {
  const context: ExpressionContext = {
    participant: { nameFirst: 'John' },
    answers: { Q001: 5 },
    response: {},
    answerOptionCodes: [],
  }

  it('resolves a JS expression token', () => {
    expect(resolveTextExpressions('Total: {{answers.Q001 + 1}}', context)).toBe(
      'Total: 6',
    )
  })

  it('resolves a plain dotted-path token (superset of the old piping syntax)', () => {
    expect(
      resolveTextExpressions('Hi {{participant.nameFirst}}', context),
    ).toBe('Hi John')
  })

  it('leaves an unresolved (undefined/null) token as literal text', () => {
    expect(resolveTextExpressions('{{answers.Q999}}', context)).toBe(
      '{{answers.Q999}}',
    )
  })

  it('leaves a runtime-error token as literal text (fails open)', () => {
    expect(resolveTextExpressions('{{UNDEFINED_VAR.x}}', context)).toBe(
      '{{UNDEFINED_VAR.x}}',
    )
  })

  it('leaves an unsafe token as literal text (fails open)', () => {
    expect(resolveTextExpressions('{{window.location}}', context)).toBe(
      '{{window.location}}',
    )
  })

  it('HTML-escapes the resolved value by default', () => {
    const xssContext: ExpressionContext = {
      ...context,
      answers: { Q001: '<script>alert(1)</script>' },
    }
    expect(resolveTextExpressions('{{answers.Q001}}', xssContext)).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    )
  })

  it('neutralises Markdown metacharacters when escape option is markdown', () => {
    const payload =
      '![x](https://evil.example/beacon) [a](https://evil.example) `c` https://evil.example'
    const mdContext: ExpressionContext = {
      ...context,
      answers: { Q001: payload },
    }
    const resolved = resolveTextExpressions('{{answers.Q001}}', mdContext, {
      escape: 'markdown',
    })
    const rendered = renderMarkdownToHtml(resolved)
    expect(rendered).not.toContain('<a ')
    expect(rendered).not.toContain('<img')
    expect(rendered).not.toContain('<code>')
  })

  it('does not double-encode an apostrophe/ampersand in a markdown-rendered value', () => {
    const mdContext: ExpressionContext = {
      ...context,
      answers: { Q001: "We're #1 & proud" },
    }
    const resolved = resolveTextExpressions('{{answers.Q001}}', mdContext, {
      escape: 'markdown',
    })
    const rendered = renderMarkdownToHtml(resolved)
    // markdown-it HTML-escapes text output, so the entity is single-encoded
    // and the browser renders it as the literal character - not `&#39;`/`&amp;`.
    expect(rendered).toContain('&amp;')
    expect(rendered).not.toContain('&amp;#39;')
    expect(rendered).not.toContain('&amp;amp;')
    expect(rendered).toContain("We're")
    // heading marker inside the value stays literal
    expect(rendered).not.toContain('<h1')
  })

  it('escape markdown still leaves surrounding literal template Markdown intact', () => {
    expect(
      resolveTextExpressions('# Heading {{answers.Q001}}', context, {
        escape: 'markdown',
      }),
    ).toBe('# Heading 5')
  })

  it('escape markdown leaves an unresolved token literal (fails open)', () => {
    expect(
      resolveTextExpressions('{{answers.Q999}}', context, {
        escape: 'markdown',
      }),
    ).toBe('{{answers.Q999}}')
  })

  it('does not escape when escape option is none', () => {
    expect(
      resolveTextExpressions('{{answers.Q001}}', context, { escape: 'none' }),
    ).toBe('5')
  })

  it('leaves literal HTML text untouched around a token', () => {
    expect(
      resolveTextExpressions('<p>Value: {{answers.Q001}}</p>', context),
    ).toBe('<p>Value: 5</p>')
  })

  it('resolves multiple tokens independently', () => {
    expect(
      resolveTextExpressions(
        '{{answers.Q001}} and {{answers.Q001 * 2}}',
        context,
      ),
    ).toBe('5 and 10')
  })

  it('returns falsy html unchanged', () => {
    expect(resolveTextExpressions('', context)).toBe('')
  })
})

describe('validateTextExpressions', () => {
  const questions: QuestionInfo[] = [
    { code: 'Q001', type: 'text', position: 0 },
    { code: 'Q002', type: 'text', position: 1 },
  ]

  it('returns no errors for an expression referencing an earlier question', () => {
    const errors = validateTextExpressions('{{answers.Q001}}', {
      availableQuestions: questions,
      position: 1,
    })
    expect(errors).toEqual([])
  })

  it('reports a forward reference', () => {
    const errors = validateTextExpressions('{{answers.Q002}}', {
      availableQuestions: questions,
      position: 1,
    })
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toContain('Forward reference')
  })

  it('reports an unknown question code', () => {
    const errors = validateTextExpressions('{{answers.Q999}}', {
      availableQuestions: questions,
      position: 1,
    })
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toContain('Unknown question code')
  })

  it('returns no errors when there are no tokens', () => {
    expect(
      validateTextExpressions('plain text', {
        availableQuestions: questions,
        position: 1,
      }),
    ).toEqual([])
  })
})

describe('answerLabels.* / labels.* namespaces', () => {
  const questionsInfo: QuestionInfo[] = [
    {
      code: 'Q1',
      type: QUESTION_TYPE_CHECKBOX,
      position: 0,
      answerOptionCodes: ['A001', 'A002'],
      answerOptions: [
        { code: 'A001', label: 'Blue' },
        { code: 'A002', label: 'Green' },
      ],
      text: 'Favourite colour?',
      detail: 'Pick one',
    },
    { code: 'Q2', type: QUESTION_TYPE_TEXT, position: 1, text: 'Your name?' },
    {
      code: 'Q3',
      type: QUESTION_TYPE_MATRIX_CHECKBOX,
      position: 2,
      answerOptionCodes: ['A001', 'A002'],
      answerOptions: [
        { code: 'A001', label: 'Agree' },
        { code: 'A002', label: 'Disagree' },
      ],
      subquestions: [
        { code: 'S001', text: 'Service quality', type: 'checkbox' },
        { code: 'S002', text: 'Value for money', type: 'checkbox' },
      ],
      text: 'Rate the following',
    },
    {
      code: 'Q4',
      type: QUESTION_TYPE_MATRIX_NUMBER,
      position: 3,
      answerOptionCodes: ['A001', 'A002'],
      answerOptions: [
        { code: 'A001', label: 'Weight' },
        { code: 'A002', label: 'Height' },
      ],
      subquestions: [{ code: 'S001', text: 'Measurements', type: 'number' }],
      text: 'Enter measurements',
    },
  ]
  const groupsInfo: GroupInfo[] = [
    { code: 'G1', position: 0, name: 'Intro', desc: 'The first group' },
    { code: 'G2', position: 1, name: 'More' },
  ]

  const context = ExpressionContextBuilder.build(
    {},
    [
      { questionCode: 'Q1', value: { A001: true } },
      { questionCode: 'Q3', value: { S001: { A001: true } } },
      { questionCode: 'Q4', value: { S001: { A001: 42 } } },
    ],
    questionsInfo,
    { language: 'en' },
    groupsInfo,
  )

  it('resolves an answerLabels bare token to the selected label', () => {
    expect(
      resolveTextExpressions('You picked {{answerLabels.Q1}}', context),
    ).toBe('You picked Blue')
  })

  it('resolves an answerLabels option sub-path to the static label', () => {
    expect(resolveTextExpressions('{{answerLabels.Q1.A002}}', context)).toBe(
      'Green',
    )
  })

  it('resolves labels.* bare and suffixed forms', () => {
    expect(resolveTextExpressions('{{labels.Q1}}', context)).toBe(
      'Favourite colour?',
    )
    expect(resolveTextExpressions('{{labels.Q1.detail}}', context)).toBe(
      'Pick one',
    )
    expect(resolveTextExpressions('{{labels.G1.desc}}', context)).toBe(
      'The first group',
    )
  })

  it('resolves labels.<Q>.<S> to a matrix row / subquestion text', () => {
    expect(resolveTextExpressions('{{labels.Q3.S001}}', context)).toBe(
      'Service quality',
    )
    expect(resolveTextExpressions('{{labels.Q3.A001}}', context)).toBe('Agree')
  })

  it('validates a labels.<Q>.<S> matrix row reference', () => {
    expect(
      validateTextExpressions('{{labels.Q3.S001}} {{labels.Q3.A002}}', {
        availableQuestions: questionsInfo,
        position: 5,
        availableGroups: groupsInfo,
      }),
    ).toEqual([])
    const errors = validateTextExpressions('{{labels.Q3.S999}}', {
      availableQuestions: questionsInfo,
      position: 5,
      availableGroups: groupsInfo,
    })
    expect(errors).toHaveLength(1)
  })

  it('resolves answerLabels.<Q>.<S> for a matrix row', () => {
    expect(resolveTextExpressions('{{answerLabels.Q3.S001}}', context)).toBe(
      'Agree',
    )
  })

  it('resolves answerLabels.<Q>.<S>.<A> for a typed matrix cell to its value', () => {
    expect(
      resolveTextExpressions('{{answerLabels.Q4.S001.A001}}', context),
    ).toBe('42')
    expect(resolveTextExpressions('{{answerLabels.Q4.S001}}', context)).toBe(
      '42',
    )
  })

  it('rejects a completely invalid deep labels.* path', () => {
    const errors = validateTextExpressions(
      '{{labels.Q3.desc.detail.desc.A001.detail}}',
      {
        availableQuestions: questionsInfo,
        position: 5,
        availableGroups: groupsInfo,
      },
    )
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toContain('trailing path segment')
  })

  it('rejects answers.<Q>.<A> on a matrix (subquestion code omitted)', () => {
    const errors = validateTextExpressions('{{answers.Q3.A001}}', {
      availableQuestions: questionsInfo,
      position: 5,
      availableGroups: groupsInfo,
    })
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toContain(
      'sub-question code before the answer-option code',
    )
  })

  it('reports one "unknown variable" error for an unrecognised namespace', () => {
    const errors = validateTextExpressions('{{party.Q1.S001}}', {
      availableQuestions: questionsInfo,
      position: 5,
      availableGroups: groupsInfo,
    })
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toBe('Unknown variable: party')
    expect(errors[0].message).not.toContain(';')
  })

  it('stops at the first error per expression', () => {
    const errors = validateTextExpressions('{{answers.Q404.A001.bogus}}', {
      availableQuestions: questionsInfo,
      position: 5,
      availableGroups: groupsInfo,
    })
    expect(errors).toHaveLength(1)
    expect(errors[0].message).not.toContain(';')
  })

  it('rejects an unknown question code in an answers.* token', () => {
    const errors = validateTextExpressions('{{answers.Q404}}', {
      availableQuestions: questionsInfo,
      position: 5,
      availableGroups: groupsInfo,
    })
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toContain('Unknown question code')
  })

  it('rejects trailing nonsense on an answerLabels.* option path', () => {
    const errors = validateTextExpressions('{{answerLabels.Q1.A001.bogus}}', {
      availableQuestions: questionsInfo,
      position: 5,
      availableGroups: groupsInfo,
    })
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toContain('trailing path segment')
  })

  it('accepts valid answers/answerLabels/labels paths', () => {
    expect(
      validateTextExpressions(
        '{{answers.Q1.A001}} {{answerLabels.Q3.S001.A002}} {{labels.Q1.detail}} {{labels.G1.name}}',
        {
          availableQuestions: questionsInfo,
          position: 5,
          availableGroups: groupsInfo,
        },
      ),
    ).toEqual([])
  })

  it('accepts an answers.<Q>.<S>.<A> cell reference on a typed (non-choice) matrix', () => {
    expect(
      validateTextExpressions('{{answers.Q4.S001.A001}}', {
        availableQuestions: questionsInfo,
        position: 5,
        availableGroups: groupsInfo,
      }),
    ).toEqual([])
  })

  it('rejects an unknown column on a typed matrix cell reference', () => {
    const errors = validateTextExpressions('{{answers.Q4.S001.A999}}', {
      availableQuestions: questionsInfo,
      position: 5,
      availableGroups: groupsInfo,
    })
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toContain('Unknown answer option code: A999')
  })

  it('points a bare answers.<Q>.<row> reference at the cell / answerLabels forms', () => {
    const errors = validateTextExpressions('{{answers.Q3.S001}}', {
      availableQuestions: questionsInfo,
      position: 5,
      availableGroups: groupsInfo,
    })
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toContain('matrix sub-question')
    expect(errors[0].message).toContain('answerLabels')
  })

  it('leaves an unanswered answerLabels token as "" (not literal)', () => {
    expect(resolveTextExpressions('name: [{{answerLabels.Q2}}]', context)).toBe(
      'name: []',
    )
  })

  it('resolves an absent labels sub-field to "" (not the literal token)', () => {
    // Q2 has no detail; G2 has no description
    expect(resolveTextExpressions('d:[{{labels.Q2.detail}}]', context)).toBe(
      'd:[]',
    )
    expect(resolveTextExpressions('g:[{{labels.G2.desc}}]', context)).toBe(
      'g:[]',
    )
  })

  it('leaves an unknown labels code literal', () => {
    expect(resolveTextExpressions('{{labels.BADCODE.detail}}', context)).toBe(
      '{{labels.BADCODE.detail}}',
    )
  })

  it('does not apply the forward-reference rule to labels.*', () => {
    // Q2 / G2 are at position 1; referenced from position 0 - allowed.
    expect(
      validateTextExpressions('{{labels.Q2}} {{labels.G2}}', {
        availableQuestions: questionsInfo,
        position: 0,
        availableGroups: groupsInfo,
      }),
    ).toEqual([])
  })

  it('validates a forward reference in an answerLabels token', () => {
    const errors = validateTextExpressions('{{answerLabels.Q2}}', {
      availableQuestions: questionsInfo,
      position: 1,
      availableGroups: groupsInfo,
    })
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toContain('Forward reference')
  })

  it('validates an unknown option in a text token', () => {
    const errors = validateTextExpressions('{{labels.Q1.A999}}', {
      availableQuestions: questionsInfo,
      position: 2,
      availableGroups: groupsInfo,
    })
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toContain('Unknown answer option')
  })

  it('accepts a valid labels.* group reference', () => {
    expect(
      validateTextExpressions('{{labels.G1}} {{labels.Q1.detail}}', {
        availableQuestions: questionsInfo,
        position: 2,
        availableGroups: groupsInfo,
      }),
    ).toEqual([])
  })
})
