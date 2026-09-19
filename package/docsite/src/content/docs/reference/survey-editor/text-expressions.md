---
title: Text Expressions
description: How to embed dynamic values and JavaScript expressions in survey text using {{ }} tokens.
---

A text expression is a `{{ }}` token in survey text. VeySur evaluates it per participant and replaces it with the result.

## Where expressions can be used

The welcome message, group names and descriptions, question text and detail, subquestion text, answer option labels, and the thank-you message. A field may hold more than one token.

## Available variables

Expressions use the same roots as [conditions](/reference/survey-editor/conditional-questions/), plus two specific to text.

| Root | Refers to |
|---|---|
| `answers.<QuestionCode>` | An earlier answer's raw stored value, for calculations |
| `answerLabels.<QuestionCode>` | The same answer as readable text; empty when unanswered |
| `labels.<Code>` | Static text: a question, group, row, or option label |
| `participant.<name>` | A built-in field or a custom [attribute](/reference/survey-editor/participant-attributes/) |
| `response.language` | The language currently being viewed |

See [Variable Paths](/reference/survey-editor/variable-paths/) for addressing matrix cells, multi-part parts, and options.

## Supported operations

Arithmetic, comparisons, the ternary operator (`? :`), and `&& || !`. Strings support `.includes()`, `.toLowerCase()`, `.toUpperCase()`, `.trim()`, `.length`; arrays support `.includes()` and `.length`. Nothing else.

## Restrictions

`answers.*` and `answerLabels.*` can only reference a question before the field they are in (the thank-you message is exempt; the welcome message can reference no answers). `labels.*` has no such restriction. An unsafe or unresolvable expression is left as plain text; check [Preview](/reference/survey-editor/preview/) to confirm every token resolves.

## Examples

```
Hi {{participant.nameFirst}}, thanks for your time.
{{participant.city === "Liverpool" ? "As a local, " : ""}}what did you think?
For "{{labels.Q005}}" you chose {{answerLabels.Q005}}.
```
