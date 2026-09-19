// cspell:ignore unreached constr uctor unparseable
import {
  evaluateSafeExpression,
  checkExpressionSafety,
  extractVariablePaths,
} from './SafeExpressionInterpreter'
import { ExpressionContext } from './types'

describe('extractVariablePaths', () => {
  it('captures the full member chain for each namespace reference', () => {
    expect(extractVariablePaths('answers.Q1.S001.A001')).toEqual([
      {
        namespace: 'answers',
        segments: ['Q1', 'S001', 'A001'],
        raw: 'answers.Q1.S001.A001',
      },
    ])
  })

  it('finds references nested in operators, ternaries and calls', () => {
    const refs = extractVariablePaths(
      'answers.Q1 > 2 ? labels.Q2.detail : participant.email.trim()',
    )
    expect(refs.map((r) => r.raw).sort()).toEqual([
      'answers.Q1',
      'labels.Q2.detail',
      'participant.email',
    ])
  })

  it('records a non-literal computed key as the "*" sentinel', () => {
    expect(extractVariablePaths('answers[response.language]')[0]).toEqual({
      namespace: 'answers',
      segments: ['*'],
      raw: 'answers.*',
    })
  })

  it('returns [] for an unparseable expression', () => {
    expect(extractVariablePaths('answers.Q1 +')).toEqual([])
  })

  it('ignores identifiers that are not predefined namespaces', () => {
    expect(extractVariablePaths('window.location.href')).toEqual([])
  })
})

describe('checkExpressionSafety', () => {
  it('allows ordinary expressions', () => {
    expect(checkExpressionSafety('answers.Q001 + 1')).toBe(true)
    expect(checkExpressionSafety('')).toBe(true)
  })

  it('blocks dangerous constructs', () => {
    expect(checkExpressionSafety('eval("1")')).toBe(false)
    expect(checkExpressionSafety('window.location')).toBe(false)
    expect(checkExpressionSafety('obj.constructor')).toBe(false)
  })
})

describe('evaluateSafeExpression', () => {
  const context: ExpressionContext = {
    participant: { nameFirst: 'John' },
    answers: { Q001: 5, Q002: { A001: true } },
    response: { language: 'en' },
    answerOptionCodes: ['A001'],
  }

  it('evaluates arithmetic against answers', () => {
    const result = evaluateSafeExpression('answers.Q001 + 1', context)
    expect(result.value).toBe(6)
    expect(result.error).toBeUndefined()
  })

  it('evaluates string concatenation against participant', () => {
    const result = evaluateSafeExpression(
      '"Hello " + participant.nameFirst',
      context,
    )
    expect(result.value).toBe('Hello John')
  })

  it('fails open (returns an error, does not throw) on a runtime error', () => {
    const result = evaluateSafeExpression('UNDEFINED_VAR.x', context)
    expect(result.value).toBeUndefined()
    expect(result.error).toBeDefined()
  })

  it('rejects unsafe expressions without evaluating them', () => {
    const result = evaluateSafeExpression('window.location', context)
    expect(result.value).toBeUndefined()
    expect(result.error).toContain('unsafe')
  })

  it('evaluates the newly-allowed string helpers', () => {
    const ctx: ExpressionContext = {
      ...context,
      answers: { Q001: '  Hello World  ' },
    }
    expect(evaluateSafeExpression('answers.Q001.trim()', ctx).value).toBe(
      'Hello World',
    )
    expect(
      evaluateSafeExpression(
        'answers.Q001.toLowerCase().includes("world")',
        ctx,
      ).value,
    ).toBe(true)
    expect(
      evaluateSafeExpression('answers.Q001.toUpperCase()', ctx).value,
    ).toBe('  HELLO WORLD  ')
  })

  it('evaluates the newly-allowed array helpers', () => {
    const ctx: ExpressionContext = {
      ...context,
      answers: { Q001: ['a', 'b', 'c'] },
    }
    expect(
      evaluateSafeExpression('answers.Q001.includes("b")', ctx).value,
    ).toBe(true)
    expect(evaluateSafeExpression('answers.Q001.length === 3', ctx).value).toBe(
      true,
    )
  })

  it('evaluates the newly-allowed Math helpers', () => {
    const ctx: ExpressionContext = { ...context, answers: { Q001: 4.6 } }
    expect(evaluateSafeExpression('Math.round(answers.Q001)', ctx).value).toBe(
      5,
    )
    expect(evaluateSafeExpression('Math.min(answers.Q001, 2)', ctx).value).toBe(
      2,
    )
    expect(evaluateSafeExpression('Math.max(answers.Q001, 2)', ctx).value).toBe(
      4.6,
    )
    expect(evaluateSafeExpression('Math.floor(answers.Q001)', ctx).value).toBe(
      4,
    )
    expect(evaluateSafeExpression('Math.ceil(answers.Q001)', ctx).value).toBe(5)
    expect(evaluateSafeExpression('Math.abs(-5)', ctx).value).toBe(5)
  })

  it('evaluates Object.keys', () => {
    const ctx: ExpressionContext = {
      ...context,
      answers: { Q001: { A001: true, A002: true } },
    }
    expect(
      evaluateSafeExpression('Object.keys(answers.Q001).length', ctx).value,
    ).toBe(2)
  })

  it('evaluates the ternary operator', () => {
    expect(
      evaluateSafeExpression('answers.Q001 > 3 ? "big" : "small"', context)
        .value,
    ).toBe('big')
  })

  it('evaluates the in operator (bare answer-option code, rewritten to a string literal)', () => {
    expect(evaluateSafeExpression('A001 in answers.Q002', context).value).toBe(
      true,
    )
    expect(
      evaluateSafeExpression('"A999" in answers.Q002', context).value,
    ).toBe(false)
  })

  it('short-circuits && and || without evaluating the unreached side', () => {
    // If short-circuiting were broken, the right side (an unknown identifier)
    // would throw and surface as an error.
    expect(
      evaluateSafeExpression('false && UNDEFINED_VAR.x', context).error,
    ).toBeUndefined()
    expect(
      evaluateSafeExpression('false && UNDEFINED_VAR.x', context).value,
    ).toBe(false)
    expect(
      evaluateSafeExpression('true || UNDEFINED_VAR.x', context).error,
    ).toBeUndefined()
    expect(
      evaluateSafeExpression('true || UNDEFINED_VAR.x', context).value,
    ).toBe(true)
  })
})

describe('checkExpressionSafety and evaluateSafeExpression agreement', () => {
  // `checkExpressionSafety` (structural preflight) and `evaluateSafeExpression`
  // (real enforcement) share their operator/namespace-call allowlist checks -
  // this asserts they agree on both allowed and rejected shapes, so a future
  // change to one side can't silently diverge from the other without a test
  // failure. Not a full equivalence check (a computed forbidden key like
  // `obj['constr' + 'uctor']` is intentionally only caught at evaluation time,
  // see SafeExpressionInterpreter.security.test.ts), just the common operator/
  // call surface.
  const context: ExpressionContext = {
    participant: { nameFirst: 'John' },
    answers: { Q001: 5, Q002: { A001: true } },
    response: { language: 'en' },
    answerOptionCodes: ['A001'],
  }

  const allowed = [
    'answers.Q001 + 1',
    'answers.Q001 > 3 && response.language === "en"',
    'answers.Q001 > 3 || false',
    '!answers.Q002.A001',
    '-answers.Q001',
    'Math.round(answers.Q001)',
    'Object.keys(answers.Q002).length',
    'answers.Q001 > 3 ? "big" : "small"',
  ]

  const rejected = [
    'eval("1")',
    'window.location',
    'obj.constructor',
    'answers.Q001 ?? 0',
    'Math.random()',
    'Object.values(answers.Q002)',
    'answers.Q001++',
  ]

  it.each(allowed)('agrees "%s" is allowed', (expression) => {
    expect(checkExpressionSafety(expression)).toBe(true)
    expect(evaluateSafeExpression(expression, context).error).toBeUndefined()
  })

  it.each(rejected)('agrees "%s" is rejected', (expression) => {
    expect(checkExpressionSafety(expression)).toBe(false)
    expect(evaluateSafeExpression(expression, context).error).toBeDefined()
  })
})
