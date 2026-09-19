---
title: Simple Question Types
description: Reference for the Text and Number question types in VeySur.
---

Simple question types collect a single free-form value from the participant: either text or a number. They are the most straightforward question format and suit open-ended questions where a fixed set of options is not appropriate.

## Text

The Text question type presents a single-line input field. Use it when you want participants to write a short, free-form answer.

### Options

| Option | Description |
|--------|-------------|
| Required | When enabled, the participant must fill in the field before proceeding. |
| Size | Controls the visual width of the input: Small, Medium, or Large. |
| Min length | The minimum number of characters the participant must enter. Leave blank for no minimum. |
| Max length | The maximum number of characters allowed. Leave blank for no limit. |

### Notes

Text questions accept any characters. Min and max length constraints are enforced when the participant submits the question.

## Number

The Number question type presents a numeric input field. Use it when the answer should be a specific quantity or measurement.

### Options

| Option | Description |
|--------|-------------|
| Required | When enabled, the participant must fill in the field before proceeding. |
| Min value | The lowest number the participant may enter. Leave blank for no minimum. |
| Max value | The highest number the participant may enter. Leave blank for no limit. |
| Allow negative numbers | When enabled, negative values are accepted. Disabled by default. |

### Notes

- The input only accepts numeric characters. Non-numeric input is rejected.
- Min and max value constraints are enforced when the participant submits the question.
- If negative numbers are not allowed and the participant enters a negative value, they will be prompted to correct it.

## Common behaviours

Both question types share the following:

- They can be given a **condition** that controls whether the question is shown, based on a participant's earlier answers. See [Conditional Questions](/reference/survey-editor/conditional-questions/).
- They have a **code** field, used to identify the question in exports and condition expressions.
- Question text supports [formatting](/reference/survey-editor/formatting/).
