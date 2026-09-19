---
title: Publications
description: How publications work in VeySur - creating, managing, and stopping them.
---

A publication records the event of publishing a survey. When you create a publication, VeySur takes a snapshot of the survey at that moment, including its questions, settings, and participant attribute definitions. The snapshot is what participants see and what their answers are recorded against. Changes you make to the survey after publishing do not affect existing publications or their responses.

Each publication is tied to exactly one snapshot, but the same snapshot can be shared by more than one publication. This happens automatically when a survey is republished without any changes: rather than creating a duplicate snapshot, VeySur reuses the existing one and records a new publication against it.

## Publication list

The list displays the following columns:

| Column | Description |
|--------|-------------|
| ID | A unique identifier for the publication (last 8 characters shown). |
| Snapshot | The survey snapshot this publication is tied to. |
| Label | An optional name you assign, for example "Wave 1" or "Q3 2025". |
| Published | The date and time the publication was created. |
| Stopped | The date and time the publication was stopped, if applicable. |
| Active Duration | The time between the Published and Stopped dates. |
| Responses | The number of responses collected against this publication. |
| Status | Published (currently active) or Stopped (closed). |

## Creating a publication

Click the **Publish** button in the top-right of the survey Edit tab. If the survey has already been published, the button shows as **Published** instead. Either way, clicking it opens the publish modal.

In the modal you can optionally provide a **Label** (a short name to help identify this publication later) and **Notes** (free-text notes about this publication, supporting [formatting](/reference/survey-editor/formatting/)).

Click **Publish** to confirm. The publication becomes active and its status shows as **Published**.

If you want to restrict the active window by date, you can set a start or end date in the publish modal, or via **Settings** in the Schedule section.

## Stopping a publication

To stop a publication, go to the survey Edit tab and click the **Published** button in the top-right. A modal opens showing the current publish status. Click **Unpublish** to stop the publication. The status changes to **Stopped** and the Stopped timestamp is recorded. Existing responses are not affected and remain accessible.

A stopped publication cannot be restarted. Create a new publication if you need to resume collecting responses.

## Importing publications

Click **Import** to upload a previously exported publication file (.vssp format). The system validates the file and creates the publication along with its associated snapshot and response data.

Imported publications always have a status of Stopped, even if they were active at the time of export. This prevents an import from unexpectedly putting a survey live, or creating two active publications on the same survey. Create a new publication in the normal way to resume collecting responses.

## Merging responses

If you have updated your survey and created a new publication, you can copy responses from an older publication into the new one using the Merge feature. See [Merge Publication Responses](/guides/merge-publication-responses/) for full details.
