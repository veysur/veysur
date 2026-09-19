---
title: Survey structure
description: How a survey is organised into groups, questions, and content, and the terms used for them in exports and error messages.
---

A survey follows a defined hierarchy: an optional title, an optional welcome message, one or more groups, and an optional thank you message.

## How a survey is organised

A survey has:

- An optional **title** shown to participants at the start
- An optional **welcome message** shown before the first question
- One or more **groups**, each holding **questions** and, optionally, **content**
- An optional **thank you message** shown after the survey is submitted

Every question belongs to exactly one group. Within a group, questions and content items share a single ordered list.

**Content** presents information or media without collecting a response: formatted text or an embedded YouTube video. See [Content Elements](/reference/survey-editor/content-elements/). The welcome and thank you messages can also hold content items.

## Terminology

A group is stored internally as a **section**. Exported and imported survey files, and import error messages, use "section" instead of "group" for the same thing. See [Import / Export](/reference/import-export/).

A question or content item, considered together, is called an **element** in those same files and error messages. The editor and this site refer to them individually as "question" and "content".

For adding, reordering, and deleting groups, questions, and content, see [Edit Survey Structure](/guides/edit-survey-structure/).

## The structure panel

The left side of the editor shows the hierarchy as a tree, with each group's questions and content nested beneath it. Groups can be expanded or collapsed. Clicking an item focuses it and scrolls to it.

## Attributes

Click an item to focus it. Edit it inline by clicking its title or description, or through the attributes panel on the right.

### Group attributes

| Attribute | Description |
|-----------|-------------|
| Name | Internal label used in the structure panel and in exports. |
| Description | Optional text shown above the group's questions. |
| Condition | Visibility rule. See [Conditional Questions](/reference/survey-editor/conditional-questions/). |

### Question attributes

| Attribute | Description |
|-----------|-------------|
| Question text | The prompt shown to participants. Supports [formatting](/reference/survey-editor/formatting/). |
| Question type | The response format. Click to change it. |
| Required | Participants cannot proceed without answering. |
| Code | Short identifier used in exports and conditional logic. `OTHER`, `OTHER_TEXT`, and `ORDER` are reserved. |
| Condition | Visibility rule. See [Conditional Questions](/reference/survey-editor/conditional-questions/). |

### Question sub-parts

Checkbox and Dropdown questions have answer options; matrix questions have rows. Sub-parts appear nested beneath their question, with their own attributes in the right panel.

### Thank you message

Shown after a participant submits the survey. Supports [formatting](/reference/survey-editor/formatting/).

| Attribute | Description |
|-----------|-------------|
| End URL | Optional link followed after completion. Used automatically when Redirect End is enabled. |
| Link text | Label for the End URL link; falls back to the URL when blank. |

A language without its own End URL falls back to another language's value. See [Settings → Presentation](/reference/survey-editor/settings/#presentation) for the Redirect End and End URL Link toggles.
