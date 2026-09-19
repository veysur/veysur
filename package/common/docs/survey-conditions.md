# Survey Conditions

Conditions control the visibility of survey questions and groups based on JavaScript expressions that evaluate to true or false.

## Condition Syntax

Conditions are JavaScript expressions that return a boolean value. Empty conditions or evaluation errors default to showing the element (fail-safe).

Every reference is rooted at one of three container objects: `answers` (question
answers), `participant` (participant data), or `response` (metadata about the
response itself, currently just the live survey-taking language). There is no
bare/unprefixed form — `Q001` on its own is not a valid reference; it must be written
`answers.Q001`.

Conditions are evaluated by the same shared interpreter documented in
[survey-expressions.md](survey-expressions.md), which also powers `{{expression}}`
tokens embedded in survey text — see [template-variables.md](template-variables.md) for
that consumer. The two are otherwise unrelated: a condition is a bare expression that
gates visibility (this doc), while a text expression is one or more `{{...}}` tokens
spliced into rendered text (template-variables.md). Email templates and notify
recipients (Systems 2/3 in that doc) use a separate, simpler `{{dotted.path}}`
substitution unrelated to either.

## Available Variables

### Participant Variables

Participant variables are not a fixed list — they are generated per survey from that
survey's participant attributes, addressed as `participant.<name>`:

| Variable                 | Description              |
|---------------------------|---------------------------|
| `participant.nameFirst`   | Participant first name   |
| `participant.nameLast`    | Participant last name    |
| `participant.email`       | Participant email        |
| `participant.language`    | Participant's stored profile language (see [`response.language`](#response-variables) for the live, in-survey language) |
| `participant.token`       | Participant token        |

Any custom attribute defined for the survey (e.g. `participant.city`,
`participant.memberId`) is also available by name. This includes attributes flagged
**internal** — internal only hides a field from the public registration form, it does
not restrict it from being referenced in a condition.

`participant.*` is a single flat namespace — there is no `participant.attribute.<name>`
split between built-in and custom fields. If a custom attribute shares a name with a
built-in field (`nameFirst`, `nameLast`, `email`, `language`, `token`), the built-in
field wins; the attribute editor rejects custom attribute names that collide with a
built-in field name.

#### Participant Variable Source

At design time, the condition editor's variable list comes from merging
`SURVEY_PARTICIPANT_SYSTEM_ATTRIBUTE_METADATA` (`../src/model/constructor/SurveyParticipant/systemAttributes.ts`)
with the survey's `SurveyParticipantAttribute` definitions.

At survey-taking runtime, the actual values are fetched via `GET /survey-participant/:surveyId/me`
and merged into a single object by `mergeParticipantData()`
(`../src/model/service/SurveyCondition/mergeParticipantData.ts`): custom attributes are
spread first, then root profile fields (`nameFirst`, `nameLast`, `email`, `language`,
`token`) are spread on top, so a root field wins if it collides with a custom attribute of
the same name. That merged object becomes the `participant` container unchanged — the
live, currently-selected in-survey UI language is exposed separately as
[`response.language`](#response-variables), not by overriding
`participant.language` (see `Survey.tsx`).

### Question Answers

Reference previous question answers by their question code, rooted at `answers`
(e.g., `answers.Q001`).

### `response` Variables

`response` is metadata about the response itself — deliberately a *separate*
container from `answers` (which is keyed by question code), so a question can be coded
anything, including `language`, without ever colliding with a `response` field of the
same name.

| Variable | Description |
|----------|--------------|
| `response.language` | The language the participant is currently viewing/answering the survey in (the live content-language selection) — persisted on the `SurveyResponse` document once saved. |

`response.language` is distinct from `participant.language`, which always reflects
the participant's *stored profile* language preference and is never overridden by the
in-survey language selector. The two commonly agree but can diverge — e.g. a participant
whose stored profile language is `en` opens a survey link in Chinese and switches the
in-survey selector to `zh`: `participant.language` stays `en`, `response.language`
becomes `zh`. Use `participant.language` to target who the participant *is*; use
`response.language` to target what language *this response* is being given in.

Unlike `participant.*` (survey-admin-extensible via custom attributes),
`response.*` is a fixed, system-defined set — see
`responseFields.ts` (`RESPONSE_FIELD_METADATA`). Referencing an unknown
`response.*` field is a validation error, not silently accepted.

### Answer Options

For multiple choice questions, individual options are available as booleans using dot
notation `answers.{QuestionCode}.{OptionCode}` (e.g., `answers.Q001.A001` returns
`true` if selected).

When a choice question has the **Other** option enabled, two additional pseudo-codes are available:

| Variable | Type | Description |
|----------|------|-------------|
| `answers.{QuestionCode}.OTHER` | `boolean` | `true` if the participant selected the "Other" option |
| `answers.{QuestionCode}.OTHER_VALUE` | `string` | The value the participant entered in the Other field |

### Predefined Answer Options (Yes/No, Rating Scales)

Question types with a fixed, predefined set of answer options expose the same
`answers.{QuestionCode}.{OptionCode}` dot notation as choice questions, evaluating to a boolean:

| Question Type | Predefined Codes |
|----------------|-------------------|
| Yes/No         | `YES`, `NO`       |
| Star rating    | `P1`–`P5`         |
| Point 5 scale  | `P1`–`P5`         |
| Point 10 scale | `P1`–`P10`        |

For example, `answers.Q002.YES` is `true` if the participant answered "Yes" to `Q002`,
and `answers.Q003.P4` is `true` if `Q003` (a rating question) was answered `4`. These
are rewritten by the condition evaluator into literal comparisons against the question's
raw value (e.g. `answers.Q002 === true`), so direct-value conditions like
`answers.Q002 === true` keep working unaffected. Each question type's predefined
options are defined alongside its type definition
(`../src/model/constructor/Survey/questionType/`) and registered in a common
questionType registry, so a future dynamically-loaded custom question type can supply its
own options the same way.

### Matrix Question Cells

For matrix questions, individual cells are accessible as:
`answers.{QuestionCode}.{SubquestionCode}.{AnswerOptionCode}` (e.g., `answers.Q001.S001.A001`)

The value type depends on the subquestion type (number, text, boolean, etc.).

### Multi-Part Question Parts

For Multi-Part questions, individual parts are accessible as:
`answers.{QuestionCode}.{PartCode}` (e.g., `answers.Q001.P001`) — two segments after
the `answers.` root, not three, since Multi-Part has no answer-option axis to address
alongside the part.

This is syntactically identical to the choice-question `answers.{QuestionCode}.{OptionCode}`
form (see [Answer Options](#answer-options) above); the parser cannot distinguish them
by shape alone, so `ConditionValidator` branches on whether the referenced question is a
Multi-Part type (`isMultiPartQuestionType`) and validates the second segment against the
question's `subquestions` (parts) instead of its `answerOptions`.

The value type depends on the part's enforced type — the same fixed type shared by every
part in the question (see [Multi-Part Question Types](../../../docs/question-types/multi-part.md)).

### Bare Answer-Option-Code Literals

An answer-option code used as a *value* (rather than a `answers.` property path) stays
unprefixed — it is a string constant, not a container reference. For example:
`answers.Q001 === A001` compares Q001's stored answer against the constant `A001`. The
visual condition builder always emits either quoted literals (`"A001"`) or
`answers.<code>` dot-notation property access; a bare unquoted code like this only
appears in hand-typed code-mode conditions.

## Question Type Values

| Question Type                              | Value Type                                  |
|--------------------------------------------|---------------------------------------------|
| Text                                       | `string`                                    |
| Number                                     | `number`                                    |
| Multiple choice                            | `string[]` (array of selected option codes) |
| Multiple choice — Other selected           | `answers.{QuestionCode}.OTHER` → `boolean`; `answers.{QuestionCode}.OTHER_VALUE` → `string` |
| Yes/No                                     | `boolean`                                   |
| Star rating                                | `number` (1-5)                              |

> **Note:** Multiple choice questions always return an array of selected option codes, regardless of whether the question allows single or multiple selections. This ensures data compatibility if a question's selection limit is later modified. Use `.includes()` to check if a specific option was selected.

## Examples

```javascript
// Matrix - show if a specific numeric cell exceeds a threshold
answers.Q001.S001.A001 > 100

// Matrix - show if a checkbox cell is checked
answers.Q001.S002.A002 === true

// Matrix - show if a text cell matches a value
answers.Q001.S003.A001 === "yes"

// Multiple choice - show if option A001 was selected
answers.Q001.includes("A001")

// Numeric comparison - show if rating is above 3
answers.Q002 > 3

// Combined logic - show if A001 selected AND rating above 3
answers.Q001.includes("A001") && answers.Q002 > 3

// Participant variable - show only for French participants
participant.language === "fr"

// Custom participant attribute - show only for participants in Liverpool
participant.city === "Liverpool"

// Multiple selections - show if both A001 and A002 were selected
answers.Q003.includes("A001") && answers.Q003.includes("A002")

// Check number of selections
answers.Q003.length >= 2

// Other option - show follow-up if participant selected "Other"
answers.Q001.OTHER

// Other value - show follow-up if participant typed a specific phrase
answers.Q001.OTHER_VALUE === "something else"
```

## Validation Rules

- **No forward references**: Conditions can only reference questions that appear before the current position
- **Question existence**: Referenced question codes must exist in the survey
- **Option existence**: Answer option codes (e.g., `answers.Q001.A001`) must reference valid options for that question. `OTHER` is accepted whenever it appears in the question's answer option list (i.e. the question has choiceOther enabled); `OTHER_VALUE` is accepted when the question has the Other option enabled.

### Execution Model

Conditions are not compiled as JavaScript. They are parsed and interpreted by the
shared `SafeExpressionInterpreter` — see [survey-expressions.md](survey-expressions.md#execution-model)
for the full allowlist (permitted roots/operators/methods) and why every path to
`window`/`Function`/`eval`/global scope is unreachable by construction.

## Behaviour

- **Empty condition**: Element is always shown
- **Evaluation error**: Element is shown (fail-safe)
- **Structurally invalid condition**: Element is shown (fail-safe) — see below
- **Group condition**: Hides all questions in that group when false

## Structural Change Detection

A condition can be broken by an edit made *elsewhere* in the survey, not just by editing
the condition itself. The following structural edits are checked before they commit:

- Removing an answer option that a condition references (`answers.Q001.A001`)
- Removing a subquestion that a matrix-cell condition references (`answers.Q001.S001.A001`)
- Changing a question's type in a way that makes its answer options or subquestions no
  longer referenceable (e.g. changing a choice question to a text question)
- Reordering a question, or a whole question group, past a question/group whose
  condition references it — this would create a disallowed forward reference

If an edit is detected as impacted, the admin is warned and asked to confirm before the
change commits. **A broken condition is never auto-deleted** — the `condition` string is
left in place, now flagged invalid, so the admin can see and fix it. Silently deleting a
condition would be a worse surprise than leaving it visibly broken.

Validity is always computed live from the current survey structure — there is no
persisted "is this condition broken" flag. `ConditionValidator.validate` already existed
for this exact structural check (forward references, unknown codes, etc.); the new
pieces are the reverse lookup ("what conditions reference this code") needed to run that
check *before* a structural edit commits, and the fail-open behaviour at survey-taking
time.

At survey-taking time, a structurally invalid condition is treated exactly like an empty
one: the gated element is always shown. This extends the existing runtime fail-open
behaviour (an evaluation error shows the element) to also cover structural invalidity —
see `ConditionEvaluator.evaluateIfValid`.

### `conditionReferences` cache field

`conditionReferences: string[] | null` sits alongside `condition` on both
`SurveyQuestion` and `SurveyQuestionGroup`. It caches the raw codes a condition
references, **stored without their container prefix** (e.g. `['Q001', 'Q001.A002']`, not
`['answers.Q001', 'answers.Q001.A002']`), so building the reverse lookup doesn't
require re-parsing every condition's JavaScript string.

- Populated **lazily** — the admin app backfills it for any pre-existing condition the
  first time a survey loads (`useSurveyEditor`'s backfill effect). There is no migration
  script.
- Always **rebuilt in full**, never patched independently — `updateCondition()` is the
  only place `condition` is set on either entity, and it recomputes
  `conditionReferences` from the new condition string in the same call. It cannot drift
  out of sync with `condition`.

## Key Files

`ConditionEvaluator`/`ConditionValidator` call into the shared `SurveyExpression`
module for evaluation and context-building — see
[survey-expressions.md#key-files](survey-expressions.md#key-files) for those.

- [SurveyCondition/index.ts](../src/model/service/SurveyCondition/index.ts) — Condition evaluation entry point
- [ConditionEvaluator.ts](../src/model/service/SurveyCondition/ConditionEvaluator.ts) — Core evaluation logic, including `evaluateIfValid`
- [ConditionParser.ts](../src/model/service/SurveyCondition/ConditionParser.ts) — Classifies variables referenced in a condition string
- [ConditionReferenceIndex.ts](../src/model/service/SurveyCondition/ConditionReferenceIndex.ts) — Reverse lookup: which conditions reference a given code
- [SurveyStructuralChangeImpact.ts](../src/model/service/SurveyCondition/SurveyStructuralChangeImpact.ts) — Pre-edit impact checks for answer option/subquestion removal, question type change, and question/group reordering
- [mergeParticipantData.ts](../src/model/service/SurveyCondition/mergeParticipantData.ts) — Merges custom attributes and root profile fields into the participant variable object
- [responseFields.ts](../src/model/service/SurveyCondition/responseFields.ts) — Fixed, system-defined `response.*` field list
- [predefinedAnswerOptions.ts](../src/model/service/SurveyCondition/predefinedAnswerOptions.ts) — Builds addressable option codes and dot-notation literal rewrites for question types with predefined answer options (yesNo, starRating, point5, point10)
- [questionType/index.ts](../src/model/constructor/Survey/questionType/index.ts) — Registry of question type definitions, including each type's predefined answer options
