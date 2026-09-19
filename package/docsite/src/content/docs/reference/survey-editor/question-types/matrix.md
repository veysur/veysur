---
title: Matrix Question Types
description: Reference for all matrix question types in VeySur, including text, number, date, time, checkbox, and yes/no variants.
---

Matrix question types display a grid suited to collecting structured data across multiple related items in a compact format.

## Sub-questions, answer options, and orientation

Matrix questions have two configurable collections of items: sub-questions and answer options. Each sub-question has a label and a code, and carries the cell type set by the matrix variant (for example text, number, date, or checkbox); this type determines the kind of input or choices available in every cell answered against it. Each answer option is a labelled grouping, identified by its own code, against which the participant provides one answer per sub-question.

The Orientation attribute controls the layout: **Subquestions as rows** (the default) displays sub-questions down the side and answer options across the top; **Answer options as rows** swaps them. Both collections are configured in the attributes panel when the question is focused. Items in each collection can be added, edited, reordered, and deleted.

Every matrix variant enforces the same cell type across all sub-questions. The variant is fixed once the question is created; sub-questions cannot switch to a different cell type afterwards.

## Matrix Text

Each cell in the grid contains a text input. Participants type a free-form answer for each sub-question.

| Option | Description |
|--------|-------------|
| Required | Participant must fill in at least one cell. |
| Randomise | When enabled, items in each collection are presented in a randomly shuffled order. The same order is shown to a returning participant. |

## Matrix Number

Each cell in the grid contains a numeric input. Participants enter a number for each sub-question.

| Option | Description |
|--------|-------------|
| Required | Participant must fill in at least one cell. |
| Randomise | When enabled, items in each collection are presented in a randomly shuffled order. The same order is shown to a returning participant. |

## Matrix Date

Each cell in the grid contains a date picker. Participants select a date for each sub-question.

| Option | Description |
|--------|-------------|
| Required | Participant must select a date for at least one sub-question. |
| Randomise | When enabled, items in each collection are presented in a randomly shuffled order. The same order is shown to a returning participant. |

## Matrix Time

Each cell in the grid contains a time picker. Participants select a time for each sub-question.

| Option | Description |
|--------|-------------|
| Required | Participant must select a time for at least one sub-question. |
| Randomise | When enabled, items in each collection are presented in a randomly shuffled order. The same order is shown to a returning participant. |

## Matrix Date and Time

Each cell in the grid contains a combined date and time picker. Participants select a date and time for each sub-question.

| Option | Description |
|--------|-------------|
| Required | Participant must select a date and time for at least one sub-question. |
| Randomise | When enabled, items in each collection are presented in a randomly shuffled order. The same order is shown to a returning participant. |

## Matrix Checkbox

Each cell in the grid contains a checkbox. Participants can tick any combination of cells across each sub-question.

| Option | Description |
|--------|-------------|
| Required | Participant must tick at least one cell. |
| Randomise | When enabled, items in each collection are presented in a randomly shuffled order. The same order is shown to a returning participant. |

## Matrix Yes / No

Each cell in the grid contains a yes/no selector. Participants choose Yes or No for each cell.

| Option | Description |
|--------|-------------|
| Required | Participant must answer at least one cell. |
| Randomise | When enabled, items in each collection are presented in a randomly shuffled order. The same order is shown to a returning participant. |

## Common behaviours

All matrix question types can be given a **condition** that controls whether the question is shown, based on a participant's earlier answers. See [Conditional Questions](/reference/survey-editor/conditional-questions/). Each question also has a **code** field used in exports. Individual sub-question items also carry codes, which appear in export data alongside the question code.

Individual sub-question items can also be made required via the item's own settings panel; they are not required by default. Item-level required is stricter than question-level required: it demands that the participant provides an answer for that specific sub-question, rather than just requiring at least one answer anywhere in the matrix.
