---
title: Multi-Part Question Types
description: Reference for all Multi-Part question types in VeySur, including text, number, yes/no, stars, 5-point, and 10-point variants.
---

Multi-Part question types collect several independently-answered pieces of information under a single question, without a grid.

## Parts

A Multi-Part question has one configurable collection: its parts. Each part has a label and a code, and carries the fixed answer type set by the Multi-Part variant (for example text, number, or yes/no). Parts are configured in the attributes panel when the question is focused, and can be added, edited, reordered, and deleted.

Each part is answered once, directly, rather than as a cell within a grid of rows and columns (the layout used by [matrix questions](/reference/survey-editor/question-types/matrix/)). This makes Multi-Part suited to a set of related short questions, such as first name and last name, or a set of separately rated aspects.

Every Multi-Part variant enforces the same answer type across all parts. The variant is fixed once the question is created; parts cannot switch to a different answer type afterwards.

## Multi-Part Text

Each part contains a text input. Participants type a free-form answer for each part.

| Option | Description |
|--------|-------------|
| Required | Participant must fill in at least one part. |
| Randomise | When enabled, parts are presented in a randomly shuffled order. The same order is shown to a returning participant. |

## Multi-Part Number

Each part contains a numeric input. Participants enter a number for each part.

| Option | Description |
|--------|-------------|
| Required | Participant must fill in at least one part. |
| Randomise | When enabled, parts are presented in a randomly shuffled order. The same order is shown to a returning participant. |

## Multi-Part Yes/No

Each part contains a yes/no selector. Participants choose Yes or No for each part.

| Option | Description |
|--------|-------------|
| Required | Participant must answer at least one part. |
| Randomise | When enabled, parts are presented in a randomly shuffled order. The same order is shown to a returning participant. |

## Multi-Part Stars

Each part contains a five-star rating control. Participants select a star rating for each part.

| Option | Description |
|--------|-------------|
| Required | Participant must rate at least one part. |
| Randomise | When enabled, parts are presented in a randomly shuffled order. The same order is shown to a returning participant. |

## Multi-Part 5-Point

Each part contains a five-point scale. Participants select a point value for each part.

| Option | Description |
|--------|-------------|
| Required | Participant must answer at least one part. |
| Randomise | When enabled, parts are presented in a randomly shuffled order. The same order is shown to a returning participant. |

## Multi-Part 10-Point

Each part contains a ten-point scale. Participants select a point value for each part.

| Option | Description |
|--------|-------------|
| Required | Participant must answer at least one part. |
| Randomise | When enabled, parts are presented in a randomly shuffled order. The same order is shown to a returning participant. |

## Point labels

For the Stars, 5-Point, and 10-Point variants, each point can have an optional label, shown above its number (or above the star). Labelling is optional and typically applied only to the two ends of the scale, for example "Strongly disagree" and "Strongly agree".

Point labels are shared: they are set once for the question and apply identically to every part, rather than being configured separately for each part.

## Common behaviours

All Multi-Part question types can be given a **condition** that controls whether the question is shown, based on a participant's earlier answers. See [Conditional Questions](/reference/survey-editor/conditional-questions/). Each question also has a **code** field used in exports. Individual part items also carry codes, which appear in export data alongside the question code.

Individual part items can also be made required via the item's own settings panel; they are not required by default. Item-level required is stricter than question-level required: it demands that the participant provides an answer for that specific part, rather than just requiring at least one answer anywhere in the question.
