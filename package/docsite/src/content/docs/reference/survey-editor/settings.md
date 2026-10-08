---
title: Settings
description: Reference for all survey settings sections in VeySur.
---

The Settings tab contains configuration options grouped into sections. Changes take effect on new publications; existing publications use the snapshot taken at the time they were created.

## Language

| Setting | Description |
|---------|-------------|
| Default language | The language used when no other preference applies. |
| Language options | Additional languages available in the survey. Add languages here to enable multi-language editing and participant language assignment. |

See [Create a Multi-Language Survey](/guides/create-multi-language-survey/) for a step-by-step guide.

## Presentation

Controls how the survey is displayed to participants.

| Setting | Description |
|---------|-------------|
| Format | How questions are paginated: all on one page, one group per page, or one question per page. |
| Progress bar | Show a progress indicator to participants. |
| Question numbers | Display a number alongside each question. |
| Question code | Display the question code alongside each question. |
| Group name | Show the group name above its questions. |
| Group description | Show the group description above its questions. |
| Survey title | Display the survey title at the top of the survey. |
| Welcome message | Show the welcome message before the first question. |
| Back navigation | Allow participants to return to previous questions. |
| Redirect End | Redirect the participant to the End URL immediately after completing the survey, instead of showing the thank you screen. |
| End URL Link | Show the End URL link on the thank you screen, for every language. Off by default. Turn this on to show the link regardless of which languages have an End URL configured. |
| Print | Allow participants to print their answers after completing the survey. Adds a Print button to the completion screen that opens a printable summary of their answers. |

Redirect End uses the End URL configured on the survey's thank you message. See [Survey structure → Thank you message](/reference/survey-editor/survey-structure/#thank-you-message).

## Content Format

Controls which formats are allowed in survey text. Each option is set for the current survey or inherited from the project default.

| Setting | Description |
|---------|-------------|
| Markdown | Allow Markdown formatting (bold, links, lists) in survey text. On by default. |
| Raw HTML | Allow raw HTML in survey text. Used only when Markdown is turned off. |
| Allow `<script>` tags | Permit `<script>` tags in survey content. Unsafe: enable only when every survey editor is trusted. |

When both Markdown and Raw HTML are turned off, survey text renders as plain text. See [Formatting Survey Text](/reference/survey-editor/formatting/).

## Participant

| Setting | Description |
|---------|-------------|
| HTML email | Send invitation and reminder emails in HTML format. |
| Thank you email | Send an email to the participant after they complete the survey. |
| Token length | The length of the auto-generated access token. |

## Data

| Setting | Description |
|---------|-------------|
| Record timestamps | Store the time each answer is submitted. |
| Capture IP address | Record the participant's IP address with each response. |
| Record referrer URL | Store the URL the participant navigated from. |

## Access

| Setting | Description |
|---------|-------------|
| Anonymous responses | Responses are not linked to a participant record. No participant ID, name, or token is stored, and every response timestamp (created, updated, started, completed) is shown as "Anonymised" rather than a real time, so a response cannot be traced to a participant. |
| Open access | Allow anyone with the survey link to access it without a token. When disabled, a token or Public Registration is required. |
| Public Registration | Allow unregistered visitors to register with their name and email. VeySur creates a participant record and sends an invitation email. When enabled alongside Open access, registration is required even for open surveys. |
| Allowed Websites for Embedding | The websites that may show this survey as an embedded survey, one per line. A website also covers its subdomains. A survey inherits the project default unless it sets its own list, and an empty list allows any website. Turn embedding on in the Share tab. See [Embed a Survey in a Website](/guides/embed-a-survey/). |

<!-- CAPTCHA for Registration is not yet implemented — re-add this row to the table above once it ships.
| CAPTCHA for Registration | Add CAPTCHA bot protection to the public registration form. Only relevant when Public Registration is enabled. |
-->

<!-- Index (public survey index on the project homepage) is not yet implemented — re-add this row to the table above once it ships.
| Index | List the survey in the public index on your homepage. |
-->

See [Participant Registration](/guides/participant-registration/) for a guide on configuring and using these settings together.

## Data Policy and Legal Notice

Both sections have the same options:

| Setting | Description |
|---------|-------------|
| Show | Display the text to participants. |
| Show as link | Display a link to an external document rather than inline text. |
| Text | The localised policy or notice content. |

## Publish

| Setting | Description |
|---------|-------------|
| Start date | The date from which the survey accepts responses. Leave blank for no restriction. |
| End date | The date after which the survey no longer accepts responses. Leave blank for no restriction. |

## Notifications

Each notification type can be configured with one or more recipient email addresses.

| Setting | Description |
|---------|-------------|
| Basic notifications | Configuration for summary notification emails, including the recipient addresses. |
| Detailed notifications | Configuration for per-response notification emails, including the recipient addresses. |

Notification settings apply to the current survey only.
