# Survey Publishing and Snapshot Comparison

This document describes the survey publishing workflow and the integrated snapshot comparison feature that prevents unnecessary republishing and warns about incompatible changes.

## Overview

The survey publishing system allows administrators to:
1. **Publish surveys** - Create immutable snapshots of surveys for participant access
2. **Track publications** - Record publish start and stop events separately from snapshots
3. **Compare changes** - Automatically detect changes between current and published versions
4. **Prevent duplicate publishing** - Block publishing of unchanged surveys
5. **Compatibility warnings** - Alert administrators about incompatible changes
6. **Deduplicate snapshots** - Automatically reuse existing snapshots with identical content via hash-based deduplication (see [snapshot-hash-deduplication.md](./snapshot-hash-deduplication.md))

## Data Model

The publishing system uses three separate but related entities. Note the naming overlap between the last two — `SurveySnapshotPartial` and `SurveySnapshot` are distinct classes:

### SurveySnapshotPartial ("the snapshot")
The entity referred to as "the snapshot" everywhere else in this document. Immutable metadata + structure capture of a survey at a point in time. Contains:
- Survey structure (questions, answer options, subquestions) — no embedded translations
- Optional label and notes
- Creation timestamp
- **contentHash** - SHA-256 composite hash of structural content + all language hashes, for deduplication
- A populated `publications` array — every `SurveyPublication` that currently references this snapshot

### SurveySnapshot (full survey data)
A second, differently-scoped entity holding the complete denormalized survey document (`survey: Survey`) for a given snapshot, keyed by the `SurveySnapshotPartial._id` as `snapshotId`. This is the "diff-free" copy used to render the survey exactly as published; it is not what administrators see when browsing "snapshots" in the UI.

### Survey Language Snapshots
Immutable captures of language translation content, frozen at publication time alongside the structural snapshot. One record is created per configured language per snapshot. Each record contains:
- All translated text for that language (title, questions, answer options, groups, etc.)
- **Content hash** - SHA-256 hash of the language text, for per-language deduplication

Changes to live language content after publishing do not affect existing `SurveyLanguageSnapshot` records.

### SurveyPublication
Records the event of publishing a snapshot — i.e. when a survey was made available (or stopped) to participants. Each `SurveyPublication` contains:
- **snapshotId** - Reference to the `SurveySnapshotPartial` being published
- **published** - Timestamp when the publication was created (survey made available)
- **stopped** - Timestamp when the publication was stopped (null if currently active)

**Key distinction**: One Publication references exactly one Snapshot (`snapshotId`), but one Snapshot may be referenced by many Publications. A snapshot can also be created without publishing. This separation allows:
- Creating draft snapshots for testing
- Publishing → unpublishing → republishing the same content with audit trail
- Tracking publish history independently of content versions
- **Snapshot reuse** - When republishing identical content, the system reuses existing snapshots while creating new Publications for complete audit trail

## Publishing Workflow

### Publishing a Survey

When an administrator clicks the "Publish" button:

1. **Modal opens** showing publish form
2. **Comparison runs** automatically against the most recent or published snapshot
3. **Status display** shows one of three states:
   - ✅ **No changes detected** - Survey is identical, publish button disabled
   - 🔵 **Compatible changes** - Changes detected but responses can merge
   - ❌ **Incompatible changes** - Warning shown, but publish still allowed
4. **Validation** ensures survey meets all requirements
5. **Content hash generated** from normalized survey content
6. **Snapshot lookup** - System checks for existing snapshots with matching hash
7. **Snapshot created or reused** - Creates new snapshot if content changed, reuses existing if identical
8. **Publication created** with `publishedAt` timestamp linking to the snapshot
9. **Toast notification** shows whether snapshot was reused or newly created
10. **Cache invalidated** to ensure fresh comparison data on next open

### Republishing a Survey

When republishing an already-published survey:

1. **Modal opens** showing current published snapshot details and republish form
2. **Comparison runs** automatically against the published snapshot as baseline
3. **Status display** shows compatibility of changes (if any)
4. Same validation and compatibility checking as initial publish
5. **New snapshot and publication created** if republishing proceeds

**In-progress participant responses**: republishing without structural changes
(same snapshot) is transparent to a participant already mid-survey — they keep
resuming their saved response. Republishing with structural changes (new
snapshot) resumes the participant against the *original* snapshot they started
on, as long as it still exists; they're only reset onto the new snapshot (with
a notice that their previous answers couldn't be recovered) if that original
snapshot has since been deleted. See
[Participant Authentication & Authorisation](../package/api/docs/auth-participant.md#resuming-a-started-survey).

### Unpublishing a Survey

Administrators can unpublish a survey, making it inaccessible to participants while retaining the snapshot history. When a survey is unpublished:

1. **Current Publication updated** - `stopped` timestamp is set to the current time
2. **Snapshot remains unchanged** - Historical content is preserved
3. **Survey becomes inaccessible** - Participants cannot view or respond
4. **Audit trail preserved** - The publish/unpublish history is maintained

### Embed files

A published survey with `access.embed` on also has static embed files in the public bucket. Publishing,
republishing and unpublishing rewrite them after the publish commits, and a failed write never fails the publish.
Deleting a snapshot or survey removes its files. See
[embedded-surveys.md](../package/api/docs/embedded-surveys.md).

## Automatic Snapshot Comparison

### When Comparison Runs

The comparison automatically runs when:
- The publish modal is opened
- The modal is closed and reopened (always refetches)
- After publishing/unpublishing (cache invalidated)

### Comparison Logic

```typescript
// Determine snapshot to compare against
if (publishedSnapshot exists) {
  compareWith = publishedSnapshot  // Use published version
  isComparingWithPublished = true
} else {
  compareWith = mostRecentSnapshot  // Use most recent
  isComparingWithPublished = false
}

// Fetch comparison
const comparison = await compareWithCurrent(surveyId, compareWith._id)
```

### Change Detection

The system checks both the backend `isEquivalent` flag AND actual change counts:

```typescript
const hasChanges =
  comparison.summary.addedItems > 0 ||
  comparison.summary.modifiedItems > 0 ||
  comparison.summary.removedItems > 0

const isEquivalent =
  comparison.isEquivalent === true ||
  (comparison && !hasChanges)
```

This provides frontend safety even if backend logic has issues.

## UI States

### 1. No Changes Detected (Equivalent to Published Snapshot)

**Alert**: Green success alert
```
✓ No changes detected
The current survey is identical to the published snapshot.
No need to republish.
```

**Button State**:
- Text: "Already Published"
- Disabled: Yes
- Tooltip: "Survey unchanged from published snapshot"

### 1b. No Changes Since Last Snapshot (Equivalent to Unpublished Snapshot)

**Alert**: Blue info alert
```
ⓘ No changes since last snapshot
The current survey is identical to the most recent (unpublished) snapshot.
Publishing will create a new snapshot with the same content.
```

**Button State**:
- Text: "Publish Survey"
- Disabled: No
- Allows publishing to create audit trail

### 2. Compatible Changes

**Alert**: Blue info alert
```
ⓘ Survey modified - Compatible
Changes: 3 added, 1 modified, 0 removed
Responses from the previous snapshot can be merged with this version.
```

**Button State**:
- Text: "Publish Survey" / "Republish"
- Disabled: No
- Allows publishing

### 3. Incompatible Changes

**Alert**: Red destructive alert
```
⚠ Survey modified - Incompatible with previous snapshot
The following changes prevent merging responses:
• Question "Q1" was removed
• Answer option "A2" was removed

You can still publish this survey, but responses from the previous
snapshot cannot be automatically merged with responses from the new version.
```

**Button State**:
- Text: "Publish" / "Republish"
- Disabled: No
- Allows publishing with warning

### 4. Loading State

**Alert**: Loading spinner
```
⟳ Checking for changes...
```

**Button State**: Disabled during comparison

## Architecture

### Frontend Components

**Location**: `package/app/src/appAdmin/component/SurveyEditorPublish/`

#### Main Component
- **SurveyEditorPublish.tsx** - Main publish modal orchestrator
  - Manages modal state
  - Coordinates hooks
  - Handles publish/unpublish actions
  - Prevents publish if equivalent

#### Child Components
- **PublishView.tsx** - Unified publish/republish form
- **CompatibilityStatus.tsx** - Color-coded comparison status alerts
- **PublishFooter.tsx** - Footer with publish/republish/unpublish actions
- **PublishButton.tsx** - Top-of-editor button that opens the publish modal

#### Hooks

**usePublished** - Main hook for publish state
```typescript
const {
  snapshot,               // Published snapshot or null
  isPublished,            // Boolean published state
  hasUnpublishedChanges,  // Boolean - live survey differs from published snapshot content
  publish,                // Publish function
  unpublish,              // Unpublish function
  publishMutation,        // React Query mutation
  unpublishMutation,      // React Query mutation
} = usePublished({ surveyId })
```

**useHasUnpublishedChanges** - Drives the sidebar "changes pending" dot and the
`PublishButton`'s "Re-publish" label. Calls the `has-unpublished-changes` endpoint (see Backend
API below) to compare the live survey's content hash against the active publication's snapshot
hash, rather than comparing `survey.updatedAt` to `publication.publishedAt`. The timestamp
approach was replaced because every autosave bumps `updatedAt` regardless of whether the
resulting content actually changed — e.g. moving a question away and back to its original
position produced two autosaves but no net content change, yet still showed "Re-publish".
```typescript
const {
  hasUnpublishedChanges,  // Boolean - live content differs from published snapshot
  isLoading,              // Loading state
} = useHasUnpublishedChanges({
  surveyId,
  isPublished,   // Skips the network call when the survey isn't published yet
})
```

**useComparisonSnapshot** - Determines which snapshot to compare against
```typescript
const {
  snapshotId,                 // ID of snapshot to compare with
  isComparingWithPublished,   // True if using published snapshot
  isLoading,                  // Loading recent snapshot
} = useComparisonSnapshot({
  surveyId,
  publishedSnapshot,
  enabled: showModal,
})
```

**useCompareWithSnapshot** - Fetches comparison data
```typescript
const {
  comparison,    // SurveyComparisonResult or null
  isLoading,     // Loading comparison
  isError,       // Error occurred
  error,         // Error details
} = useCompareWithSnapshot({
  surveyId,
  snapshotId,
  enabled: showModal && !!snapshotId,
})
```

**useRecentSnapshot** - Fetches most recent snapshot
```typescript
const {
  data: recentSnapshot,  // Most recent snapshot
  isLoading,             // Loading state
} = useRecentSnapshot({
  surveyId,
  enabled: enabled && !hasPublishedSnapshot,
})
```

### Backend API

#### Survey Snapshot Endpoints

**Endpoint**: `GET /survey-snapshot/:surveyId/compare-with-current/:snapshotId`

**Location**: `package/api/src/endpoint/core/survey-snapshot.ts`

**Service**: `ServiceSurveySnapshot.compareWithCurrent()`

**Location**: `package/api/src/model/service/core/ServiceSurveySnapshot.ts`

**Returns**:
```typescript
{
  snapshot: {
    _id: string
    label: string | null
    notes: string | null
    created: Date
  },
  current: {
    _id: string
    name: string
    updated: Date
  },
  comparison: SurveyComparisonResult
}
```

#### Publication Endpoints

**Publish**: Creates a new publication with `publishedAt` timestamp, linking to a new or reused snapshot

**Unpublish**: Updates the current publication with `stopped` timestamp

**Get Published Status**: Returns the currently active publication (where `stopped` is null)

**Has Unpublished Changes**: `GET /survey-publication/:surveyId/has-unpublished-changes`
(`ServicePublication.hasUnpublishedChanges()`) — returns `{ hasChanges: boolean }`. Reuses the
same `generateSurveyStructuralHash`/`generateSnapshotContentHash` logic `publish()` uses (via a
shared private `computeContentHash()` helper), so this stays consistent with what an actual
publish would produce — no separate diff/traversal, just a hash comparison against the active
publication's snapshot `contentHash`. Returns `hasChanges: false` when nothing is published yet.

### Query Invalidation Strategy

To ensure fresh data after mutations:

**After every autosave** (`onPersistSuccess` in `useSurveyPatchableState.ts`):
```typescript
queryClient.invalidateQueries({ queryKey: ['surveySnapshot', 'compare', surveyId] })
queryClient.invalidateQueries({ queryKey: [KEY_STATE_PUBLICATION_HAS_CHANGES, surveyId] })
```
This is what makes the "changes pending" badge correct after a reorder-and-revert: the second
autosave's invalidation triggers a refetch that (correctly) reports no changes.

**After Publish**:
```typescript
queryClient.invalidateQueries({ queryKey: ['surveySnapshot', 'compare'] })
queryClient.invalidateQueries({ queryKey: ['surveySnapshot', 'recent'] })
queryClient.invalidateQueries({ queryKey: [KEY_STATE_PUBLICATION_HAS_CHANGES, surveyId] })
```

**After Unpublish**:
```typescript
queryClient.setQueryData([KEY_STATE_SURVEY_SNAPSHOT_PUBLISHED], null)
queryClient.invalidateQueries({ queryKey: ['surveySnapshot', 'compare'] })
queryClient.invalidateQueries({ queryKey: ['surveySnapshot', 'recent'] })
queryClient.invalidateQueries({ queryKey: [KEY_STATE_PUBLICATION_HAS_CHANGES, surveyId] })
```

**Comparison Query Options**:
```typescript
refetchOnMount: 'always'  // Always fetch fresh comparison when modal opens
```

## User Scenarios

### Scenario 1: First Publish (No Snapshots)
1. User clicks "Publish" → Modal opens
2. No snapshots exist → No comparison shown
3. Standard publish form displayed
4. User can publish immediately

### Scenario 2: Publish Without Changes
1. User makes edits, then reverts them
2. User clicks "Publish" → Modal opens
3. Comparison runs against most recent snapshot
4. Alert: "✓ No changes detected"
5. Button disabled: "Already Published"
6. User cannot unnecessarily republish

### Scenario 3: Publish With Compatible Changes
1. User adds new questions
2. User clicks "Publish" → Modal opens
3. Comparison shows: "🔵 Compatible - 3 added"
4. Button enabled: "Publish Survey"
5. User proceeds with confidence

### Scenario 4: Publish With Incompatible Changes
1. User removes a question
2. User clicks "Publish" → Modal opens
3. Comparison shows: "❌ Incompatible - Question Q1 removed"
4. Detailed warning displayed
5. Button enabled: "Publish (Incompatible)"
6. User is warned but can proceed if intentional

### Scenario 5: Republish Without Changes
1. Survey is published
2. User clicks "Publish" → Modal opens
3. Comparison runs against published snapshot
4. Alert: "✓ No changes detected"
5. Button disabled: "Already Published"
6. Prevents duplicate snapshots

### Scenario 6: Republish With Changes
1. Survey is published
2. User makes compatible changes
3. User clicks "Publish" → Modal opens
4. Comparison shows changes and compatibility
5. Button enabled based on compatibility
6. User can republish with clear change summary

### Scenario 7: Republish After Unpublish (No Changes)
1. Survey is published → Snapshot 1 created + Publication 1 created with `publishedAt`
2. User unpublishes → Publication 1 updated with `stopped` timestamp
3. User clicks "Publish" → Modal opens
4. Comparison runs against Snapshot 1 (most recent snapshot)
5. Alert: "🔵 No changes since last snapshot - will create new snapshot"
6. Button enabled: "Publish Survey"
7. User can publish to create Publication 2 with new `publishedAt` timestamp, reusing Snapshot 1 since content is identical — demonstrating that one Snapshot can be referenced by many Publications
8. Creates audit trail of publish → unpublish → republish with complete timestamp history

### Scenario 8: Move an Item Away and Back (No Net Change)

1. Survey is published → sidebar shows "Published" (no changes pending)
2. User drags a question to a different position → autosave fires, `survey.updatedAt` bumps
3. User drags the same question back to its original position → a second autosave fires,
   `survey.updatedAt` bumps again
4. Each autosave's success invalidates `useHasUnpublishedChanges`'s query, which refetches
   `has-unpublished-changes` and recomputes the live content hash
5. The recomputed hash matches the published snapshot's `contentHash` (the reorder net out to
   the original `questionIds` order) → sidebar dot and `PublishButton` correctly revert to
   "Published", without a full page reload
6. If the user opens the publish modal anyway, `SurveyCompare` independently confirms
   `isEquivalent: true` — the badge and the modal agree

## Compatibility Rules

See [survey-comparison.md](../package/common/docs/survey-comparison.md) for detailed compatibility rules.

### Quick Reference

**Compatible Changes** ✅:
- Adding questions, answer options, or subquestions
- Modifying question text/labels
- Reordering items
- Adding translations

**Incompatible Changes** ❌:
- Removing questions
- Removing answer options or subquestions
- Changing question types
- Removing required fields

## Testing Checklist

- [ ] First publish with no snapshots
- [ ] Publish with no changes (equivalent)
- [ ] Publish with compatible changes
- [ ] Publish with incompatible changes
- [ ] Republish with no changes (equivalent) - should be blocked
- [ ] Republish with compatible changes
- [ ] Republish with incompatible changes
- [ ] Unpublish functionality
- [ ] Publish after unpublish with no changes - should be allowed (creates audit trail)
- [ ] Publish after unpublish with changes
- [ ] Loading states during comparison
- [ ] Error states if comparison fails
- [ ] Button disabled states
- [ ] Tooltip displays
- [ ] Comparison with published vs most recent
- [ ] Alert styling for all states (green for published equivalent, blue for unpublished equivalent)
- [ ] Modal close/reopen (comparison caching)
- [ ] Query invalidation after publish/unpublish

## Best Practices

### For Administrators

1. **Review comparison alerts** before publishing - understand what changes you're making
2. **Avoid incompatible changes** when possible to preserve response merge capability
3. **Use snapshot labels** to document versions (e.g., "Version 2.0 - Added demographics")
4. **Add snapshot notes** to explain significant changes
5. **Test thoroughly** before publishing if making major changes

### When to Republish Identical Content

Publishing identical content creates a new Publication (reusing the existing Snapshot), which is appropriate when:
- **Republishing after unpublishing** - Creates audit trail with separate Publication records showing:
  - When the survey was first published (`Publication 1.publishedAt`)
  - When it was unpublished (`Publication 1.stoppedAt`)
  - When it was republished (`Publication 2.publishedAt`)
- **Documenting a deliberate re-publication decision** - Preserves who, when, and why in the event history
- **Resetting published timestamp** - Creates new Publication with current `publishedAt` date

The separation between snapshots (content) and Publications (availability) allows the system to maintain a complete audit trail of when surveys were available to participants, independent of content changes. When republishing identical content after unpublishing, a blue informational alert will appear instead of blocking the action.

### For Developers

1. **Trust the comparison logic** - don't try to republish if marked equivalent
2. **Handle loading states** - comparison is asynchronous
3. **Test edge cases** - surveys with no snapshots, missing data, etc.
4. **Invalidate queries** properly after mutations
5. **Follow React hooks rules** - always call hooks in same order
6. **Use frontend safety checks** - verify change counts in addition to backend flags

## Troubleshooting

### Issue: "Already Published" but I made changes

**Cause**: Changes may not affect survey structure (e.g., only metadata changed)

**Solution**: Check what fields are compared in `SurveyCompare` service

### Issue: Comparison not updating after publish

**Cause**: Query cache not invalidated

**Solution**: Verify `invalidateQueries` is called in publish mutation `onSuccess`

### Issue: React hooks error on publish/unpublish

**Cause**: Conditional hook calls violating Rules of Hooks

**Solution**: Ensure all hooks are called in same order every render (see `useComparisonSnapshot`)

### Issue: Comparison shows loading forever

**Cause**: Missing snapshot ID or backend error

**Solution**: Check browser console for API errors, verify snapshot exists

## See Also

- [Snapshot Hash Deduplication](./snapshot-hash-deduplication.md) - Content hash-based snapshot reuse system
- [Embedded surveys](../package/api/docs/embedded-surveys.md) - Static files written at publish for embedding
- [Survey Comparison](../package/common/docs/survey-comparison.md) - Detailed comparison logic documentation
- [SurveyCompare Service](../package/common/src/model/service/SurveyCompare/index.ts) - Backend comparison logic
- [SurveyEditorPublish Component](../package/app/src/appAdmin/component/SurveyEditorPublish/) - Frontend implementation
- [Survey Snapshot API](../package/api/src/endpoint/core/survey-snapshot.ts) - API endpoints
- [Hash Generation Utility](../package/common/src/util/generateSurveyHash.ts) - Content hash algorithm
