---
title: Ranking Question Type
description: Reference for the Ranking question type in VeySur.
---

The Ranking question type asks participants to order a set of options by preference or priority. Options not ranked by the participant are recorded as unranked.

## Answer options

Ranking questions use a configurable list of answer options. Each option has a **Label** (the text shown to the participant, supporting multiple languages) and a **Code** (a short identifier used in exports and condition expressions).

Options can be added, edited, reordered, and deleted in the attributes panel when the question is focused. The code `ORDER` is reserved for internal use and cannot be used as a custom answer option code.

## Ranking

Presents two columns: available options on the left and a ranked list on the right. Participants move options to the ranked list and can reorder them by dragging or using the arrow buttons.

| Option | Description |
|--------|-------------|
| Min ranked | Minimum number of options the participant must rank before submitting. |
| Max ranked | Maximum number of options the participant may rank. |
| Randomise | When enabled, the initial list of available options is presented in a randomly shuffled order. The same order is shown to a returning participant. |

### Export format

Ranked options are exported as a comma-separated list of option codes in the order chosen by the participant (for example, `A001,A003,A002`). Unranked options are omitted.

## Common behaviours

Ranking questions can be given a **condition** that controls whether the question is shown, based on a participant's earlier answers. See [Conditional Questions](/reference/survey-editor/conditional-questions/). Each question also has a **code** field used in exports and conditions.
