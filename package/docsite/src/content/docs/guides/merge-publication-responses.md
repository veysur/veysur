---
title: Merge Publication Responses
description: How to copy responses from one publication into another in VeySur.
---

If you have updated a survey and created a new publication, you may want to consolidate responses from the earlier publication into the new one. The merge feature copies responses from a source publication into a target publication, mapping answers to the equivalent questions in the new snapshot where possible.

## When to merge

Merging is useful when minor changes were made to a survey (for example, correcting a typo or reordering questions) and a new publication was created, or when all responses need to be analysed together regardless of which publication they were collected under.

Merging is not a replacement for keeping publications separate when the survey has changed significantly. Incompatible responses (those where the source and target snapshots differ too much to map automatically) are not transferred.

## Step 1: Navigate to the merge page

1. Open the survey and go to the **Publications** tab.
2. Find the publication you want to merge responses **into** (the target).
3. Open its action menu and click **Merge Responses**.

## Step 2: Select the source publication

Choose the publication you want to copy responses **from**. Once selected, the system analyses compatibility between the two snapshots.

## Step 3: Review the merge preview

Before confirming, the preview shows:

| Statistic | Description |
|-----------|-------------|
| Total source responses | The number of responses in the source publication. |
| Responses to be created | The number that will be copied into the target. |
| Already merged | Responses that have been merged previously; these are skipped to prevent duplicates. |
| Participant already responded | Responses skipped because the participant already has a response in the target publication. |
| Incompatible responses | Responses that cannot be mapped because of structural differences between the snapshots. |

A sample of response mappings is shown so you can see which answers will transfer and which will be skipped, along with the reason (for example, a question was removed, its type changed, or an answer option is missing in the new version).

If there are incompatible responses, you can still proceed with the merge; only the compatible portion will be transferred.

A participant can only have one response per publication. If a participant already responded to the target publication, their response from the source publication is skipped during the merge, even if the two responses were never merged before.

## Step 4: Confirm the merge

Click **Merge Responses** to proceed. A confirmation prompt warns that the operation cannot be undone. Click to confirm.

When complete, a success message shows how many responses were created. You are returned to the Responses tab, filtered to the target publication.

## Merged responses

Responses that were copied via merge are marked with a **Merged** badge in the Responses table. Their detail view shows the source snapshot and the date and time of the merge.

Merged responses are treated the same as any other response for the purposes of statistics and export.
