# Template Variables

Three systems substitute `{{...}}` placeholders into admin-authored text using data
collected from a survey participant: email templates (System 2), notify-recipient
strings (System 3), and embedded expressions in survey text (System 4). Systems 2 and 3
share one resolver (`resolveTemplate`) and one context shape (`TemplateContext`), both in
`package/common`. System 4 is different: it evaluates full JS expressions through the
shared engine documented in [survey-expressions.md](survey-expressions.md) — the same
one used by display conditions (System 1, see [survey-conditions.md](survey-conditions.md)).
Conditions and System 4 text expressions share an engine and variable set; they differ
in how they're written (a bare expression vs. one or more `{{...}}` tokens spliced into
text) and how the result is used (a boolean gate vs. spliced-in text).

## Shared context: `TemplateContext`

```ts
interface TemplateContext {
  participant: ParticipantData
  answers: Record<string, unknown>
  projectOwner?: { email: string }
  survey?: { name: string; link?: string }
  project?: { name: string }
}
```

Built by `buildTemplateContext()` (`TemplateContext.ts`), which merges a participant's
custom attributes and root profile fields via `mergeParticipantData()` for the
`participant` container. `projectOwner`/`survey`/`project` are populated only where
meaningful for a given call site — e.g. `survey.link` only for invite/reminder emails,
not for the thank-you email. A container absent from the context simply resolves every
token under it to nothing (or leaves it literal, depending on `onUnresolved` — see below).

Unlike `ConditionContext` (see [survey-conditions.md](survey-conditions.md)), which has
three containers (`answers`, `participant`, `response` — the last for metadata like the
live survey-taking language), `TemplateContext` has no `response` container today — no
`{{...}}` placeholder currently resolves response metadata, only participant data and
question answers.

## Shared resolver: `resolveTemplate`

```ts
resolveTemplate(template: string, context: TemplateContext, options?: {
  escape?: 'html' | 'none'      // default 'html'
  onUnresolved?: 'keep' | 'drop' // default 'keep'
}): string
```

Replaces every `{{dotted.path}}` token with the value at that path in `context`
(plain property traversal — case-sensitive except where a consumer does its own
case-insensitive lookup first, see System 3 below).

- **`escape`**: `'html'` (default) HTML-escapes every resolved value
  (`&`, `<`, `>`, `"`, `'`) before splicing it into the template — literal template text
  is untouched. Use `'none'` only where escaping would corrupt the output (an email
  address list) or the destination is guaranteed not to be HTML.
- **`onUnresolved`**: `'keep'` (default) leaves an unresolvable token as literal text —
  matches System 2/4's behaviour, where an admin/participant should see the token text
  rather than nothing if a variable is genuinely missing. `'drop'` removes it entirely —
  matches System 3's behaviour, where a partially-resolved recipient string must not
  leak literal `{{...}}` text into a "to" address candidate.

## System 2 — Email templates

`package/api/src/model/service/core/ServiceSurveyParticipant/ServiceSurveyCompletionEmail.ts`,
`ServiceSurveyParticipantInvite.ts`, and `ServiceAuthParticipant.ts` each build a
`TemplateContext` via `buildTemplateContext()` and call `resolveTemplate` (default
options — HTML-escaped, unresolved tokens kept literal) on the resolved email template's
`subject`/`body`. Available variables: `{{participant.nameFirst}}`,
`{{participant.<attribute>}}`, `{{answers.<questionCode>}}` (completion emails only —
invite/reminder/registration emails run before any answers exist), `{{survey.name}}`,
`{{survey.link}}` (invite/reminder/registration only), `{{project.name}}`.

`replacePlaceholders.ts` (`package/api/src/model/common/`) is a thin backward-compatible
wrapper kept only for any caller still using the pre-migration flat `{{word}}` syntax —
new code should call `resolveTemplate` directly.

## System 3 — Notify recipients

`notify.basic`/`notify.detailed` (`SchemaSettingSurvey.ts`) are semicolon-separated
strings mixing literal email addresses and `{{...}}` placeholders, resolved by
`resolveNotifyRecipients()` (`package/api/src/model/common/resolveNotifyRecipients.ts`) —
a thin wrapper around `resolveTemplate` (`escape: 'none'`, `onUnresolved: 'drop'`) that
keeps `;`-splitting and email validation local to this file. Available variables:
`{{projectOwner.email}}`, `{{participant.email}}`, `{{participant.<attribute>}}`
(case-insensitive, matching the pre-migration `{P:ATTRIBUTE_x}` lookup),
`{{answers.<questionCode>}}`. Every candidate (literal or resolved) is validated as an
email address and deduplicated case-insensitively before being used.

## System 4 — Embedded expressions in survey text

Five field types may embed one or more `{{expression}}` tokens, each evaluated as a full
JS expression against the same `answers`/`participant`/`response` scope the condition
builder exposes (see [survey-expressions.md](survey-expressions.md) for the engine and
allowlist) — not just a dotted-path lookup:

- Group name/description (`SurveyGroupHeader.tsx`)
- Question text/detail (`SurveyQuestionRenderer.tsx`)
- Subquestion text (matrix/multi-part question types, e.g. `QuestionTypeMatrix.tsx`)
- Answer-option labels (choice question types, e.g. `MultipleChoiceButtons.tsx`,
  `MultipleChoiceCheckbox.tsx`, `MultipleChoiceDropdown.tsx`)
- Thank-you message (`SurveyThankYou.tsx`)

Two extra namespaces are available here (and only here; condition evaluation ignores
them): `answerLabels.<questionCode>` renders an answer as readable prose (selected option
label(s), `", "`-joined; `""` when unanswered) where `answers.*` gives the raw stored
value, and `labels.<questionCode>` / `labels.<groupCode>` echoes static survey text (`.detail`,
`.desc`, `.name`, `.<answerOptionCode>` suffixes). Both obey the same forward-reference
rule as `answers.*`. Full table and per-question-type behaviour:
[survey-expressions.md](survey-expressions.md#answerlabels-and-labels).

For example: `"So you said {{answers.Q001}} earlier — is that still right?"`,
`"You picked {{answerLabels.Q003}}."`, or
`"{{participant.city === "Liverpool" ? "Local" : "Remote"}} respondent"`. Resolution
(`resolveTextExpressions`) happens client-side, in the survey-taking app, scoped to only
questions that appear **before** the current field's position in survey order — the same
forward-reference rule `ConditionValidator` enforces for display conditions, applied
uniformly across all five field types via the admin app's
`useQuestionPositionAvailability` hook. `participant.*` and `response.*` are both
available (unlike Systems 2/3's `TemplateContext`, which has no `response` container).
`survey`/`project`/`projectOwner` are not populated in this context — survey text has no
notion of "the project owner" or a link back to the survey it's already inside.

## Variable picker UI

`VariablePicker` (`package/app/src/appAdmin/component/VariablePicker/VariablePicker.tsx`)
is a shared dropdown that inserts a variable's dotted path into a text field. Wired into:

- `BaseNotifySettings.tsx`, `DefaultableEmailTemplateSettings.tsx` (the actually-rendered
  email-template settings UI) / `BaseEmailTemplateSettings.tsx` — inserts `{{path}}`
  (wrapped) appended to the current field value. These surfaces can be edited at
  project-default level (no fixed survey), so they only offer the fixed, well-known
  `participant.*` (system attributes)/`survey.*`/`project.*`/`projectOwner.*` variables —
  not per-survey custom attributes or `answers.*` question variables.
- `ConditionEditor.tsx`'s code editor mode — inserts the bare path (no `{{...}}`
  wrapper, since conditions are JavaScript, not templates), built from
  `buildParticipantVariableEntries()`/`buildQuestionVariableEntries()`
  (`package/common/src/model/service/SurveyCondition/buildVariableEntries.ts`), scoped to
  this survey's actual questions/participant attributes and the same forward-reference
  rule used elsewhere.
- `useTextExpressionVariablePicker.ts`
  (`package/app/src/appAdmin/component/SurveyEditor/hook/`) — the System 4 counterpart
  for all five embeddable field types: builds position-aware picker entries
  (Participant/Response/Answers groups) plus a `validateTextExpressions` wrapper for a
  given field, on the same `useQuestionPositionAvailability` forward-reference logic
  `ConditionEditor` uses. Wired into the field's `ContentEditor`/`TiptapToolbar` toolbar,
  which also mounts `ExpressionPillExtension.ts` — a live Tiptap decoration rendering
  `{{...}}` tokens as pills as the admin types, built on the same shared token pattern
  (`createExpressionTokenPattern()`) `resolveTextExpressions` uses, so the pill decoration
  can never drift from what actually gets resolved.

## Key files

- `package/common/src/model/service/SurveyCondition/TemplateContext.ts` — `TemplateContext` type, `buildTemplateContext()`
- `package/common/src/model/service/SurveyCondition/resolveTemplate.ts` — the shared resolver (Systems 2/3)
- `package/common/src/model/service/SurveyCondition/buildVariableEntries.ts` — variable-picker enumeration helpers
- `package/common/src/model/service/SurveyCondition/mergeParticipantData.ts` — builds the `participant` container
- `package/api/src/model/common/replacePlaceholders.ts` — legacy flat-key wrapper (System 2, pre-migration callers)
- `package/api/src/model/common/resolveNotifyRecipients.ts` — System 3
- System 4's engine (`resolveTextExpressions`, `ExpressionContext`, the interpreter) lives
  in `SurveyExpression/` — see [survey-expressions.md#key-files](survey-expressions.md#key-files)
- `package/app/src/component/Survey/SurveyQuestionRenderer.tsx`,
  `SurveyGroupHeader.tsx`, `SurveyThankYou.tsx` — representative System 4 render sites
- `package/app/src/appAdmin/component/VariablePicker/VariablePicker.tsx` — the shared picker component
- `package/app/src/appAdmin/component/SurveyEditor/hook/useTextExpressionVariablePicker.ts` — System 4's picker/validation hook
- `package/app/src/appAdmin/component/ContentEditor/ExpressionPillExtension.ts` — live `{{...}}` pill decoration
