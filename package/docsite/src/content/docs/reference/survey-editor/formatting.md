---
title: Formatting Survey Text
description: How survey text fields are formatted, and the Markdown, HTML, and plain-text options.
---

Most text a participant reads can be formatted: question text and detail, group name and description, subquestion text, answer option labels, the welcome and thank-you messages, the legal notice and data policy text, and publication notes. Each field is edited inline with a formatting toolbar.

## Formats

| Format | What it renders |
|--------|-----------------|
| Markdown | Markdown syntax (bold, italic, links, lists, headings) as formatted text. |
| HTML | The text as HTML. |
| Plain text | Nothing. Text appears exactly as typed. |

Markdown is the default. When both Markdown and HTML are allowed, Markdown takes precedence. When both are turned off, text renders as plain text.

With Markdown or HTML, the output passes through a filter that keeps a fixed set of safe tags and attributes and removes the rest before a participant sees it. The Allow `<script>` tags option in [Settings](/reference/survey-editor/settings/#content-format) is the only way to bypass this.

## Source view

The toolbar includes a source view that shows the underlying markup. Its syntax follows the active format, so it shows Markdown when Markdown is the format and HTML when HTML is the format.

## Changing the format

The format is set in [Settings](/reference/survey-editor/settings/#content-format). Each option is set for the current survey or inherited from the project default.

## Text expressions

Dynamic `{{ }}` tokens work in every format. See [Text Expressions](/reference/survey-editor/text-expressions/) for details.
