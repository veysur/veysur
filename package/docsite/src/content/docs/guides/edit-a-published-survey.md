---
title: Edit a Published Survey
description: What happens to collected responses when a published survey is edited and published again.
---

import { Steps } from '@astrojs/starlight/components'

Editing a published survey never alters or deletes responses already collected. Each response stays bound to the snapshot it was answered under, and the Edit tab only changes the working copy. Participants see the new content only after a new publication is created.

## Edit and publish again

<Steps>

1. **Edit the survey.** Make the changes in the **Edit** tab. The current publication keeps using its original snapshot.

2. **Open the publish modal.** Click **Published**. The modal compares the working copy with the published snapshot and reports whether anything changed.

3. **Read the compatibility message.** If nothing changed, publishing is blocked because the existing snapshot already matches. If a question or answer option was removed, a warning states that responses cannot be merged automatically. Publishing is still allowed.

4. **Add a label and notes.** Name the publication and record what changed, for example "Wave 2: reworded Q3".

5. **Publish and check.** Open the **Publications** tab. The new publication appears with its own snapshot and a response count of zero.

</Steps>

## Merging earlier responses

Keep publications separate when the changes are significant. Merge when all responses need analysing together. A merge copies responses into the newer publication and never changes the originals.

| Change | Effect on a later merge |
|--------|-------------------------|
| Reword text or reorder items | Answers transfer. |
| Add a question | Earlier responses leave it unanswered. |
| Delete a question | Its answers are skipped. |
| Change a question type | Its answers are skipped. |
| Remove an answer option | Answers are skipped when no selected option remains. |

See [Merge Publication Responses](/guides/merge-publication-responses/) for the steps. Background is in [Publications](/reference/survey-editor/publications/) and [Publish Your Survey](/guides/publish-your-survey/).
