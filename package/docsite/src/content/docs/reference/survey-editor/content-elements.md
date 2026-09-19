---
title: Content Elements
description: Add non-interactive text content and embedded YouTube videos between questions in a survey.
---

A content element presents information or media to participants. It sits among the questions in a group but, unlike a question, collects no participant data. Content elements are never required, never appear in exports or statistics, and are not valid targets for conditional logic or text expressions.

## Available types

| Type | Purpose |
|------|---------|
| Text content | A block of formatted text, such as an instruction, a disclaimer, or a section heading. Supports [formatting](/reference/survey-editor/formatting/). |
| Video (YouTube) | An embedded YouTube video. Paste a standard video URL and the editor extracts the video reference and any start time. An optional caption can be shown below the video. |

Videos are embedded through the privacy-enhanced YouTube domain and load only after the participant accepts the relevant cookie category.

## Adding a content element

In the editor area, click the **+** button at the bottom of a question group, then select **Text content** or **Video (YouTube)**. The element is added at the end of that group. A content element always belongs to a group, in the same way a question does.

## Editing

Click a content element to focus it. Edit a text content element by clicking its text and typing. For a video, edit the URL field; a preview appears once the URL resolves.

## Display conditions

A content element can carry a visibility rule, set through the branch button on the focused element. The rule is evaluated in the same way as a question condition. See [Conditional Questions](/reference/survey-editor/conditional-questions/).

## Reordering and deleting

Use the up and down arrows on the focused element, or drag it in the structure panel, where it shows a type icon instead of a question code. Click the delete button on the focused element to remove it.

Content elements do not count towards the participant progress indicator, and question numbering ignores them, so numbers stay contiguous.
