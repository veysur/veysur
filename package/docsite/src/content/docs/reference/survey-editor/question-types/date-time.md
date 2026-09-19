---
title: Date / Time Question Types
description: Reference for the Date, Time, and Date and Time question types in VeySur.
---

Date and time question types ask the participant to select a date, a time, or both using a picker interface. They are appropriate when you need a precise value rather than a free-text answer.

## Date

Presents a date picker. The participant selects a day, month, and year.

### Options

| Option | Description |
|--------|-------------|
| Required | When enabled, the participant must select a date before proceeding. |

### Notes

The date picker format follows the participant's locale settings. The selected value is stored in a standardised date format regardless of how it is displayed.

## Time

Presents a time picker. The participant selects an hour and minute.

### Options

| Option | Description |
|--------|-------------|
| Required | When enabled, the participant must select a time before proceeding. |

### Notes

Time is collected without a date component. Use the **Date and Time** type if both a date and time are needed.

## Date and Time

Presents a combined picker for both a date and a time. The participant selects a day, month, year, hour, and minute in a single input.

### Options

| Option | Description |
|--------|-------------|
| Required | When enabled, the participant must complete both the date and time before proceeding. |

### Notes

This type is the appropriate choice when a precise moment is needed rather than just a date or just a time.

## Common behaviours

All three date and time question types share the following:

- They can be given a **condition** that controls whether the question is shown, based on a participant's earlier answers. See [Conditional Questions](/reference/survey-editor/conditional-questions/).
- They have a **code** field used to identify the question in exports and condition expressions.
- Question text supports [formatting](/reference/survey-editor/formatting/).
- Date and time values are recorded in a standardised format in the response data, regardless of how the picker is displayed to the participant.
