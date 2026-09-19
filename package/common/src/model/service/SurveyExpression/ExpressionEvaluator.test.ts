import { evaluateJsExpression, isSafeExpression } from './ExpressionEvaluator'
import { ExpressionContext } from './types'

describe('isSafeExpression', () => {
  it('allows ordinary expressions', () => {
    expect(isSafeExpression('answers.Q001 + 1')).toBe(true)
    expect(isSafeExpression('')).toBe(true)
  })

  it('blocks dangerous constructs', () => {
    expect(isSafeExpression('eval("1")')).toBe(false)
    expect(isSafeExpression('window.location')).toBe(false)
    expect(isSafeExpression('obj.constructor')).toBe(false)
  })
})

describe('evaluateJsExpression', () => {
  const context: ExpressionContext = {
    participant: { nameFirst: 'John' },
    answers: { Q001: 5, Q002: { A001: true } },
    response: { language: 'en' },
    answerOptionCodes: ['A001'],
  }

  it('evaluates arithmetic against answers', () => {
    const result = evaluateJsExpression('answers.Q001 + 1', context)
    expect(result.value).toBe(6)
    expect(result.error).toBeUndefined()
  })

  it('evaluates string concatenation against participant', () => {
    const result = evaluateJsExpression(
      '"Hello " + participant.nameFirst',
      context,
    )
    expect(result.value).toBe('Hello John')
  })

  it('fails open (returns an error, does not throw) on a runtime error', () => {
    const result = evaluateJsExpression('UNDEFINED_VAR.x', context)
    expect(result.value).toBeUndefined()
    expect(result.error).toBeDefined()
  })

  it('rejects unsafe expressions without evaluating them', () => {
    const result = evaluateJsExpression('window.location', context)
    expect(result.value).toBeUndefined()
    expect(result.error).toContain('unsafe')
  })
})
