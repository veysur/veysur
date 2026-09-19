---
title: Participants
description: How to add, manage, and contact survey participants in VeySur.
---

The Participants tab lists everyone who has been given access to take the survey. From here you can add participants individually, import them in bulk, send invitation emails, and manage existing records.

## Participant list

The list displays the following columns:

| Column | Description |
|--------|-------------|
| Name | First and last name. |
| Email | Email address. |
| Email Status | Whether the address is pending, verified, or invalid. |
| Send Status | The delivery outcome of the most recent email: not sent, queued, sent, soft bounce, hard bounce, or complaint. |
| Invite Sent | The date and time the invitation email was sent, "Queued" while it waits to be sent, or "No" if not yet sent. |
| Reminder Sent | The date and time the reminder email was sent, "Queued" while it waits to be sent, or "No" if not yet sent. |
| Language | The language assigned to the participant. |
| Token | The participant's unique access token, with a copy button. |
| Created | The date the participant record was created. |

Use the search bar to filter by name or email.

## Adding participants

### Manually

Click **Add Participant** and fill in the form:

| Field | Notes |
|-------|-------|
| First Name | Required. |
| Last Name | Required. |
| Email | Required. Must be a valid email address. |
| Token | Optional. Auto-generated if left blank. Uppercase letters and numbers only. |
| Language | Required. Select from the list of available languages. |

If the survey has custom attributes that are not marked **Internal**, they appear as additional fields in this form. See [Participant Attributes](/reference/survey-editor/participant-attributes/) to define and manage custom attributes.

### Importing

Click **Import** to upload a file containing multiple participants. The system validates the file and reports any errors before importing.

## Sending invitations

Click **Send Invites** to send invitation emails to all participants who have not yet received one. A progress indicator shows how many emails have been sent and reports any errors.

Emails are not all sent at once. They are added to a queue and released in small batches to protect delivery reputation. A large send is spread over a longer period. While an email waits in the queue, the participant's Send Status and Invite Sent columns show "Queued". Once it is dispatched, the Invite Sent column is updated with the timestamp.

## Sending reminders

Click **Send Reminders** to send a follow-up email to all participants who have received an invitation but not yet a reminder. The same progress indicator is shown. Once sent, the Reminder Sent column is updated.

## Managing individual participants

Each row has an action menu with options to **Edit** the participant's details or **Delete** the participant record.

Deleted participants are removed from the list. Their responses, if any, retain a reference to the participant ID but display a "deleted" label.

## Exporting participants

Click **Export** to download the participant list as a file. This includes all current participant records, their status fields, and one column per custom attribute appended after the system columns. See [Participant Attributes](/reference/survey-editor/participant-attributes/#csv-importexport) for details on CSV column order and re-import behaviour.
