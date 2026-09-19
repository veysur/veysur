// cspell:ignore jsep constr uctor
import {
  evaluateSafeExpression,
  checkExpressionSafety,
} from './SafeExpressionInterpreter'
import { ExpressionContext } from './types'

/**
 * Attack corpus for the safe-expression interpreter. Every case here is a
 * known technique for reaching `window`/`Function`/`eval`/etc. from
 * author-controlled JS source text - each must be rejected structurally
 * (the interpreter never resolves the identifier/member/call at all), not
 * merely "happen not to work" for some incidental reason.
 */
describe('SafeExpressionInterpreter security', () => {
  const context: ExpressionContext = {
    participant: { nameFirst: 'John' },
    answers: { Q001: 'hello', Q002: ['a', 'b'] },
    answerLabels: { Q001: 'Hello' },
    labels: { Q001: 'Question one' },
    response: {},
    answerOptionCodes: [],
  }

  // The real security boundary: the interpreter must never produce a value
  // for any of these, regardless of how the forbidden key/identifier was
  // spelled.
  const assertRejected = (expression: string) => {
    const result = evaluateSafeExpression(expression, context)
    expect(result.value).toBeUndefined()
    expect(result.error).toBeDefined()
  }

  // The structural preflight check (`checkExpressionSafety`) can only reject
  // what's visible without running the expression - a runtime-built key
  // (`'constr' + 'uctor'` off an otherwise-valid root) isn't statically
  // resolvable, so only assert this for cases where the forbidden
  // identifier/key/callee is spelled out directly in the source.
  const assertRejectedStatically = (expression: string) => {
    assertRejected(expression)
    expect(checkExpressionSafety(expression)).toBe(false)
  }

  it('rejects bare globals', () => {
    assertRejectedStatically('window')
    assertRejectedStatically('globalThis')
    assertRejectedStatically('document')
    assertRejectedStatically('process')
    assertRejectedStatically('this')
  })

  it('rejects member access off bare globals', () => {
    assertRejectedStatically('window.location')
    assertRejectedStatically('window.alert(1)')
    assertRejectedStatically('globalThis.fetch')
    assertRejectedStatically('document.cookie')
    assertRejectedStatically('this.alert(1)')
    // Object is `this` (invalid root) regardless of how the property is
    // spelled, so this is statically detectable despite the computed key.
    assertRejectedStatically("this['win' + 'dow']")
  })

  it('rejects bare dangerous function calls', () => {
    assertRejectedStatically('eval("1")')
    assertRejectedStatically('Function("return 1")')
    assertRejectedStatically('fetch("http://evil.example")')
    assertRejectedStatically('XMLHttpRequest()')
    assertRejectedStatically('require("fs")')
  })

  it('rejects __proto__/constructor/prototype access via dot notation', () => {
    assertRejectedStatically('answers.Q001.__proto__')
    assertRejectedStatically('answers.Q001.constructor')
    assertRejectedStatically('answers.Q001.constructor.prototype')
    assertRejectedStatically('({}).constructor')
    assertRejectedStatically('[].constructor')
  })

  it('applies the forbidden-key rules to the answerLabels/labels roots too (parity)', () => {
    // These roots are plain data maps (values are String-wrapper nodes), so
    // there is nothing new to reach - this is coverage parity with answers.*.
    assertRejectedStatically('answerLabels.Q001.constructor')
    assertRejectedStatically('labels.Q001.__proto__')
    assertRejected('labels.Q001["constr" + "uctor"].name')
  })

  it('rejects __proto__/constructor/prototype access via computed bracket notation', () => {
    assertRejectedStatically("answers.Q001['constructor']")
    assertRejectedStatically('answers.Q001["prototype"]')
  })

  it('rejects a forbidden key built at runtime via string concatenation - caught only by the real interpreter, not the static preflight check', () => {
    assertRejected('answers.Q001["constr" + "uctor"]')
    assertRejected("answers.Q001['__pro' + 'to__']")
  })

  it('rejects the classic sandbox-escape gadget chains', () => {
    assertRejectedStatically('(() => {}).constructor("return this")()')
    assertRejectedStatically('[].constructor.constructor("return this")()')
    assertRejectedStatically(
      'answers.Q001.constructor.constructor("return this")()',
    )
    assertRejectedStatically('Array.constructor')
  })

  it('rejects calls whose callee is not an allowlisted method', () => {
    assertRejectedStatically('answers.Q001.replace("a", "b")')
    assertRejectedStatically('answers.Q001.charAt(0)')
    assertRejectedStatically('answers.Q002.map(answers.Q001)')
    assertRejectedStatically('answers.Q002.forEach(answers.Q001)')
  })

  it('rejects reflection/metaprogramming primitives', () => {
    assertRejectedStatically('Reflect.get(answers, "Q001")')
    assertRejectedStatically('Proxy')
    assertRejectedStatically('Symbol()')
    assertRejectedStatically('Object.getPrototypeOf(answers.Q001)')
    assertRejectedStatically('Object.assign(answers.Q001, {})')
  })

  it('rejects assignment, since jsep has no assignment grammar to parse it', () => {
    assertRejectedStatically('answers.Q001 = "x"')
  })

  it('rejects new expressions, since jsep has no `new` grammar to parse it', () => {
    assertRejectedStatically('new Function("return this")')
  })

  it('rejects template literals, unsupported by core jsep grammar', () => {
    assertRejectedStatically('`${answers.Q001}`')
  })

  it('rejects identifiers other than answers/participant/response, however constructed', () => {
    assertRejectedStatically('UNDEFINED_GLOBAL')
    assertRejectedStatically('Math') // only Math.<method>(...) call form is allowed, never the bare namespace
    assertRejectedStatically('Object') // only Object.keys(...) call form is allowed, never the bare namespace
  })
})
