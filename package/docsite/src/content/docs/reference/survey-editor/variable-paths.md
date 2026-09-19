---
title: Variable Paths
description: How to address each question type's answer in a condition or text expression, across the answers, answerLabels, and labels namespaces.
---

A variable path names a question by its code, then optionally drills into an answer option, matrix row, or multi-part part. The same paths work in [conditions](/reference/survey-editor/conditional-questions/) and [text expressions](/reference/survey-editor/text-expressions/).

Three namespaces expose the same structure. `answerLabels.*` and `labels.*` work in text expressions only.

- `answers.<code>` gives the raw stored value, for calculations and comparisons.
- `answerLabels.<code>` gives the participant's answer as readable text.
- `labels.<code>` gives static survey text, such as a question or option label.

## Choice questions

| Path | Gives |
|---|---|
| `answers.Q1.A1` | `true` if option A1 is selected |
| `answerLabels.Q1` | The selected option labels, comma separated (or the "Other" text) |
| `labels.Q1.A1` | Option A1's label |

## Rating and yes/no questions

| Path | Gives |
|---|---|
| `answers.Q2` | The number chosen, or `true` / `false` for yes/no |
| `answerLabels.Q2` | The point caption if the author set one, otherwise the number or Yes/No |

## Matrix questions

A matrix has rows (sub-questions) and columns (answer options). A cell needs both.

| Path | Gives |
|---|---|
| `answers.Q3.S1.A1` | Cell S1/A1's raw value |
| `answerLabels.Q3.S1` | Row S1's selected column labels, comma separated |
| `answerLabels.Q3.S1.A1` | Cell S1/A1 as readable text: a column label, Yes or No, or the typed value |
| `labels.Q3.S1` | Row S1's text |
| `labels.Q3.A1` | Column A1's text |

`answers.Q3.S1` on its own is not valid: a row has no single value. `answers.Q3.A1` resolves to nothing, because the answer is stored by row.

## Multi-part questions

| Path | Gives |
|---|---|
| `answers.Q4.P1` | Part P1's value |
| `answerLabels.Q4.P1` | Part P1's value, formatted by the part type |
| `answerLabels.Q4` | Every part joined with a comma |
| `labels.Q4.P1` | Part P1's text |

## Forward references

`answers.*` and `answerLabels.*` can only name a question earlier in the survey than the field using them. `labels.*` can name any question or group.

## Invalid paths

Every expression is checked when the survey is validated for publishing. A path that names a question or group that does not exist, breaks the forward-reference rule, addresses a matrix question without its sub-question code, or adds segments the path shape does not allow is reported against the field that contains it, and publishing is blocked until it is corrected.
