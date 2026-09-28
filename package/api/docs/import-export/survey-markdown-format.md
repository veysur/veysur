<!-- cspell:ignore Kundenzufriedenheitsumfrage Allgemein Würden einem Freund empfehlen skimmable -->

# Survey Markdown Format: v1 Specification

Status: specified, not yet implemented. Implementation of `MarkdownFormatHandler`, the
exporter, the importer, and their tests is tracked as a separate future piece of work (see
§7-§8).

## 1. Purpose and scope

This spec defines a plain-text markdown representation of a VeySur survey, so that:

- An LLM can be given (or asked to produce) a single markdown document and have it
  become a real survey.
- An existing survey can be exported to markdown, reviewed or edited as plain text by
  a human, and re-imported.

**Round-trip is the goal, not one-way import.** Every rule in this document specifies
both directions: what the exporter produces (deterministic) and what the importer
accepts (canonical form, plus any normalization). A hand-authored document that omits
optional fields must still import correctly; an exported document must always be
byte-identical for the same survey, so round-trip tests are meaningful.

**v1 covers simple question types only**: `text`, `number`, `checkbox`, `dropdown`,
`yesNo`, `starRating`, `point5`, `point10`, `date`, `time`, `dateTime`. Explicitly out
of scope for v1 (see §6 for how each will slot in later):

- Matrix types (`matrixText`, `matrixNumber`, `matrixDate`, `matrixTime`,
  `matrixDateTime`, `matrixCheckbox`, `matrixYesNo`) and multi-part types
  (`multiPartText`, `multiPartNumber`, `multiPartYesNo`, `multiPartStarRating`,
  `multiPartPoint5`, `multiPartPoint10`).
- `imageSelect`, `ranking`, `surveyLangSelect`, `button`.
- `condition`/`conditionReferences` (branching/skip logic).
- `{{expression}}` embedding in text fields.

A v1 document has no way to express any of the above. An importer encountering a
question `type:` outside the v1 list, or a `condition:` line, must reject the document
with a clear error rather than silently dropping the unsupported content: see §4.

**Relationship to per-field content formatting.** This format is a **structural
container only**. It says nothing about how question text, descriptions, or messages
are rendered: that is owned entirely by the per-survey content-format settings
(`htmlAllowed`/`markdownAllowed`/`scriptTagsAllowed`, resolved via
`resolveContentFormat()` and rendered via `renderContent.ts`). A markdown
survey document's text fields (question `text`/`detail`, group `name`/`desc`,
`welcome.message`, `thankYou.message`) are markdown **because that survey already
resolves to markdown content format** for those fields, not because the whole-survey
document format implies it. Full reconciliation is in §5.

## 2. v1 field/attribute inventory

### 2.1 Survey-level fields in scope

| Field | Type | Notes |
|---|---|---|
| `title` | `L10n` | Survey title |
| `welcome.message` | `L10n` | Welcome screen text |
| `thankYou.message` | `L10n` | Thank-you screen text |
| `thankYou.link.url` / `thankYou.link.text` | `L10n` / `L10n` | Optional redirect link |
| `language.default` | `string` | Default language code |
| `language.options` | `string[]` | Enabled language codes |

Everything else on `SurveyInterface` (`presentation`, `participant`, `data`, `access`,
`dataPolicy`, `legalNotice`, `schedule`, `notify`, `stats`, `content`) is **out of
scope for v1**: these are project/deployment/behavioural settings, not survey
*content*, and are not represented in the markdown document at all. An importer
creates a new survey (or updates an existing one) leaving these fields at whatever
default/inherited value `Survey`'s constructor and the target project already apply;
the exporter never emits them.

### 2.2 Group-level fields in scope

| Field | Type | Notes |
|---|---|---|
| `code` | `string` | Stable identifier (e.g. `G001`), auto-generated if omitted on import |
| `name` | `L10n` | Group heading |
| `desc` | `L10n` \| `null` | Optional group description |

`attributes` (only `condition` exists at group level today) is out of scope per §1.

### 2.3 Question-level fields, by v1 type

Common to every v1 question type:

| Field | Required? | Notes |
|---|---|---|
| `code` | Auto-generated if omitted | Stable identifier (e.g. `Q001`) |
| `type` | Yes | One of the 11 v1 types |
| `text` | Yes (may be empty string) | `L10n` |
| `detail` | No | `L10n` \| `null`; help text shown under the question |
| `attributes.required` | No (defaults `true`) | `boolean`, applies to all question types |

Type-specific `attributes` (sourced from `attributeMeta/attributes/*.ts`, cross-checked
against `questionAttributeConfig.ts`):

| Attribute | Applies to (v1 types) | Shape | Default |
|---|---|---|---|
| `inputSize` | `text` | `'small' \| 'medium' \| 'large'` | `'small'` |
| `lengthMinMax` | `text` | `{ min: number, max: number }` (`0` = no limit) | `{ min: 0, max: 0 }` |
| `numberMinMax` | `number` | `{ min: number, max: number }` (`0` = no limit) | `{ min: 0, max: 0 }` |
| `numberNegAllowed` | `number` | `boolean` | `false` |
| `choiceMinMax` | `checkbox`, `dropdown` | `{ min: number, max: number }` (`0` = no limit) | `{ min: 0, max: 0 }` |
| `choiceOther` | `checkbox`, `dropdown` | `boolean`: adds a free-text "Other" option | `false` |
| `choiceRandomise` | `checkbox`, `dropdown` | `boolean`: randomise answer-option order at render time | `false` |

`yesNo`, `starRating`, `point5`, `point10`, `date`, `time`, `dateTime` carry only the
common `required` attribute in v1: no type-specific attributes apply to them per the
attribute registry.

**Children, by type:**

- `checkbox`, `dropdown`: one or more `SurveyAnswerOption` (`code`, `label: L10n`).
  `image` is out of scope for v1 (belongs to `imageSelect`, itself deferred).
- `yesNo`, `starRating`, `point5`, `point10`, `date`, `time`, `dateTime`, `text`,
  `number`: no answer options in v1 (their answer sets are implicit in the type, or
  free-form).
- **Subquestions** (`SurveySubquestion`: `code`, `type`, `text`, `detail`,
  `attributes`) belong to matrix/multi-part composite questions only: out of scope
  for v1 entirely, not just their attributes.

## 3. Markdown grammar

The grammar below was derived by drafting four worked examples first (§3.5) and
generalizing only the rules those examples actually needed: no syntax exists in this
grammar that isn't exercised by at least one example.

### 3.1 Document shape

```
---
spec: v1
language:
  default: en
  options: [en, de]
---

# <Survey Title>

> <Welcome message>

## <Group Name>

<Group description, optional>

### Q001 · text
<Question text>

*<Question detail, optional>*

- required: true
- inputSize: medium

---

### Q002 · checkbox
<Question text>

- required: true
- choiceMinMax: { min: 1, max: 2 }
- choiceOther: false
- choiceRandomise: false

Options:
- [ ] A001 · <Option label>
- [ ] A002 · <Option label>

## <Next Group Name>
...

---

## Thank you

<Thank-you message>

[<Thank-you link text>](<Thank-you link url>)
```

### 3.2 Front matter (YAML): survey-level metadata

A YAML front-matter block is **required** and always the first thing in the document.
It carries only non-prose metadata: never anything that is itself L10n prose content:

```yaml
---
spec: v1
language:
  default: en
  options: [en, de]
---
```

- `spec` (required): version marker, exact string `v1` for this spec. See §4.
- `language.default` (required): default language code.
- `language.options` (required): array of enabled language codes; must include
  `language.default`.

Front matter was chosen over inline markdown for this metadata because it is
structured/typed data (a version tag, a list of codes), not prose: mixing it into
headings or a bullet list read worse in the drafted examples and it has no natural
place in the document body.

### 3.3 Headings

- `#` (H1), exactly one, immediately after front matter: the survey `title`
  (default-language shorthand: see §3.6). A blockquote (`> ...`) directly under the H1
  is the `welcome.message`, and is optional (omit the blockquote entirely if there is
  no welcome message).
- `##` (H2): one per question group, in document order == group sort order. The text
  after `##` is the group `name`; a plain paragraph immediately following (before the
  first `###`) is the group `desc`, and is optional.
- `###` (H3): one per question, in document order == question sort order within its
  group. Format: `### <code> · <type>`: see §3.4.
- A literal `## Thank you` heading (this exact text, case-sensitive, English, always: it
  is a document delimiter, not L10n content) marks the thank-you section: the
  paragraph beneath it is `thankYou.message`, and an optional trailing markdown link
  `[text](url)` is `thankYou.link`. This section is optional; omit it entirely (heading
  included) if the survey has no thank-you message and no thank-you link.

Heading levels were chosen over a flatter numbered-list structure because groups and
questions naturally nest under a survey the way sections nest under a document title;
this read far more naturally in the drafted examples than a list-based scheme, and
gives each question its own addressable anchor.

### 3.4 Question blocks

```
### <code> · <type>
<question text, one or more paragraphs>

*<question detail>*

- <attributeId>: <value>
- <attributeId>: <value>

Options:
- [ ] <code> · <label>
- [ ] <code> · <label>
```

- **Heading line** `### <code> · <type>`: `<code>` is the question's stable `code`
  (e.g. `Q001`); `<type>` is one of the 11 v1 type strings verbatim (`text`, `number`,
  `checkbox`, `dropdown`, `yesNo`, `starRating`, `point5`, `point10`, `date`, `time`,
  `dateTime`). The ` · ` separator (middle dot, U+00B7, surrounded by single spaces) was
  chosen over a colon or pipe because both of those characters collide with markdown
  table/link syntax in some editors; middle dot does not and reads cleanly.
- **Question text**: the paragraph(s) immediately after the heading line, up to the
  first blank-line-delimited block that matches the detail/attributes/options syntax
  below. This is `text` (L10n content: see §3.6 for multi-language).
- **Detail** (optional): a single paragraph wrapped entirely in `*...*` (markdown
  emphasis), immediately after the question text. Chosen deliberately as a visual
  distinguisher from body text, since `detail` is help/hint text, not the question
  itself; omit entirely if `detail` is `null`.
- **Attributes** (optional): a flat bullet list, one `- <attributeId>: <value>` line
  per non-default attribute. `<attributeId>` is the exact attribute ID from
  `attributeMeta/constants.ts` (§2.3): never a UI label. `<value>` is:
  - `true`/`false` for booleans.
  - a bare number or string for scalars.
  - `{ min: <n>, max: <n> }` for the `MinMax`-shaped attributes (`lengthMinMax`,
    `numberMinMax`, `choiceMinMax`): flow-style YAML/JSON-like inline object, chosen
    because it is unambiguous and short, and mirrors the shape already used in
    `AttributeMeta.initialValue`.

  **Only non-default attributes are emitted** (see §4: the exporter never writes an
  attribute whose value equals `AttributeMeta.initialValue`, keeping typical documents
  short). `required: true` is the default for every question type, so an ordinary
  required text question emits *no* attributes block at all. The importer applies each
  listed attribute's `initialValue` for anything not listed.
- **Options** (checkbox/dropdown only): a literal `Options:` line followed by a
  markdown task-list, `- [ ] <code> · <label>` per answer option, in document order ==
  answer-option sort order. The `[ ]` checkbox markup carries no semantic meaning in
  v1 (it is not a "default checked" indicator: v1 has no concept of pre-filled
  answers): it was chosen purely because it is what every markdown renderer already
  displays as a clean option list, and reads immediately as "these are the choices"
  without inventing new syntax. Always unchecked on export; the importer ignores the
  checked state.
- A horizontal rule (`---`) separates consecutive question blocks within a group,
  purely for human readability; the importer treats it as insignificant whitespace
  (see §4): question boundaries are determined by `###` headings, not by `---`.

### 3.5 Worked examples

The four examples below are the source the grammar rules in §3.1–§3.4 were derived
from; they are the normative reference for "what does canonical output look like",
not just illustrations.

**Example A: simple satisfaction survey (single language, no optional fields):**

```markdown
---
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
```

**Example B: mixed question types with non-default attributes:**

```markdown
---
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
- numberNegAllowed: false

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
```

**Example C: multi-language content (see §3.6 for the escape-hatch grammar):**

```markdown
---
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
```

**Example D, edge case: empty/optional fields (no detail, no group description, no
thank-you section, an intentionally empty question text):**

```markdown
---
spec: v1
language:
  default: en
  options: [en]
---

# Untitled Survey

## G001

### Q001 · text
```

This validates that a question with genuinely empty `text` (`''`, not `null`: `text`
is always present, per §2.3) serializes as a heading line with nothing but a blank line
before the next boundary, and that the importer must not treat a blank line here as an
error.

### 3.6 Multi-language content

L10n fields store a plain `{ langCode: string }` map that is commonly **partially
filled** (not every language has a value for every field). The grammar needs a shape
that (a) stays unobtrusive for the common single-language case and (b) can express a
partial map exactly, including "no value for this language" as distinct from "empty
string for this language".

**Default-language shorthand**: every markdown position that represents an L10n field
(survey title, welcome/thank-you message, group name/desc, question text/detail,
answer-option label) is written *once*, unprefixed, and is understood as the value for
`language.default`. This is what every example in §3.5 except C uses, and it is the
only form emitted when a survey has a single language or when only the default
language is populated for that field.

**Multi-language escape hatch**: for any field where a non-default language has a
populated value, an `::lang[<code>] ... ::end` block immediately follows the
default-language content, repeating the *same markdown construct* (the same heading
level, the same bullet, the same paragraph) with that language's value. Rationale for
this shape over "repeat the whole document per language": repeating whole sections
would force every question's default-language content to be re-typed adjacent to a
translation, doubling document length even for single-field translations, and would
make "this field has no translation for `de`" ambiguous with "this field wasn't
reached yet". The block-per-field-per-language form keeps the default-language
document skimmable on its own and makes partial-population explicit: a language
present in `language.options` but with no `::lang[xx]` block under a given field means
that field has no value for that language (`L10n` key absent, not `''`).

An L10n field with an **explicit empty string** for a non-default language (distinct
from "absent") is written as an empty `::lang[<code>]` block (heading/paragraph with no
content before `::end`): this is exercised in §6's validation pass, not in the
worked examples above, since it did not arise naturally in any of the four scenarios
drafted; the rule is stated here for completeness and must be covered by an importer
test before implementation.

## 4. Round-trip and versioning contract

**Determinism.** The exporter is a pure function of the `Survey` model: same survey →
byte-identical markdown, always. This means the exporter has one canonical
serialization for every value (e.g. attribute bullet order follows a fixed list per
question type, not the iteration order of the `attributes` object; only non-default
attributes are ever emitted: see §3.4).

**Import strictness: canonical form is accepted; a documented set of variations
is normalized; everything else is rejected with a clear per-line error:**

| Input variation | Importer behaviour |
|---|---|
| Attribute bullets in a different order than canonical | Normalize (order is not semantic) |
| Missing optional fields (`detail`, group `desc`, thank-you section, non-default attributes) | Normalize: use type default / `null` |
| Extra blank lines between blocks, or a missing `---` divider between questions | Normalize (§3.4: `---` is insignificant whitespace) |
| An attribute bullet with an ID not in that question type's applicable set (§2.3) | **Reject**: e.g. `inputSize` on a `checkbox` question is an error, not a silent drop |
| A `type:` outside the 11 v1 types (including matrix/multiPart/`imageSelect`/`ranking`/`surveyLangSelect`/`button`) | **Reject**: clear error naming the unsupported type and pointing at this spec's version boundary (not a v1 concept) |
| A `condition:` line anywhere | **Reject**: same reasoning; branching does not exist until a later spec version |
| A raw `{{expression}}` token inside question/group text | **Passed through verbatim, uninterpreted**: v1 does not parse or evaluate it; it round-trips as literal text. This is explicitly *not* the same as expression support (§6): it simply means v1's grammar must not corrupt or strip a `{{...}}` substring it doesn't understand, since a later spec version needs these to have survived any v1-era round-trip untouched |
| Missing or non-`v1` `spec:` front-matter value | **Reject** for a value the importer doesn't recognise (e.g. `v2` when only v1 support is implemented: "upgrade or reject" per the versioning rule below); **reject** for a missing `spec:` key entirely (no implicit version) |
| Duplicate question/group `code` | **Reject**: same uniqueness rule the model already enforces |

**Versioning.** The front-matter `spec:` key is the version marker. v1 importers
recognise only `spec: v1` and reject anything else outright (see table). A future v2
importer reads `spec:` and dispatches to the matching parser generation, so a v1
document remains valid input to a v2-capable importer without modification: v2 only
*adds* grammar (matrix/multiPart blocks, a `condition:` attribute line, live
`{{expression}}` evaluation), it does not change what a `spec: v1` document means.
This is why §3's grammar must not paint itself into a corner: see §6.

## 5. Reconciliation with per-field content formatting

This format and the per-field content-format settings (`resolveContentFormat()`,
`renderContent.ts`) are separate, compatible layers:

- **This document (whole-survey markdown) is a structural container.** It decides
  where a survey's title, groups, questions, and answer options sit relative to each
  other, and how attributes/metadata are written down as plain text. It has no opinion
  on how rich text *inside* a field is rendered.
- **The content-format settings decide what's inside an L10n field.** A survey with
  `markdownAllowed: true` (the project default) stores question `text`/`detail`, group
  `desc`, and welcome/thank-you messages as markdown source, rendered via
  `renderContentToSafeHtml()`. A survey with `htmlAllowed: true` and
  `markdownAllowed: false` stores those same fields as HTML.

**Consequence for this spec**: when this format's exporter writes a question's `text`
into a `###` block (§3.4), it writes that field's stored value **verbatim**, whatever
format it is already in: it does not re-render, re-interpret, or convert it. If the
survey's resolved content format is `markdown`, the question text appearing under a
`###` heading is itself markdown prose, and a markdown renderer processing the whole
document will render it correctly "for free" as a side effect, not because this format
defines any text-rendering rules of its own. If the survey's resolved content format is
`html` or `plain`, the stored value (HTML markup, or escaped plain text respectively)
is still written verbatim into the same document position: a `plain`-format survey
would round-trip cleanly through this spec's grammar even though its content doesn't
look like "real" markdown prose when viewed. **This spec never validates or blocks on
content format**: that enforcement already happens at publish time via
`SurveyValidation`'s `validateContentFormat` check, independent of import/export.

One explicit non-goal: this spec's importer/exporter do not read or write
`content.htmlAllowed`/`markdownAllowed`/`scriptTagsAllowed` at all (§2.1: `content` is
out of scope survey-level fields). Those settings are a property of the *survey as a
whole* set independently in the settings UI; a markdown import creates/updates
questions and groups without touching them.

## 6. Extension points for deferred features

One paragraph per deferred v1 feature, sketching where it slots into this grammar
later without requiring a v1 document rewrite:

- **Matrix and multi-part types.** A matrix/multi-part question adds a nested list of
  subquestions under its `###` block, parallel to how `checkbox`/`dropdown` already
  nest an `Options:` list (§3.4): most naturally a `Subquestions:` block using the
  same `- <code> · <label>` shape, with subquestion-level `attributes` following the
  same bullet-list convention as question-level attributes. Because the current
  grammar already treats "a labelled block after the attributes list" as an extension
  point (only `Options:` exists today, for exactly two types), adding `Subquestions:`
  as a sibling block for a new set of `<type>` values is additive: a v1 parser
  encountering `Subquestions:` under a v1-only type still hits the existing type-check
  rejection (§4) rather than a grammar collision.
- **`condition`/branching.** Slots in as a `- condition: <expression>` attribute
  bullet under the same flat attribute list already used for `required`/`choiceMinMax`
  etc. (§3.4), evaluated the same way `SurveyQuestionGroup.condition`/
  `SurveyQuestion.condition` are evaluated today via `ConditionParser`. No new block
  type needed: the attribute-bullet mechanism already generalizes to any
  `attributeId: value` pair; `condition` merely needs to move from the "rejected
  attribute ID" list in §4's import-strictness table to the "recognised" list in a v2
  spec, with `<expression>` being the raw `SurveyExpression`-parseable string, quoted
  if it contains `:` or other bullet-list-sensitive characters.
- **`{{expression}}` embedding.** Already required to round-trip verbatim through v1
  as opaque text (§4's table) specifically so this extension is non-breaking: a v2
  importer/exporter simply starts *evaluating* (for preview/validation purposes) tokens
  that a v1 importer already preserved untouched inside `text`/`detail` L10n content.
  No grammar change is needed at all for this one: it was never a structural feature,
  only an interpretation one, so the escape-hatch requirement in §4 is the entire
  extension point.

## 7. Pre-implementation validation checklist (Step 6)

Before this spec is treated as final and implementation begins, run through:

1. Hand-convert each of the four worked examples (§3.5) into the patch-batch shape
   `createSurveyOperations.ts`'s factories consume (`{ type, action, id, data }` via
   `validateAndBuffer`: see `questionOperations.ts`'s `addQuestion` for the reference
   shape) and confirm every field the grammar claims to carry maps onto an existing
   `SurveyQuestion`/`SurveyQuestionGroup`/`SurveyAnswerOption` constructor field with no
   new model getters required.
2. Confirm the reverse direction: for each v1 field, confirm a getter/property already
   exists on `Survey`'s collections (`survey.groups`, `survey.questions`,
   `question.answerOptions`) sufficient to read back every value the exporter needs:
   no new `Survey` model methods required for v1.
3. Confirm the new format fits `EntityHandlerRegistry`/`format/` as a
   `MarkdownFormatHandler` implementing `FormatHandlerInterface` (`serialize`/`parse`
   against a `Readable`, alongside `VsstFormatHandler`/`JsonFormatHandler`): not a
   parallel import/export pathway. `SurveyEntityHandler` remains the entity handler;
   only a new format handler is added to `FormatRegistry`.
4. Sanity-check §3.6's multi-language grammar against a real 2+-language survey
   (`language.options: [en, de]` or similar) where at least one field (e.g. a single
   answer-option label) is populated for `en` only: confirm the exporter omits any
   `::lang[de]` block for that field, and that re-importing produces an `L10n` value
   with only the `en` key present, not a `de` key with an empty string.
5. Confirm §3.4's "only non-default attributes are emitted" rule against
   `AttributeMeta.initialValue` for every v1-applicable attribute in §2.3: verify each
   value programmatically rather than by inspection, since a silent drift between this
   table and the registry would make exported documents non-canonical.

## 8. Deliverable status

This document covers: §2 (inventory), §3 (grammar + worked examples), §4
(round-trip/versioning), §5 (content-format cross-reference), §6 (deferred-feature
extension sketch). §7 is the outstanding pre-implementation step; implementation of
`MarkdownFormatHandler`, the exporter, the importer, and their tests is a separate future
piece of work, started only after §7 is complete.
