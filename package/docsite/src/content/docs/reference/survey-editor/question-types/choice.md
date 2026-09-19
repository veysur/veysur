---
title: Choice Question Types
description: Reference for all choice-based question types in VeySur, including checkboxes, dropdowns, buttons, scales, and image selection.
---

Choice question types ask the participant to select from a predefined set of options. VeySur includes several formats suited to different contexts, from binary yes/no questions to image-based selection and numeric scales.

## Answer options

All choice types (except Yes / No, Stars, 5 Point, 10 Point, and Survey Language) use a configurable list of answer options. Each option has:

| Field | Description |
|-------|-------------|
| Label | The text shown to the participant (language-specific in multi-language surveys). |
| Image | For Image Select questions, each answer option has a per-language image, falling back to the default language if no image is uploaded for the active language. |
| Code | A short identifier used in exports and condition expressions. |

Options can be added, edited, reordered, and deleted in the attributes panel when the question is focused. The codes `OTHER` and `OTHER_TEXT` are reserved for the built-in "Other" option and its free-text value; they cannot be used as custom answer option codes.

## Checkbox

Presents options as a list of tick boxes. Participants can select any number of options.

| Option | Description |
|--------|-------------|
| Required | Participant must select at least one option. |
| Min selections | Minimum number of options that must be selected. |
| Max selections | Maximum number of options that can be selected. |
| Other option | Adds an "Other" option with a free-text field. |
| Randomise | When enabled, answer options are presented in a randomly shuffled order. The same order is shown to a returning participant. |

## Dropdown

Presents options in a collapsed dropdown list. Suitable when there are many options and screen space is limited.

| Option | Description |
|--------|-------------|
| Required | Participant must make a selection. |
| Selection mode | Single (one option) or Multiple (several options). |
| Other option | Adds an "Other" option with a free-text field. |
| Randomise | When enabled, answer options are presented in a randomly shuffled order. The same order is shown to a returning participant. |

## Buttons

Presents options as clickable buttons displayed inline. Works well for a small number of options.

| Option | Description |
|--------|-------------|
| Required | Participant must select at least one button. |
| Selection mode | Single (radio behaviour) or Multiple (toggle behaviour). |
| Randomise | When enabled, answer options are presented in a randomly shuffled order. The same order is shown to a returning participant. |

## Yes / No

A binary question with fixed Yes and No options. No answer options need to be configured.

| Option | Description |
|--------|-------------|
| Required | Participant must select one of the two options. |

## Image Select

Presents options as images. Participants click an image to select it.

| Option | Description |
|--------|-------------|
| Required | Participant must select at least one image. |
| Selection mode | Single or Multiple. |
| Columns | Number of columns used to lay out the images. |
| Randomise | When enabled, images are presented in a randomly shuffled order. The same order is shown to a returning participant. |

Each answer option has an image uploaded alongside its label and code. In multi-language surveys, a separate image can be uploaded for each language; if no image is provided for a language, the default-language image is shown as a fallback.

## Stars

Presents a star rating input. Participants click to select a rating.

| Option | Description |
|--------|-------------|
| Required | Participant must select a rating. |

Each of the five stars can have an optional label, shown above it. Labelling is not required; a label is typically added only to the two ends of the scale, for example "Poor" on star 1 and "Excellent" on star 5.

## 5 Point

Presents a five-point scale, displayed as five selectable options numbered 1 to 5.

| Option | Description |
|--------|-------------|
| Required | Participant must select a value. |

Each point can have an optional label, shown above its number. Numbers are always shown; labelling is optional and is typically added only to the two ends of the scale, for example "Strongly disagree" on point 1 and "Strongly agree" on point 5.

## 10 Point

Presents a ten-point scale, displayed as ten selectable options numbered 1 to 10.

| Option | Description |
|--------|-------------|
| Required | Participant must select a value. |

Each point can have an optional label, shown above its number, in the same way as the 5 Point type.

## Survey Language

Presents a dropdown populated with language names from the ISO 639-1 standard. Participants select the language they want to use to complete the survey. This type is typically used in multi-language surveys to let participants choose the language they wish to continue in.

| Option | Description |
|--------|-------------|
| Required | Participant must select a language. |

## Common behaviours

All choice question types can be given a **condition** that controls whether the question is shown, based on a participant's earlier answers. See [Conditional Questions](/reference/survey-editor/conditional-questions/). Each question also has a **code** field used in exports and conditions.
