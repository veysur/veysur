# Survey Expression Engine

`SurveyExpression` (`../src/model/service/SurveyExpression/`) is the JavaScript
expression engine shared by two features that need to evaluate admin-authored
expressions against the same participant/answers/response data:

- **Display conditions** (question/group visibility) — see
  [survey-conditions.md](survey-conditions.md#available-variables) for the full semantic
  write-up of `answers`/`participant`/`response` and condition-specific behaviour
  (forward-reference rules, fail-safe display, structural change detection).
- **Embedded text expressions** — `{{expression}}` tokens in survey text — see
  [template-variables.md](template-variables.md#system-4--embedded-expressions-in-survey-text).

The engine was extracted out of `SurveyCondition/` into this sibling module once text
expressions needed the same evaluator, so "same variables as the condition builder" is
true by construction (one shared `ExpressionContext`), not by convention.

## `ExpressionContext`

```ts
interface ExpressionContext {
  participant: Record<string, unknown>
  answers: { [questionCode: string]: unknown }
  answerLabels?: { [questionCode: string]: unknown } // human-readable answer rendering
  labels?: { [code: string]: unknown } // static question/group text (String-wrapper nodes)
  response: Record<string, unknown>
  answerOptionCodes: string[]
  answerOptionLiterals?: Record<string, string>
}
```

Built by `ExpressionContextBuilder.build()` (`ExpressionContext.ts`) from participant
data, the answers collected so far, and survey question metadata — seeding every
question code as a real key (empty object/`undefined` as appropriate to the question
shape) so property access on an unanswered question returns `undefined`/falsy instead of
throwing. `buildEmpty()` returns a context with no data, used for structural validation
that doesn't need real values. `answerOptionLiterals` maps predefined-option dot-tokens
(e.g. `Q002.YES`) to the JS literal they rewrite to (e.g. `true`) for question types
whose answer is stored as a raw boolean/number rather than an options object. An
optional 5th `groups: GroupInfo[]` argument supplies group metadata for `labels.<groupCode>`.

### `answerLabels.*` and `labels.*`

Two text-expression-only namespaces (condition evaluation never reads them):

| Reference | Resolves to | Response-dependent |
|---|---|---|
| `answers.Q005` | raw stored value: `{A001:true}` / `"42"` / `{S001:{A001:true}}` | yes |
| `answers.Q005.S001.A001` | raw matrix cell value (`true`/`false`); `answers.Q005.S001` alone is rejected - a row has no scalar value, and `answers.Q005.A001` on a matrix resolves to nothing | yes |
| `answerLabels.Q005` | selected option label(s), `", "`-joined; scalar value for text/number/date; `""` when unanswered | yes |
| `answerLabels.Q005.A001` | option A001's label (static, whether or not selected) | no |
| `answerLabels.Q005.S001` | matrix row S001's readable answer: selected column label(s) for a checkbox row, `"Yes"`/`"No"` for a yes/no row, the raw cell value(s) for a typed row (text/number/date), `", "`-joined | yes |
| `answerLabels.Q005.S001.A001` | matrix cell S001/A001's readable answer: column label for a checkbox row, `"Yes"`/`"No"` for a yes/no row, the raw cell value for a typed row; offered by the variable picker | yes |
| `answerLabels.Q005.P001` | multi-part part P001's value | yes |
| `answerLabels.Q005.OTHER_VALUE` | the free-text "Other" value | yes |
| `labels.Q005` / `labels.Q005.name` | question text | no |
| `labels.Q005.detail` | question detail | no |
| `labels.Q005.A001` | answer option A001's label | no |
| `labels.Q005.S001` | matrix row / Multi-Part part S001's text | no |
| `labels.G001` / `labels.G001.name` | group name | no |
| `labels.G001.desc` | group description | no |

Per-question-type `answerLabels` resolution (see `resolveAnswerLabels.ts` and its test):

| Question kind | Raw value | `answerLabels.Q` | Nested |
|---|---|---|---|
| single/multi choice | `{A001:true, A003:true}` | `"Blue, Red"` | `.A001` → `"Blue"` |
| choice with "Other" | `{OTHER_VALUE:"custom"}` | `"custom"` | `.OTHER_VALUE` → `"custom"` |
| matrix | `{S001:{A001:true}}` | `""` (a matrix has no single value) | resolved per row, by the row's cell type: checkbox → selected column label(s) (`.S001` → `"Agree"`, `.S001.A001` → `"Agree"`); yes/no → `.S001` → `"Yes"`/`"No"`; text/number/date/time → the raw cell value (`.S001.A001` → `"42"`, a numeric `0` kept). Empty cells omitted; `matrixComposite` resolves each row by its own type |
| multi-part | `{P001:"x", P002:true}` | `"x, Yes"` (each part via its part type: Yes/No, per-point caption or number, else the raw value) | `.P001` → `"x"` |
| yesNo | `true` | option label (`"Yes"`) | — |
| starRating / point5 / point10 | `4` | per-point label if set, else `"4"` | — |
| text / number / date / time | `"42"` / ISO string | `String(value)` (no locale/timezone formatting in v1) | — |
| unanswered | `undefined` | `""` | member access → `undefined` |

`answerLabels.*` obeys the **forward-reference rule** (a question at or after the referring
element's position is rejected at admin-save and not offered by the variable picker), like
`answers.*`. `labels.*` does **not** — it is static survey-structure text that leaks no
participant/answer data, so any question/group label is usable from any field (including
the welcome message, which renders before every question). `validateTextExpressions` takes
a position-filtered list for the `answerLabels.*` / `answers.*` check and the full survey
for `labels.*` existence.

A `labels.*` sub-field that exists but is empty (`{{labels.Q5.detail}}` on a question with
no detail, `{{labels.G1.desc}}` on a group with no description) resolves to `""`; only an
unknown code leaves the token literal.

Each `labels[code]` / nested `answerLabels` node is a `String`-wrapper object (`new String()`
with extra own-properties): `String(value)` in `resolveTextExpressions` unwraps it to the
primary text for the bare `{{labels.Q005}}` form, while member access reads an attached
property. This is the one place the builders step outside plain data; the forbidden-key
rules (`__proto__`/`constructor`/`prototype`) still apply.

## Execution model

Expressions are not compiled as JavaScript. `SafeExpressionInterpreter.ts` parses them
with jsep (a restricted expression-only grammar — no statements, assignment, `new`,
arrow functions, or template literals) and interprets the resulting AST with a
hand-written walker that only implements the operations below. Every path to
`window`/`Function`/`eval`/global scope is unreachable because there is no code path to
it, not because it is pattern-matched and rejected.

Permitted:
- **Roots**: `answers`, `answerLabels`, `labels`, `participant`, `response` only — no other
  identifier resolves to anything (`answerLabels`/`labels` only carry data when the context
  was built with question text/answer-options)
- **Member access**: dotted or bracketed property access on an already-resolved value,
  except `__proto__`, `constructor`, or `prototype` at any depth
- **Operators**: `+ - * / %`, `=== !==`, `> >= < <=`, `&& || !`, `in`, ternary `? :`,
  grouping `()`
- **String methods**: `.includes()`, `.toLowerCase()`, `.toUpperCase()`, `.trim()`,
  `.length`
- **Array methods**: `.includes()`, `.length`
- **Helpers**: `Object.keys(...)`, `Math.round/min/max/abs/floor/ceil(...)`

Not permitted: assignment, `new`, function/arrow-function expressions, template
literals, and any identifier, member, or call outside the list above.

`SafeExpressionInterpreter` exposes both `interpret()` (runtime evaluation) and
`staticCheck()` (structural preflight without evaluating — used for admin-time
validation, e.g. forward-reference checks, before a value even exists to evaluate
against). The two used to hand-copy the same "is this operator/call known" logic; it is
now centralised in shared allowlist checks (`isKnownBinaryOperator`,
`isKnownUnaryOperator`, `isKnownNamespaceCall`, `isKnownMathMethod`) so `interpret()` and
`staticCheck()` cannot silently drift apart.

## Consumers

- **`ConditionEvaluator`** (`SurveyCondition/ConditionEvaluator.ts`) calls
  `evaluateJsExpression` and coerces the result to boolean, fail-safe (element shown) on
  any error or structural invalidity. See
  [survey-conditions.md](survey-conditions.md#behaviour) for full behaviour.
- **`resolveTextExpressions`/`validateTextExpressions`** (`resolveTextExpressions.ts`)
  scan HTML for `{{expression}}` tokens (via a shared, exported token pattern —
  `EXPRESSION_TOKEN_SOURCE`/`createExpressionTokenPattern()` — so the admin app's live
  pill decoration can never drift out of sync with what actually counts as a token),
  evaluate each with `evaluateJsExpression`, and splice the result back in. An unsafe
  expression, a runtime error, or a `null`/`undefined` result leaves the token as literal
  text (fail open — a bad expression never blanks out survey text). The resolved value is
  HTML-escaped by default (`escape: 'html' | 'none'`), since the token scan runs on raw
  HTML before `sanitizeHtml`/DOMPurify — this is what stops an expression's *output*
  becoming a script-injection vector. `validateTextExpressions` structurally checks
  every token without evaluating it: it extracts each predefined-variable reference
  with `extractVariablePaths` (a full jsep-AST walk, so the *entire* member chain is
  captured) and validates it end-to-end with `validateVariablePath`
  (`SurveyCondition/variablePathValidation.ts`) — unknown question/group code, forward
  reference, a path of the wrong depth for the question type, a matrix reference that
  omits the sub-question code, or trailing nonsense segments are all rejected.
  `ConditionValidator.validate` still runs for JS syntax and operator grammar.
  `SurveyValidation.validate` calls `validateTextExpressions` over every
  expression-bearing survey text field (title, welcome/thank-you, group name/desc,
  question text/detail, sub-question text, answer-option labels, legal-notice and
  data-policy text), so an invalid path **blocks publishing** the same way an invalid
  condition does, and is listed in the editor's "Cannot Publish Survey" panel.

- [resolveAnswerLabels.ts](../src/model/service/SurveyExpression/resolveAnswerLabels.ts) —
  `resolveAnswerLabelValue`, `makeStringNode` (the `String`-wrapper node helper)

## Key files

- [SurveyExpression/index.ts](../src/model/service/SurveyExpression/index.ts) — barrel export
- [types.ts](../src/model/service/SurveyExpression/types.ts) — `ExpressionContext`, `ExpressionResult`
- [ExpressionContext.ts](../src/model/service/SurveyExpression/ExpressionContext.ts) — `ExpressionContextBuilder.build()`/`buildEmpty()`
- [ExpressionEvaluator.ts](../src/model/service/SurveyExpression/ExpressionEvaluator.ts) — `evaluateJsExpression`/`isSafeExpression`
- [SafeExpressionInterpreter.ts](../src/model/service/SurveyExpression/SafeExpressionInterpreter.ts) — jsep-based parser + interpreter + static checker
- [resolveTextExpressions.ts](../src/model/service/SurveyExpression/resolveTextExpressions.ts) — `resolveTextExpressions`/`validateTextExpressions`, shared token pattern
