// cspell:ignore jsep unparseable constr uctor
import jsep from 'jsep'
import { ExpressionContext, ExpressionResult } from './types'

// jsep's core grammar has no rule for statements, function/class declarations,
// assignment operators, `new`, arrow functions, or template literals - those
// exist only as separate opt-in plugins we never register, so they are
// structurally unparseable, not merely blocked by a check we could forget.
// The one addition below (`in`) is the officially supported extension
// mechanism for a single, safe, side-effect-free operator - it does not
// enable any of the excluded constructs.
jsep.addBinaryOp('in', 7)

const ROOT_IDENTIFIERS = new Set([
  'answers',
  'answerLabels',
  'labels',
  'participant',
  'response',
])

// Blocked at every depth of member access, regardless of whether the key
// came from dot notation, bracket notation, or a computed expression
// resolved at runtime (e.g. `obj['constr' + 'uctor']`) - the check runs
// against the resolved string key, not the source text.
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

const BINARY_OPERATORS: Record<
  string,
  (left: unknown, right: unknown) => unknown
> = {
  '+': (l, r) => (l as never) + (r as never),
  '-': (l, r) => (l as number) - (r as number),
  '*': (l, r) => (l as number) * (r as number),
  '/': (l, r) => (l as number) / (r as number),
  '%': (l, r) => (l as number) % (r as number),
  '===': (l, r) => l === r,
  '!==': (l, r) => l !== r,
  '>': (l, r) => (l as never) > (r as never),
  '>=': (l, r) => (l as never) >= (r as never),
  '<': (l, r) => (l as never) < (r as never),
  '<=': (l, r) => (l as never) <= (r as never),
  in: (l, r) => {
    if (r === null || (typeof r !== 'object' && typeof r !== 'function')) {
      throw new Error(
        `Cannot use 'in' operator to search for '${String(l)}' in ${String(r)}`,
      )
    }
    return (l as PropertyKey) in (r as object)
  },
}

const UNARY_OPERATORS: Record<string, (arg: unknown) => unknown> = {
  '!': (a) => !a,
  '-': (a) => -(a as number),
  '+': (a) => +(a as number),
}

const ALLOWED_STRING_METHODS: Record<string, (...args: never[]) => unknown> = {
  includes: String.prototype.includes,
  toLowerCase: String.prototype.toLowerCase,
  toUpperCase: String.prototype.toUpperCase,
  trim: String.prototype.trim,
}

// No .some/.every - both require a callback function argument, and jsep's
// grammar has no function-literal/arrow-function syntax registered, so there
// is no way to construct one; including them would be dead surface.
const ALLOWED_ARRAY_METHODS: Record<string, (...args: never[]) => unknown> = {
  includes: Array.prototype.includes,
}

const ALL_METHOD_NAMES = new Set([
  ...Object.keys(ALLOWED_STRING_METHODS),
  ...Object.keys(ALLOWED_ARRAY_METHODS),
])

const MATH_METHODS: Record<string, (...args: number[]) => number> = {
  round: Math.round,
  min: Math.min,
  max: Math.max,
  abs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
}

/**
 * Thrown for anything outside the allowlist (unknown identifier, forbidden
 * key, disallowed call). Caught separately from other runtime errors so the
 * public error message stays the exact string existing callers match on
 * (`ConditionEvaluator.evaluate` remaps it verbatim).
 */
class UnsafeExpressionError extends Error {}

function isPropertyKey(value: unknown): value is string | number {
  return typeof value === 'string' || typeof value === 'number'
}

function resolveMemberKey(
  node: jsep.MemberExpression,
  context: ExpressionContext,
): string {
  const key = node.computed
    ? interpret(node.property, context)
    : (node.property as jsep.Identifier).name

  if (!isPropertyKey(key)) {
    throw new UnsafeExpressionError('Expression contains unsafe constructs')
  }

  const stringKey = String(key)
  if (FORBIDDEN_KEYS.has(stringKey)) {
    throw new UnsafeExpressionError('Expression contains unsafe constructs')
  }

  return stringKey
}

// Shared with `staticCheck` below, so "is this operator/namespace call
// known" is expressed once rather than re-derived by hand in both the
// runtime evaluator's call-handling and the structural preflight check -
// a hand-copied duplicate is the kind of drift that degrades silently
// (evaluator and preflight disagreeing) rather than erroring loudly.
function isKnownMathMethod(method: string): boolean {
  return Object.prototype.hasOwnProperty.call(MATH_METHODS, method)
}

function isKnownNamespaceCall(namespace: string, method: string): boolean {
  if (namespace === 'Math') return isKnownMathMethod(method)
  if (namespace === 'Object') return method === 'keys'
  return false
}

function isKnownBinaryOperator(operator: string): boolean {
  return (
    operator === '&&' ||
    operator === '||' ||
    Object.prototype.hasOwnProperty.call(BINARY_OPERATORS, operator)
  )
}

function isKnownUnaryOperator(operator: string): boolean {
  return Object.prototype.hasOwnProperty.call(UNARY_OPERATORS, operator)
}

function interpretMathOrObjectCall(
  node: jsep.CallExpression,
  namespace: string,
  method: string,
  context: ExpressionContext,
): { handled: true; value: unknown } | { handled: false } {
  if (namespace === 'Math' && isKnownMathMethod(method)) {
    const args = node.arguments.map((a) => interpret(a, context)) as number[]
    return { handled: true, value: MATH_METHODS[method](...args) }
  }

  if (namespace === 'Object' && method === 'keys') {
    const args = node.arguments.map((a) => interpret(a, context))
    const target = args[0]
    if (args.length !== 1 || target === null || typeof target !== 'object') {
      throw new Error('Object.keys requires a single object argument')
    }
    return { handled: true, value: Object.keys(target as object) }
  }

  return { handled: false }
}

function interpretCallExpression(
  node: jsep.CallExpression,
  context: ExpressionContext,
): unknown {
  const callee = node.callee
  if (callee.type !== 'MemberExpression') {
    // Bare function calls (`eval(...)`, `Function(...)`, or any other
    // identifier call) are never allowed - every permitted call is a method
    // on a resolved value, or one of the Math/Object namespace helpers below.
    throw new UnsafeExpressionError('Expression contains unsafe constructs')
  }

  const memberCallee = callee as jsep.MemberExpression
  if (!memberCallee.computed && memberCallee.object.type === 'Identifier') {
    const namespace = (memberCallee.object as jsep.Identifier).name
    const property = memberCallee.property
    if (
      (namespace === 'Math' || namespace === 'Object') &&
      property.type === 'Identifier'
    ) {
      const result = interpretMathOrObjectCall(
        node,
        namespace,
        (property as jsep.Identifier).name,
        context,
      )
      if (result.handled) return result.value
    }
  }

  const objectValue = interpret(memberCallee.object, context)
  const key = resolveMemberKey(memberCallee, context)

  let fn: ((...args: never[]) => unknown) | undefined
  if (typeof objectValue === 'string') {
    fn = ALLOWED_STRING_METHODS[key]
  } else if (Array.isArray(objectValue)) {
    fn = ALLOWED_ARRAY_METHODS[key]
  }

  if (!fn) {
    throw new UnsafeExpressionError('Expression contains unsafe constructs')
  }

  const args = node.arguments.map((a) => interpret(a, context))
  return fn.apply(objectValue, args as never[])
}

function interpret(node: jsep.Expression, context: ExpressionContext): unknown {
  switch (node.type) {
    case 'Literal':
      return (node as jsep.Literal).value

    case 'ArrayExpression':
      return (node as jsep.ArrayExpression).elements.map((element) =>
        element ? interpret(element, context) : undefined,
      )

    case 'Identifier': {
      const name = (node as jsep.Identifier).name
      if (!ROOT_IDENTIFIERS.has(name)) {
        throw new UnsafeExpressionError('Expression contains unsafe constructs')
      }
      // `answerLabels`/`labels` are optional on the context type (hand-built
      // test contexts omit them); coalesce so member access leaves the token
      // literal rather than throwing a "cannot read properties of undefined".
      return (
        context[
          name as
            'answers' | 'answerLabels' | 'labels' | 'participant' | 'response'
        ] ?? (name === 'answerLabels' || name === 'labels' ? {} : undefined)
      )
    }

    case 'MemberExpression': {
      const memberNode = node as jsep.MemberExpression
      const objectValue = interpret(memberNode.object, context)
      const key = resolveMemberKey(memberNode, context)
      if (objectValue === null || objectValue === undefined) {
        throw new Error(
          `Cannot read properties of ${String(objectValue)} (reading '${key}')`,
        )
      }
      return (objectValue as Record<string, unknown>)[key]
    }

    case 'CallExpression':
      return interpretCallExpression(node as jsep.CallExpression, context)

    case 'UnaryExpression': {
      const unaryNode = node as jsep.UnaryExpression
      const op = UNARY_OPERATORS[unaryNode.operator]
      if (!op)
        throw new UnsafeExpressionError('Expression contains unsafe constructs')
      return op(interpret(unaryNode.argument, context))
    }

    case 'BinaryExpression': {
      // jsep represents `&&`/`||` as BinaryExpression nodes too (it has no
      // separate LogicalExpression type) - handle them here with proper
      // short-circuit evaluation rather than via the eager BINARY_OPERATORS
      // table.
      const binaryNode = node as jsep.BinaryExpression
      if (binaryNode.operator === '&&') {
        const left = interpret(binaryNode.left, context)
        return left ? interpret(binaryNode.right, context) : left
      }
      if (binaryNode.operator === '||') {
        const left = interpret(binaryNode.left, context)
        return left ? left : interpret(binaryNode.right, context)
      }
      const op = BINARY_OPERATORS[binaryNode.operator]
      if (!op)
        throw new UnsafeExpressionError('Expression contains unsafe constructs')
      return op(
        interpret(binaryNode.left, context),
        interpret(binaryNode.right, context),
      )
    }

    case 'ConditionalExpression': {
      const conditionalNode = node as jsep.ConditionalExpression
      return interpret(conditionalNode.test, context)
        ? interpret(conditionalNode.consequent, context)
        : interpret(conditionalNode.alternate, context)
    }

    default:
      // ThisExpression, Compound, SequenceExpression, and anything a future
      // jsep plugin might add all land here - rejected because they are not
      // implemented, not because they are pattern-matched.
      throw new UnsafeExpressionError('Expression contains unsafe constructs')
  }
}

/**
 * Rewrites dot-accessed predefined-option tokens (e.g. "answers.Q002.YES")
 * into literal comparisons against the already-bound question value (e.g.
 * "(answers.Q002 === true)") before parsing. Question codes like Q002 are
 * bound to their raw stored value (boolean/number for yesNo/starRating/
 * point5/point10), not an options-object, so `answers.Q002.YES` can't be
 * resolved via property access the way `answers.Q001.A001` is for
 * checkbox/dropdown-style questions.
 */
function rewritePredefinedAnswerOptionTokens(
  expression: string,
  answerOptionLiterals?: Record<string, string>,
): string {
  if (!answerOptionLiterals) return expression

  let processedExpression = expression
  for (const [token, literal] of Object.entries(answerOptionLiterals)) {
    // token is "answers.<questionCode>.<optionCode>"
    const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const questionCode = token.split('.')[1]
    processedExpression = processedExpression.replace(
      new RegExp(`\\b${escapedToken}\\b`, 'g'),
      `(answers.${questionCode} === ${literal})`,
    )
  }
  return processedExpression
}

/**
 * Substitutes bare answer-option-code literals (e.g. A001, only reachable
 * via hand-typed expressions - the visual condition builder always emits
 * quoted literals or answers.<code> dot notation) for their quoted string
 * literal before parsing, since they can't be resolved as an identifier (the
 * interpreter only ever resolves `answers`/`participant`/`response`). The
 * negative lookbehind avoids corrupting the option-code segment of
 * answers.Q001.A001 property access.
 */
function rewriteBareAnswerOptionCodes(
  expression: string,
  answerOptionCodes: string[],
): string {
  let processedExpression = expression
  for (const code of answerOptionCodes) {
    const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    processedExpression = processedExpression.replace(
      new RegExp(`(?<!\\.)\\b${escapedCode}\\b`, 'g'),
      JSON.stringify(code),
    )
  }
  return processedExpression
}

function preprocess(expression: string, context: ExpressionContext): string {
  const withOptionTokens = rewritePredefinedAnswerOptionTokens(
    expression,
    context.answerOptionLiterals,
  )
  return rewriteBareAnswerOptionCodes(
    withOptionTokens,
    context.answerOptionCodes,
  )
}

/**
 * Parses `expression` into a restricted-grammar AST (jsep, core grammar plus
 * the `in` operator - no statements, assignment, `new`, arrow functions, or
 * template literals exist in that grammar at all) and interprets it with a
 * hand-rolled evaluator that only ever resolves `answers`/`participant`/
 * `response` and a small explicit allowlist of members/calls.
 * `window`/`Function`/`this`/etc. are unreachable by construction, not
 * merely pattern-matched away.
 */
export function evaluateSafeExpression(
  expression: string,
  context: ExpressionContext,
): ExpressionResult {
  try {
    const processedExpression = preprocess(expression, context)
    const ast = jsep(processedExpression)
    const value = interpret(ast, context)
    return { value }
  } catch (error) {
    return {
      value: undefined,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Statically resolves a computed member key when it's a plain string/number
 * literal (e.g. `obj['constructor']`), so the common case of a forbidden key
 * spelled out directly in bracket notation is still caught ahead of
 * evaluation. A key built at runtime (e.g. `obj['constr' + 'uctor']`) can't
 * be resolved here - it's still caught by `evaluateSafeExpression`, which is
 * the actual security boundary.
 */
function staticForbiddenLiteralKey(property: jsep.Expression): boolean {
  if (property.type !== 'Literal') return false
  const value = (property as jsep.Literal).value
  return isPropertyKey(value) && FORBIDDEN_KEYS.has(String(value))
}

function staticCheck(node: jsep.Expression): boolean {
  switch (node.type) {
    case 'Literal':
      return true

    case 'ArrayExpression':
      return (node as jsep.ArrayExpression).elements.every(
        (element) => !element || staticCheck(element),
      )

    case 'Identifier':
      return ROOT_IDENTIFIERS.has((node as jsep.Identifier).name)

    case 'MemberExpression': {
      const memberNode = node as jsep.MemberExpression
      if (!staticCheck(memberNode.object)) return false
      if (memberNode.computed) {
        return (
          !staticForbiddenLiteralKey(memberNode.property) &&
          staticCheck(memberNode.property)
        )
      }
      const propertyName = (memberNode.property as jsep.Identifier).name
      return !FORBIDDEN_KEYS.has(propertyName)
    }

    case 'CallExpression': {
      const callNode = node as jsep.CallExpression
      if (!callNode.arguments.every((arg) => staticCheck(arg))) return false

      const callee = callNode.callee
      if (callee.type !== 'MemberExpression') return false
      const memberCallee = callee as jsep.MemberExpression

      if (!memberCallee.computed && memberCallee.object.type === 'Identifier') {
        const namespace = (memberCallee.object as jsep.Identifier).name
        const property = memberCallee.property
        if (property.type === 'Identifier') {
          const propertyName = (property as jsep.Identifier).name
          if (isKnownNamespaceCall(namespace, propertyName)) return true
        }
      }

      if (!staticCheck(memberCallee.object)) return false
      if (memberCallee.computed) return staticCheck(memberCallee.property)
      const methodName = (memberCallee.property as jsep.Identifier).name
      return ALL_METHOD_NAMES.has(methodName)
    }

    case 'UnaryExpression':
      return (
        isKnownUnaryOperator((node as jsep.UnaryExpression).operator) &&
        staticCheck((node as jsep.UnaryExpression).argument)
      )

    case 'BinaryExpression': {
      // jsep represents `&&`/`||` as BinaryExpression nodes too (see the
      // matching comment in `interpret`) - no separate LogicalExpression type
      // exists to check here.
      const binaryNode = node as jsep.BinaryExpression
      return (
        isKnownBinaryOperator(binaryNode.operator) &&
        staticCheck(binaryNode.left) &&
        staticCheck(binaryNode.right)
      )
    }

    case 'ConditionalExpression': {
      const conditionalNode = node as jsep.ConditionalExpression
      return (
        staticCheck(conditionalNode.test) &&
        staticCheck(conditionalNode.consequent) &&
        staticCheck(conditionalNode.alternate)
      )
    }

    default:
      return false
  }
}

/**
 * One predefined-variable reference pulled out of an expression - the root
 * namespace (`answers`/`answerLabels`/`labels`/`participant`/`response`) plus
 * every dotted member segment after it, in source order. A segment that was a
 * computed access with a non-literal key (e.g. `answers[someVar]`) is recorded
 * as the sentinel `'*'`, which `validateVariablePath` treats as "can't resolve
 * this statically, don't flag it".
 */
export interface VariablePathReference {
  namespace: string
  segments: string[]
  /** `namespace.segments.join('.')` - for use in error messages. */
  raw: string
}

function memberSegments(
  node: jsep.MemberExpression,
): { namespace: string; segments: string[] } | null {
  const segments: string[] = []
  let current: jsep.Expression = node
  while (current.type === 'MemberExpression') {
    const member = current as jsep.MemberExpression
    if (member.computed) {
      const property = member.property
      if (
        property.type === 'Literal' &&
        isPropertyKey((property as jsep.Literal).value)
      ) {
        segments.unshift(String((property as jsep.Literal).value))
      } else {
        segments.unshift('*')
      }
    } else {
      segments.unshift((member.property as jsep.Identifier).name)
    }
    current = member.object
  }
  if (
    current.type === 'Identifier' &&
    ROOT_IDENTIFIERS.has((current as jsep.Identifier).name)
  ) {
    return { namespace: (current as jsep.Identifier).name, segments }
  }
  return null
}

/**
 * Extracts every predefined-variable reference (`answers.*`, `answerLabels.*`,
 * `labels.*`, `participant.*`, `response.*`) from a `{{expression}}` body,
 * walking the full jsep AST so a reference nested inside an operator, ternary,
 * call argument, or array literal is still found - and, crucially, so the
 * *entire* member chain is captured rather than a fixed number of leading
 * segments. `validateVariablePath` then checks each against the survey
 * structure. Returns `[]` for an unparseable expression (a syntax error is
 * reported separately by `ConditionValidator`).
 */
export function extractVariablePaths(
  expression: string,
): VariablePathReference[] {
  if (!expression || !expression.trim()) return []

  let ast: jsep.Expression
  try {
    ast = jsep(expression)
  } catch {
    return []
  }

  const references: VariablePathReference[] = []

  const walk = (node: jsep.Expression | null | undefined): void => {
    if (!node || typeof node.type !== 'string') return

    if (node.type === 'CallExpression') {
      // The callee of a method call (`participant.email.trim()`,
      // `answers.Q1.includes(...)`) ends in a method name, not a data-path
      // segment - walk the receiver object, not the whole callee chain.
      const call = node as jsep.CallExpression
      if (call.callee.type === 'MemberExpression') {
        walk((call.callee as jsep.MemberExpression).object)
      } else {
        walk(call.callee)
      }
      for (const argument of call.arguments) walk(argument)
      return
    }

    if (node.type === 'MemberExpression') {
      const chain = memberSegments(node as jsep.MemberExpression)
      if (chain) {
        references.push({
          namespace: chain.namespace,
          segments: chain.segments,
          raw: [chain.namespace, ...chain.segments].join('.'),
        })
        // A root-anchored chain contributes one reference; still descend into
        // any computed-key sub-expressions along it (`answers[answers.Q1]`).
        let current: jsep.Expression = node
        while (current.type === 'MemberExpression') {
          const member = current as jsep.MemberExpression
          if (member.computed) walk(member.property)
          current = member.object
        }
        return
      }
    }

    const record = node as unknown as Record<string, unknown>
    for (const key of [
      'left',
      'right',
      'argument',
      'test',
      'consequent',
      'alternate',
      'object',
      'property',
      'callee',
    ]) {
      const child = record[key]
      if (child && typeof child === 'object' && 'type' in child) {
        walk(child as jsep.Expression)
      }
    }
    for (const listKey of ['arguments', 'elements']) {
      const list = record[listKey]
      if (Array.isArray(list)) {
        for (const item of list) walk(item as jsep.Expression)
      }
    }
  }

  walk(ast)
  return references
}

/**
 * Structural-only preflight check ("would this parse into an allowed
 * expression"), used for UI validation before any real data exists to
 * evaluate against. Not the security boundary itself - `evaluateSafeExpression`
 * enforces the same allowlist against real values at evaluation time, which
 * is what actually matters for a computed member key this check cannot
 * statically resolve (e.g. `obj['constr' + 'uctor']`).
 */
export function checkExpressionSafety(expression: string): boolean {
  if (!expression) return true

  try {
    const ast = jsep(expression)
    return staticCheck(ast)
  } catch {
    return false
  }
}

/**
 * Walks the AST for the first identifier used as a data root that is not one
 * of the predefined namespaces (`answers`/`answerLabels`/`labels`/
 * `participant`/`response`) or a known call namespace (`Math`/`Object`) - e.g.
 * the `party` in `{{party.Q001.S001}}`. Lets `validateTextExpressions` report
 * "unknown variable" rather than the opaque "unsafe constructs" (or a pile of
 * "unknown answer code" errors from the condition validator misreading each
 * dotted segment as a bare code). Returns `null` when every identifier is a
 * recognised root.
 */
export function firstUnknownRootIdentifier(expression: string): string | null {
  if (!expression || !expression.trim()) return null

  let ast: jsep.Expression
  try {
    ast = jsep(expression)
  } catch {
    return null
  }

  let found: string | null = null

  const walk = (node: jsep.Expression | null | undefined): void => {
    if (found || !node || typeof node.type !== 'string') return

    if (node.type === 'Identifier') {
      const name = (node as jsep.Identifier).name
      if (!ROOT_IDENTIFIERS.has(name) && name !== 'Math' && name !== 'Object') {
        found = name
      }
      return
    }

    if (node.type === 'MemberExpression') {
      const member = node as jsep.MemberExpression
      walk(member.object)
      if (member.computed) walk(member.property)
      return
    }

    if (node.type === 'CallExpression') {
      const call = node as jsep.CallExpression
      // `Math.max(...)` / `answers.Q1.includes(...)` - the method name is not a
      // data root, so walk the receiver, not the whole callee chain.
      if (call.callee.type === 'MemberExpression') {
        walk((call.callee as jsep.MemberExpression).object)
      } else {
        walk(call.callee)
      }
      for (const argument of call.arguments) walk(argument)
      return
    }

    const record = node as unknown as Record<string, unknown>
    for (const key of [
      'left',
      'right',
      'argument',
      'test',
      'consequent',
      'alternate',
      'elements',
    ]) {
      const value = record[key]
      if (Array.isArray(value)) {
        for (const child of value) walk(child as jsep.Expression)
      } else if (value && typeof value === 'object') {
        walk(value as jsep.Expression)
      }
    }
  }

  walk(ast)
  return found
}
