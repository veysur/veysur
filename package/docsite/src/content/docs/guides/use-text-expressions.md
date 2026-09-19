---
title: Use Expressions in Survey Text
description: How to insert a dynamic value into survey text using the variable picker or a JavaScript expression.
---

Survey text can reference an earlier answer or a participant detail, so a question or message reads as though written for each participant.

## What can contain an expression

The welcome message, group names and descriptions, question text and detail, subquestion text, answer option labels, and the thank-you message accept `{{ }}` tokens.

## Step 1: Place the cursor in a text field

In the survey editor, click into the text field where the value should appear.

## Step 2: Insert a variable

Click **Insert variable** in the text toolbar. The picker groups variables under **Participant**, **Response**, **Answers** (raw values), **Answer labels** (readable answers) and **Survey labels** (static text). Selecting one inserts a wrapped `{{ }}` token at the cursor.

A token can also be typed directly. Once recognised, it is shown as a pill, so it is clear it will be evaluated rather than shown literally.

## Step 3: Write an expression

A token can hold a full JavaScript expression, for example to vary wording by an earlier answer:

```
{{participant.city === "Liverpool" ? "As a local, " : ""}}what did you think?
```

To show an answer back as prose, use `answerLabels` not `answers`: `You chose {{answerLabels.Q005}}.` renders the option label; `{{answers.Q005}}` shows the raw value.

See [Text Expressions](/reference/survey-editor/text-expressions/) for variables and operations, and [Variable Paths](/reference/survey-editor/variable-paths/) for matrix and multi-part paths.

## Step 4: Save and preview

Open the [Preview](/reference/survey-editor/preview/) tab and answer any question the expression depends on. Confirm the rendered text shows the expected value, not the token.

## Restrictions

`answers.*` and `answerLabels.*` can only reference an earlier question (the thank-you message may reference any); `labels.*` and the welcome message have no such limit. An invalid or unresolvable expression is left as literal `{{ }}` text, not an error.
