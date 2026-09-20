[//]: # (cspell:ignore resp)

# Publication Response Merge

The Publication Response Merge feature allows administrators to copy responses from one survey snapshot to another, with intelligent answer mapping and compatibility checking. This enables consolidation of response data across different survey versions while maintaining data integrity.

## Overview

Response merging serves to:

1. **Consolidate responses** - Combine responses from multiple snapshots into one
2. **Preserve historical data** - Migrate responses when survey structures evolve
3. **Maintain data integrity** - Only transfer compatible answers with validation

## Key Concepts

### Snapshots and Publications

Survey snapshots capture the complete survey structure at a specific point in time. Each response is linked to a snapshot, ensuring data consistency even as the survey evolves. A Publication records the event of publishing a snapshot — each Publication references exactly one Snapshot, but a single Snapshot may be referenced by many Publications (for example, when republishing unchanged content reuses the existing snapshot). This cardinality is why merges are described in terms of source/target *publications* below rather than snapshots directly — the merge always resolves to a specific Publication on the target snapshot.

### Compatibility

Only **compatible** snapshots can be merged. Compatibility is checked using the `SurveyCompare` service to ensure that answers from the source publication can be safely transferred to the target publication structure.

**Important**: Compatibility checking is **strict** and validates structural compatibility as well as question attributes. However, the merge process itself follows a **"best attempt, no data loss"** philosophy - it makes every effort to transfer data while preventing partial answer corruption.

### Merge Philosophy: "Best Attempt, No Data Loss"

The merge system prioritizes preserving data integrity by following this principle:

✅ **Merge answers even if they don't meet new constraints** - If an answer has too few options for a new minimum requirement, it's still merged (best attempt to preserve all available data)

❌ **Skip answers only when merging would require dropping data** - If an answer has too many options for a new maximum constraint, it's skipped entirely (cannot merge without losing answer options)

This ensures that:
- You never get partially corrupted answers (e.g., answer with some options arbitrarily removed)
- All successfully merged answers preserve 100% of their original selected options
- Skipped answers are clearly tracked with specific reasons for transparency

### Answer Mapping

Answers are mapped by **question codes** and **answer option codes** (not IDs), allowing portable transfer across different snapshot structures while preserving semantic meaning.

## Usage

### From the Admin UI

1. Navigate to **Survey > Publications**
2. Select the target publication (where responses will be copied to)
3. Click the **Actions** dropdown and select **Merge Responses**
4. Select the source publication (where responses will be copied from)
5. Review the compatibility status and preview statistics
6. Click **Merge Responses** to execute the merge
7. Confirm the operation in the dialog

### Merge Preview

Before executing the merge, a preview is shown with:

- Compatibility status (compatible/incompatible)
- Statistics: number of responses to copy, answers to transfer/skip
- **Duplicate prevention**: alert showing responses that will be skipped to prevent duplicates
- Sample mappings showing how answers will be mapped
- List of incompatibilities (if any)

**Important**:

- Incompatible snapshots cannot be merged. The UI blocks the merge button when incompatibilities are detected.
- If all responses would be duplicates, the UI shows an "All responses have already been merged" message and may disable the merge button.

## API Usage

### Endpoint

```
POST /api/survey-publication/:surveyId/:targetPublicationId/merge-from/:sourcePublicationId
```

### Request Body

```typescript
{
  options?: {
    dryRun?: boolean  // Default: false
  }
}
```

### Response

```typescript
{
  success: boolean
  sourceSnapshotId: string
  targetSnapshotId: string
  stats: {
    sourceResponseCount: number
    responsesCreated: number
    responsesAlreadyMerged: number  // Responses skipped due to lineage-based deduplication (origResponseId)
    responsesSkippedParticipantDuplicate: number  // Responses skipped because the participant already has a response in target
    answersTransferred: number
    answersSkipped: number
    answerSkipReasons: {
      [reason: string]: number  // e.g., { missing_question: 5, exceeds_maximum: 2 }
    }
  }
  compatibility: {
    isCompatible: boolean
    incompatibilities?: IncompatibilityDetail[]
  }
  preview?: {  // Only if dryRun: true
    sampleMappings: Array<{
      originalAnswers: object
      mappedAnswers: object
      skippedAnswers: AnswerSkipDetail[]
    }>
  }
}
```

### Example: Dry Run Preview

```typescript
import { getSurveySnapshotApi } from "@/appAdmin/component/AdminSurvey/registry";

const api = getSurveySnapshotApi();
const result = await api.mergeResponses(
  surveyId,
  targetSnapshotId,
  sourceSnapshotId,
  { dryRun: true },
);

if (!result.compatibility.isCompatible) {
  console.error("Snapshots are incompatible!");
  result.compatibility.incompatibilities.forEach((issue) => {
    console.error(`- ${issue.message}`);
  });
} else {
  console.log(`Will create ${result.stats.responsesCreated} responses`);
  console.log(`Will transfer ${result.stats.answersTransferred} answers`);
  console.log(`Will skip ${result.stats.answersSkipped} answers`);
}
```

### Example: Execute Merge

```typescript
const result = await api.mergeResponses(
  surveyId,
  targetSnapshotId,
  sourceSnapshotId,
  { dryRun: false },
);

console.log(`Merged ${result.stats.responsesCreated} responses`);
console.log(`Transferred ${result.stats.answersTransferred} answers`);
```

## Answer Mapping Logic

### Mapping by Code

Answers are mapped using **codes** rather than IDs:

- **Question codes** (e.g., `Q1`, `Q3`)
- **Answer option codes** (e.g., `A1`, `A2`)
- **Subquestion codes** (e.g., `SQ1`, `SQ2`)

This allows answers to transfer correctly even when the underlying IDs differ between snapshots.

### Question Type Handling

Different question types are handled appropriately:

#### Text/Number/Date Questions

- **Logic**: Direct copy if question code matches
- **Validation**: None needed (free-form input)
- **Example**: Text answer "Hello" transfers as-is

#### Single-Choice Questions

- **Logic**: Map answer option by code
- **Validation**: Check if option code exists in target
- **Skip if**: Option code not found in target
- **Example**: Answer `A1` transfers if target has option with code `A1`

#### Multiple-Choice Questions

- **Logic**: Filter array to only include valid option codes that exist in target
- **Validation**:
  - Check each selected option code exists in target
  - Check if filtered answer violates `chooseMax` constraint
- **Skip if**:
  - None of the selected options are valid in target
  - Filtered answer exceeds target's maximum allowed selections (`chooseMax`)
- **Merge even if**:
  - Filtered answer is below target's minimum required selections (`chooseMin`) - preserves all available data
  - Some options are filtered out but remaining options fit within constraints
- **Examples**:
  - ✅ Answer `[A1, A2, A3]` becomes `[A1, A3]` if target is missing `A2` (assuming no `chooseMax` violation)
  - ✅ Answer `[A1, A2]` merges even if target has `chooseMin: 3` (best attempt with 2 options)
  - ❌ Answer `[A1, A2, A3, A4]` is skipped if target has `chooseMax: 2` (cannot merge 4 options without losing data)
  - ✅ Answer `[A1, A2, A3, A4, A5]` becomes `[A1, A2]` if target only has A1 and A2, and `chooseMax: 3` (natural filtering brings it within max)

#### Matrix Questions

- **Answer structure**: Nested object `{ [optionCode]: { [subquestionCode]: cellValue } }`
- **Axis-A** = answer option codes (`answerOptions`) — can be displayed as rows or columns depending on survey configuration
- **Axis-B** = subquestion codes (`subquestions`) — the other axis
- **Logic**: Filter each axis-A entry and axis-B cell against target option/subquestion collections
- **Partial drops**: Individual axis-A entries missing from target are silently dropped; individual axis-B cells missing from target are silently dropped
- **Skip if**:
  - No valid axis-A entries remain after filtering → `missing_option`
  - Valid axis-A entries exist but all their axis-B cells are filtered out → `missing_subquestion`
- **Merge even if**: Some axis-A entries or axis-B cells are dropped, as long as at least one axis-A entry retains at least one valid axis-B cell

#### Subquestions

Subquestion mapping is handled within matrix question processing (see Matrix Questions above). Subquestion codes appear as axis-B keys inside the nested answer object — they are not stored as separate top-level answer keys.

#### Multi-Part Questions

- **Answer structure**: Flat object `{ [partCode]: value }` — no answer-option axis to nest under, unlike Matrix
- **Logic**: Filter each part against the target question's `subquestions` collection
- **Partial drops**: Individual parts missing from target are silently dropped
- **Skip if**: No valid parts remain after filtering → `missing_subquestion`
- **Merge even if**: Some parts are dropped, as long as at least one part maps to a valid target part

Handled by `ResponseMapper.validateMultiPartAnswer` — simpler than matrix mapping, since there is no answer-option axis to cross-reference.

### Metadata Keys

Special answer keys that are not question codes are always transferred:

- **`LANG`** - User's selected language for multi-language surveys
- Additional metadata keys can be added to `METADATA_ANSWER_KEYS` in `ResponseMapper`

These metadata values are copied as-is without validation.

### Answer Skip Reasons

When answers cannot be merged, they are skipped and tracked with specific reasons:

| Reason | Description | Example |
|--------|-------------|---------|
| `missing_question` | Question code doesn't exist in target survey | Source has question `Q5`, target doesn't |
| `incompatible_type` | Question types don't match between source and target | Source has text question, target has number |
| `missing_option` | All selected answer options are missing from target | Answer `[A1, A2]` but target has neither option |
| `missing_subquestion` | All axis-B cells in every valid axis-A entry are missing from target | Valid axis-A entries exist but all their subquestion (axis-B) codes were removed |
| `exceeds_maximum` | Answer has too many options for target's `chooseMax` constraint | Answer has 4 options selected, but target's `chooseMax: 2` |

**Note**: Answers are NOT skipped for being below `chooseMin` - they are merged as-is (best attempt, no data loss).

### Detailed Merge Behaviour Examples

These examples demonstrate the "best attempt, no data loss" philosophy in action:

#### Example 1: Natural Filtering Within Constraints ✅

**Source:**
- Question Q1 (multiple choice)
- chooseMinMax: `{ min: 1, max: 5 }`
- Answer: `[Opt1, Opt2, Opt3, Opt4, Opt5]` (5 options selected)

**Target:**
- Question Q1 (multiple choice)
- chooseMinMax: `{ min: 2, max: 3 }`
- Available options: Opt1, Opt2, Opt3 (Opt4 and Opt5 removed)

**Result:** ✅ **Merged** as `[Opt1, Opt2, Opt3]`
- Natural filtering removed Opt4 and Opt5
- Remaining 3 options fit within target's max: 3
- All available data preserved

#### Example 2: Below Minimum Still Merges ✅

**Source:**
- Question Q1 (multiple choice)
- chooseMinMax: `{ min: 1, max: 5 }`
- Answer: `[Opt1, Opt2]` (2 options selected)

**Target:**
- Question Q1 (multiple choice)
- chooseMinMax: `{ min: 3, max: 5 }`
- Available options: Opt1, Opt2 (same as source)

**Result:** ✅ **Merged** as `[Opt1, Opt2]`
- Answer has 2 options, below target's min: 3
- But all answer data is preserved (no options dropped)
- Best attempt merge succeeds

#### Example 3: Exceeds Maximum Skipped ❌

**Source:**
- Question Q1 (multiple choice)
- chooseMinMax: `{ min: 1, max: 5 }`
- Answer: `[Opt1, Opt2, Opt3, Opt4]` (4 options selected)

**Target:**
- Question Q1 (multiple choice)
- chooseMinMax: `{ min: 1, max: 2 }`
- Available options: All 4 options exist

**Result:** ❌ **Skipped** with reason `exceeds_maximum`
- Answer has 4 options, exceeds target's max: 2
- Cannot merge without dropping 2 options (data loss)
- Answer is skipped entirely to preserve integrity

#### Example 4: Filtering Violates Maximum ❌

**Source:**
- Question Q1 (multiple choice)
- chooseMinMax: `{ min: 1, max: 10 }`
- Answer: `[Opt1, Opt2, Opt3, Opt4, Opt5]` (5 options selected)

**Target:**
- Question Q1 (multiple choice)
- chooseMinMax: `{ min: 1, max: 2 }`
- Available options: Opt1, Opt2, Opt3 (Opt4 and Opt5 removed)

**Result:** ❌ **Skipped** with reason `exceeds_maximum`
- After natural filtering: `[Opt1, Opt2, Opt3]` (3 options)
- Still exceeds target's max: 2
- Cannot merge without dropping an option arbitrarily
- Answer is skipped to avoid data corruption

#### Example 5: All Options Filtered Out ❌

**Source:**
- Question Q1 (multiple choice)
- Answer: `[Opt1, Opt2]` (2 options selected)

**Target:**
- Question Q1 (multiple choice)
- Available options: Opt3, Opt4, Opt5 (Opt1 and Opt2 removed)

**Result:** ❌ **Skipped** with reason `missing_option`
- No selected options exist in target
- Would result in empty answer
- Answer is skipped

#### Example 6: No Constraints Defined ✅

**Source:**
- Question Q1 (multiple choice)
- Answer: `[Opt1, Opt2, Opt3, Opt4, Opt5, Opt6, Opt7]` (7 options selected)

**Target:**
- Question Q1 (multiple choice)
- chooseMinMax: `{ min: 0, max: 0 }` (or not defined)
- Available options: All 7 options exist

**Result:** ✅ **Merged** as `[Opt1, Opt2, Opt3, Opt4, Opt5, Opt6, Opt7]`
- No max constraint (max: 0 means unlimited)
- All options preserved
- Merge succeeds regardless of count

#### Example 7: Matrix Partial Axis-A Drop Still Merges ✅

**Source:**
- Question Q1 (matrix)
- Answer:
  ```
  {
    Opt1: { SQ1: "value-a", SQ2: "value-b" },
    Opt2: { SQ1: "value-c" },
    Opt3: { SQ1: "value-d" }
  }
  ```

**Target:**
- Question Q1 (matrix)
- Available answer options: Opt1, Opt2 (Opt3 removed)
- Available subquestions: SQ1, SQ2

**Result:** ✅ **Merged** as `{ Opt1: { SQ1: "value-a", SQ2: "value-b" }, Opt2: { SQ1: "value-c" } }`
- Opt3 axis-A entry silently dropped (not in target)
- Remaining Opt1 and Opt2 entries have valid axis-B cells
- Partial drop does not prevent merge

#### Example 8: Matrix All Axis-B Cells Removed ❌

**Source:**
- Question Q1 (matrix)
- Answer:
  ```
  {
    Opt1: { SQ2: "value-a" },
    Opt2: { SQ2: "value-b" }
  }
  ```

**Target:**
- Question Q1 (matrix)
- Available answer options: Opt1, Opt2
- Available subquestions: SQ1 only (SQ2 removed)

**Result:** ❌ **Skipped** with reason `missing_subquestion`
- Opt1 and Opt2 axis-A entries are valid (exist in target)
- But all their axis-B cells reference SQ2 which was removed
- No valid axis-B cells remain across any axis-A entry
- Answer is skipped entirely

## Merge Metadata

Merged responses include tracking metadata in a `merge` object:

```typescript
{
  merge: {
    fromSnapshotId: string; // ID of immediate source publication
    origResponseId: string; // ID of the original/root response
    at: Date; // Timestamp of merge operation
  }
}
```

This metadata:

- **`fromSnapshotId`**: Tracks which snapshot this response was directly merged from
- **`origResponseId`**: Tracks the original response ID across the entire merge chain
- **`at`**: Records when the merge operation occurred
- Appears in the response list with a "Merged" badge
- Can be used for filtering and auditing
- Preserves complete data lineage

### Publication Association

**IMPORTANT: Target snapshots MUST have an associated publication to merge responses.**

Merged responses are automatically associated with the target publication's publication using the following priority:

1. **Active publication** (where `stopped` is null) if one exists
2. **Most recent publication** (by `published` date) if no active publication exists
3. **Error** - Merge is blocked if no publication exists at all

Key points:

- **`publicationId`**: Set to the target publication's publication ID (never `null`)
- This prevents the same response from appearing multiple times when listing responses by publication
- Source response's `publicationId` is ignored during merge (it's not relevant to the target publication)
- Even stopped (unpublished) publications are valid for merging

```typescript
// Example: Merging Snapshot A → Snapshot B
// - Source response has publicationId: "pub-a" (ignored)
// - Target snapshot linked to active publication "pub-b"
// - Merged response gets publicationId: "pub-b"

// Example: Merging to unpublished snapshot
// - Target snapshot was published then unpublished (stopped publication "pub-x")
// - Merge is allowed using the stopped publication ID
// - Merged response gets publicationId: "pub-x"

// Example: Merging to never-published snapshot
// - Target snapshot has no publications at all
// - Merge fails with error: "Target snapshot must have an associated publication to merge responses."
```

### Legacy Compatibility

For backward compatibility, the system also supports the old format:

```typescript
{
  mergedFromSnapshotId: string; // Legacy format
  mergedAt: Date; // Legacy format
}
```

Legacy responses are automatically converted to the new format when read, with `origResponseId` set to `null`.

## Deduplication & Circular Merge Prevention

The merge system uses **original response tracking** via `origResponseId` to prevent duplicates across any merge scenario.

### How It Works

Each merged response stores `merge.origResponseId`, which points to the very first response in the lineage chain:

```
Response X in Snapshot A (_id: "response-123")
  ↓ merge A → B
Response Y in Snapshot B (_id: "response-456", merge.origResponseId: "response-123")
  ↓ merge B → C
Response Z in Snapshot C (_id: "response-789", merge.origResponseId: "response-123")
```

All three responses (X, Y, Z) are considered the "same response" because Y and Z both trace back to X via `origResponseId`.

### Prevented Scenarios

The deduplication system prevents:

1. **Repeat merge (A → B → B)**
   - Response already exists in target with same `origResponseId`
2. **Circular merge (A → B → A)**
   - Response would duplicate the original in its source publication
3. **Multi-hop circular (A → B → C → A)**
   - Any response tracing back to target is skipped

### Implementation Details

Before merging, the system:

1. **Collects all response `_id` values** in target publication (native responses)
2. **Collects all `merge.origResponseId` values** in target publication (merged responses)
3. **Combines into a set** of "original IDs already present"
4. **Filters source responses** where `origResponseId` OR `_id` exists in that set

For each source response:

- If `merge.origResponseId` exists: use that value for deduplication check
- If no merge metadata (native response): use the response's own `_id`

### Your Bug Scenario Fixed

The original bug from your steps 1-6 is now prevented:

```
Step 1-2: Response X created in Snapshot A
Step 3-4: Merge A → B creates Response Y
          (Y.merge.origResponseId = X._id)
Step 5:   Try merge A → B again
          Result: SKIP (X._id exists in B's origResponseId set)
Step 6:   Try merge B → A
          Result: SKIP (Y.origResponseId = X._id exists in A)
          ✅ NO DUPLICATE CREATED
```

The fix ensures that:

- **Step 5** is prevented because X's ID already exists in B via Y's `origResponseId`
- **Step 6** is prevented because Y's `origResponseId` points back to X which exists in A
- True idempotent merging where A → B → A scenarios are properly blocked

### Participant-Based Deduplication

Lineage tracking (above) only prevents *re-merging the same response*. It does not cover the case where a participant responds twice independently — once to the source snapshot, once to the target snapshot — with no merge ever connecting the two responses. A participant can respond to a survey as long as they have not already responded to the *current* snapshot; if they had previously responded to an older snapshot, that earlier response and the new one are unrelated as far as `origResponseId` lineage is concerned, but they still represent the same participant.

To prevent a participant ending up with two responses in one snapshot after a merge, the system additionally skips a source response if its `participantId` already has a response in the target snapshot — regardless of merge lineage:

```
Participant P responds to Snapshot A → Response X
Participant P responds to Snapshot B → Response Y (independent, no merge relationship to X)
Merge A → B
  Result: X is skipped (P already has response Y in B)
```

This check is applied in addition to, not instead of, the `origResponseId`-based check:

1. First, a source response is skipped if its original ID (`origResponseId` or `_id`) is already present in target (existing lineage check).
2. Otherwise, it is skipped if its `participantId` is non-null and already present among target responses.
3. Responses with no `participantId` (anonymous responses) are never skipped by this rule.
4. Within a single merge, if multiple source responses share a `participantId` that is not yet in target, only the first one (in source order) is merged — the rest are skipped, so a merge never introduces more than one response per participant into the target snapshot.

Skipped counts are tracked separately from lineage-based skips, under `stats.responsesSkippedParticipantDuplicate`, so the two skip reasons remain distinguishable in the merge preview and result.

## Completion Status

The `completed` status of merged responses is determined by answer mapping:

- **All answers mapped** → Preserves original `completed` status
- **Some answers skipped** → Sets `completed` to `null` (incomplete)

This ensures response completion status remains accurate after merge.

## Transaction Safety

Merge operations use database transactions to ensure atomicity:

- All responses are created within a single transaction
- If merge fails midway, all changes are rolled back
- No partial merges occur

## Performance Considerations

### Current Implementation

- Processes all responses in a single operation
- Suitable for datasets up to ~1,000 responses
- Transaction ensures data consistency

### Large Datasets

For merges exceeding 1,000 responses, consider:

- Monitoring operation time
- Using background job processing (future enhancement)
- Splitting into multiple smaller merges

## Error Handling

### Target Snapshot Not Published

When target publication has no associated publication:

- API returns 400 Bad Request error
- Error message: "Target snapshot must have an associated publication to merge responses."
- Frontend displays error message
- Merge operation is blocked
- **Solution**: Snapshots are created during publication, so choose a different target publication that has been published

### Incompatible Snapshots

When snapshots are incompatible:

- API returns 400 Bad Request error
- Error message: "Snapshots are incompatible and cannot be merged"
- Frontend displays incompatibility details
- Merge button is disabled

### Validation Errors

Schema validation ensures:

- All required fields are present
- Field types are correct
- Field lengths are within limits

### Transaction Failures

If merge fails during execution:

- Transaction is automatically rolled back
- No responses are created
- Error is logged and returned to client

## Compatibility Requirements

For successful merge, target publication must have:

✅ **All questions** from source (can have additional)
✅ **All answer options** from source (can have additional)
✅ **All subquestions** from source (can have additional)
✅ **Compatible question types** (exact match required)
✅ **Compatible question attributes** (target cannot have stricter constraints)
✅ **At least one associated publication** (active or stopped)

❌ Cannot merge if target publication:

- Missing questions that exist in source
- Missing answer options used in source responses
- Missing subquestions used in source responses
- Has incompatible question types
- Has stricter question attributes (e.g., required when source was optional, stricter min/max constraints)
- **Has never been published** (no associated publication)

See [Survey Comparison](../package/common/docs/survey-comparison.md) for detailed compatibility rules.

## Use Cases

### 1. Consolidate Test Responses

Merge responses from multiple test snapshots into a single snapshot for analysis.

### 2. Migrate Historical Data

When survey structure evolves, migrate responses from old snapshots to new snapshots while preserving compatible answers.

### 3. Combine Multi-Phase Data Collection

Collect responses in multiple phases using different snapshots, then consolidate all responses into a final snapshot.

### 4. Recover from Accidental Changes

If survey structure was accidentally modified, responses can be merged from a previous snapshot to restore data.

## Limitations

### Current Limitations

1. **No undo operation** - Merge is permanent (responses remain in both snapshots)
2. **No bulk merge** - Can only merge from one source at a time
3. **No response filtering** - Merges all responses (cannot filter by completion, date, etc.)
4. **Exact type matching** - Question types must match exactly (no type coercion)
5. **Single-threaded processing** - Large merges may be slow

### Future Enhancements

- Background job processing for large merges (>10,000 responses)
- Bulk merge from multiple source publications
- Response filtering before merge
- Merge conflict resolution UI
- Undo/rollback capability
- Scheduled/automated merges
- Email notifications on completion

## Implementation Details

### Backend Architecture

**Three-Layer Architecture:**

1. **ServiceSurveySnapshot.mergeSnapshots()** - Delegation layer
   - Entry point for merge operations
   - Maintains backward compatibility with existing API
   - Delegates to ServiceResponseMerge for orchestration

2. **ServiceResponseMerge.merge()** - Orchestration layer
   - Main merge workflow orchestration
   - Snapshot validation and compatibility checking
   - Publication resolution with priority logic:
     1. Explicit publication ID (if provided)
     2. Active publication (stopped = null)
     3. Most recent stopped publication
   - Deduplication logic (prevents duplicate merges via origResponseId tracking)
   - Database transaction management
   - Statistics tracking and aggregation
   - Dry-run preview generation

3. **ResponseMapper.mapResponse()** - Mapping layer
   - Individual response answer mapping
   - Question type compatibility validation
   - Answer option code mapping (by code, not ID)
   - Handles all question types:
     - Text/number/date (direct copy)
     - Single-choice (radio/select/dropdown) - validates option exists
     - Multiple-choice (checkbox) - filters to valid options
     - Matrix (nested object: axis-A = answer option codes, axis-B = subquestion codes; partial drops silently allowed per-entry and per-cell)
   - Tracks skipped answers with reasons

**Helper Methods:**

ServiceResponseMerge private methods:

- `validateSnapshots()` - Validates snapshots exist, loads data, checks compatibility
- `resolveTargetPublication()` - Determines publication ID with priority logic
- `buildDeduplicationSet()` - Builds Sets of existing "original" response IDs (lineage) and participant IDs already present in target
- `filterDuplicateResponses()` - Filters out already-merged responses (lineage) and responses whose participant already has a response in target
- `processResponses()` - Maps answers and creates new responses
- `scaleStatisticsForDryRun()` - Scales preview statistics to full dataset

**Collection Methods:**

Snapshot mapping relies on code-based lookups:

- `SurveyQuestionCollection.getByCode()` - Find questions by code
- `SurveyAnswerOptionCollection.getByCode()` - Find answer options by code
- `SurveySubquestionCollection.getByCode()` - Find subquestions by code

**File Organization:**

```
/package/api/src/model/service/core/
├── ServiceSurveySnapshot/          (utilities subdirectory)
│   ├── ResponseMapper.ts           (answer mapping logic)
│   ├── ResponseMapper.test.ts      (mapping tests)
│   ├── deduplication.test.ts       (deduplication tests)
│   └── index.ts                    (exports)
├── ServiceSurveySnapshot.ts        (snapshot management)
├── ServiceResponseMerge.ts         (merge orchestration)
└── ServiceResponseMerge.test.ts    (orchestration tests)
```

### Frontend Components

**PageSurveyEditPublicationMerge**

- Main merge page with source selection
- Preview display
- Confirmation dialog

**SnapshotMergePreview**

- Displays compatibility status
- Shows statistics and sample mappings
- Lists incompatibilities

**SnapshotMergeStatistics**

- Visual statistics display
- Progress indicators
- Skip reason breakdown

## Security & Permissions

Merge operations require the same permissions as:

- Viewing survey snapshots
- Creating responses

Standard ACL checks apply:

- User must have access to the survey
- User must have access to both snapshots
- Project-level permissions are enforced

## Testing

### Manual Testing Checklist

- [ ] Preview shows correct statistics
- [ ] Incompatible snapshots are blocked
- [ ] Compatible snapshots merge successfully
- [ ] **Unpublished target publications are blocked with clear error**
- [ ] **Merge works with active publication on target**
- [ ] **Merge works with stopped (unpublished) publication on target**
- [ ] **Most recent stopped publication is used when no active publication**
- [ ] Metadata (LANG) transfers correctly
- [ ] Answer mapping works for all question types
- [ ] Merge metadata appears in response list
- [ ] Transaction rollback works on error
- [ ] Large datasets (100+ responses) perform acceptably

### Automated Testing

Current status: Unit and integration tests not yet implemented (deferred).

Recommended test coverage:

- Answer mapping for each question type
- Metadata key handling
- Compatibility checking
- Transaction behaviour
- Error scenarios

## Troubleshooting

### "Target snapshot must have an associated publication to merge responses"

**Cause**: Target snapshot has never been published.
**Solution**: Snapshots are created during the publication process. Choose a different target publication that has been published (either currently active or previously stopped).

**Note**: Even snapshots that have been unpublished (stopped) are valid merge targets, as long as they have at least one associated publication record.

### "Snapshots are incompatible"

**Cause**: Target snapshot is missing questions, options, or has incompatible types.
**Solution**: Review incompatibility details and either:

- Update target publication to include missing items
- Choose a different target publication
- Accept that some answers will be skipped

### "Schema validation failed"

**Cause**: Response data doesn't match schema requirements.
**Solution**: Ensure both snapshots have valid survey structures.

### Merge takes too long

**Cause**: Large number of responses (>1,000).
**Solution**:

- Monitor operation and be patient
- Consider splitting into smaller merges
- Contact support for background processing

### Some answers not transferred

**Cause**: Answers reference questions/options that don't exist in target.
**Solution**: This is expected behaviour. Review skip statistics to understand what was skipped.

### "All responses have already been merged" / No new responses created

**Cause**: All source responses are already present in the target publication (detected via `origResponseId` tracking).
**Solution**: This is expected behaviour for duplicate prevention. The system prevents:

- Re-merging the same responses (A → B → B)
- Circular merges (A → B → A)
- Multi-hop circular merges (A → B → C → A)

If you need to force a re-merge (e.g., for testing), you would need to delete the existing merged responses from the target publication first.

### Merge statistics show "Already Merged" count

**Cause**: Some responses were skipped because they would create duplicates.
**Solution**: This is normal deduplication behaviour. The system automatically prevents duplicate responses while showing you exactly what was skipped and why.

### Merge statistics show "Participant Already Responded" / `responsesSkippedParticipantDuplicate` count

**Cause**: The participant already has a response in the target snapshot, even though that response has no merge lineage connecting it to the skipped source response (for example, the participant responded independently to both snapshots).
**Solution**: This is expected behaviour — a participant should have at most one response per snapshot. The source response was skipped to avoid creating a second response for that participant in the target. If you need the source response's data preserved instead of the target's, you would need to delete the existing target response first and re-run the merge.

## See Also

- [Survey Comparison](../package/common/docs/survey-comparison.md) - Compatibility checking details
- [Survey Publishing](./survey-publishing.md) - Snapshot creation and management
- [ResponseMapper source](../package/api/src/model/service/core/ServiceSurveySnapshot/ResponseMapper.ts) - Answer mapping logic
- [ServiceResponseMerge source](../package/api/src/model/service/core/ServiceResponseMerge.ts) - Merge orchestration
- [ServiceSurveySnapshot source](../package/api/src/model/service/core/ServiceSurveySnapshot.ts) - Snapshot management
- [PageSurveyEditPublicationMerge source](../package/app/src/appAdmin/page/PageSurveyEdit/PageSurveyEditPublicationMerge.tsx) - Frontend UI
