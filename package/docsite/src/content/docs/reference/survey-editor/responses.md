---
title: Responses
description: How to view, filter, manage, and export survey responses in VeySur.
---

The Responses tab shows the answers collected for a survey. Responses are always tied to a specific publication. Select a publication from the dropdown at the top of the page to load its responses.

## Response table

Once a publication is selected, the table displays one row per response. The columns are:

| Column | Description |
|--------|-------------|
| Response ID | A unique identifier (last 8 characters shown). |
| Participant | The name of the participant who submitted the response, or their ID with a "deleted" label if the participant record has since been removed. |
| Question columns | One column per survey question, showing the answer given. |
| Created | When the response was first created. |
| Last Updated | When the response was most recently modified. |

Responses that were copied from another publication via the merge feature are marked with a **Merged** badge and show a reference to the source snapshot.

For an anonymous survey, the Participant column shows "Anonymous" and every date shows "Anonymised", in both the table and the detail view.

## Filtering responses

The toolbar above the table provides several filters that can be combined:

- **Search**: filter by Response ID, participant name, or email
- **Date range**: filter by creation date or last updated date within a specified period (no effect on an anonymous survey)
- **Completion status**: show all responses, or only those that have been completed

Filters are applied immediately as you change them.

## Viewing a response

Click any row to open the full response detail view. This shows each question and the answer given, along with the Response ID, creation timestamp, last updated timestamp, and completion timestamp if the response was completed. Merged responses also show the source snapshot and the merge timestamp.

## Adding a response manually

Click **Add Response** in the toolbar to create a new response entry. This opens a form where you can enter answers directly, without going through the survey interface.

## Editing a response

To change the answers in an existing response, open the row action menu and select **Edit**.

## Exporting responses

Click **Export** to download the current filtered set of responses as a CSV file. If no filters are applied, all responses for the selected publication are exported. To export a subset, apply filters or select specific rows before exporting. Anonymous survey exports carry a placeholder date and no participant.

## Deleting responses

To delete one or more responses, select their checkboxes and click **Delete**, or use the row action menu to delete a single response. A confirmation prompt is shown before deletion. Deleted responses cannot be recovered.
