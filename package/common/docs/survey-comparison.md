<!-- cspell:disable -->
# Survey Comparison

The `SurveyCompare` service provides comprehensive comparison capabilities for Survey objects, enabling detection of differences and compatibility analysis between survey versions.

## Overview

Survey comparison serves two primary purposes:

1. **Equivalence checking** - Determine if two surveys are structurally identical
2. **Compatibility checking** - Determine if responses from one survey can be merged into another

## Usage

```typescript
import { SurveyCompare } from 'veysur-common'

const compare = new SurveyCompare()
const result = compare.compare(surveyA, surveyB)

// Check if surveys are identical
if (result.isEquivalent) {
  console.log('Surveys are identical')
}

// Check if survey-a responses can merge into survey-b
if (result.isCompatible) {
  console.log('Responses from survey-a can be merged into survey-b')
} else {
  console.log(
    'Incompatibilities found:',
    result.compatibility.incompatibilities,
  )
}
```

## Comparison Result Structure

```typescript
interface SurveyComparisonResult {
  isEquivalent: boolean; // Are the surveys identical?
  isCompatible: boolean; // Can survey-a responses merge into survey-b?
  compatibility?: CompatibilityResult;
  differences: {
    fields: FieldDifference[];
    l10n: L10nDifference[];
    collections: CollectionDifference[];
    participantAttributes: ParticipantAttributeDifference[];
    participantAttributesL10n: ParticipantAttributeL10nDifference[];
    reordering: {
      groups?: { oldOrder: string[]; newOrder: string[] };
      questions?: { oldOrder: string[]; newOrder: string[] };
    };
  };
  summary: {
    totalChanges: number;
    addedItems: number;
    removedItems: number;
    modifiedItems: number;
    reorderedCollections: number;
  };
}
```

## Equivalence vs Compatibility

### Equivalence

Two surveys are **equivalent** when they are structurally identical (ignoring metadata like `_id`, `created`, `updated`):

- Same questions with same codes
- Same question types
- Same answer options
- Same configuration
- Same localization values

**Use case**: Verify that a survey hasn't been modified.

### Compatibility

Survey-a is **compatible** with survey-b when responses collected from survey-a can be safely merged into survey-b's response dataset:

- All questions in survey-a exist in survey-b
- Question types are compatible
- All answer options from survey-a exist in survey-b
- All subquestions from survey-a exist in survey-b
- Question attributes must not have stricter constraints in survey-b

**Important**: Compatibility is **directional** - survey-b can have additional questions, answer options, or subquestions, and can have more permissive constraints, but cannot be missing anything from survey-a or have stricter validation rules.

**Use case**: Determine if responses from an old survey version can be imported into a new version.

## Compatibility Rules

### Compatible Scenarios ✅

1. **Identical surveys** - Always compatible
2. **Additional questions** - Survey-b has extra questions
3. **Additional answer options** - Survey-b has extra answer options
4. **Additional subquestions** - Survey-b has extra subquestions

```typescript
// Example: Compatible surveys
const oldSurvey = {
  questions: [{ code: 'Q1', type: 'text' }],
}

const newSurvey = {
  questions: [
    { code: 'Q1', type: 'text' },
    { code: 'Q2', type: 'text' }, // Added question - OK
  ],
}

// result.isCompatible === true
// Responses from oldSurvey can be imported into newSurvey
```

### Incompatible Scenarios ❌

1. **Missing question** - Question exists in survey-a but not in survey-b
2. **Incompatible type** - Question type changed between surveys
3. **Missing answer option** - Answer option removed from question
4. **Missing subquestion** - Subquestion removed from a matrix or Multi-Part question. `subquestions` is the same underlying collection for both families (Matrix rows/columns and Multi-Part "parts"), so `missing_subquestion` covers a removed Multi-Part part too — there is no separate "missing part" reason.

```typescript
// Example: Incompatible surveys
const oldSurvey = {
  questions: [
    { code: 'Q1', type: 'multiple-choice', answerOptions: ['A1', 'A2'] },
  ],
}

const newSurvey = {
  questions: [
    { code: 'Q1', type: 'multiple-choice', answerOptions: ['A1'] }, // A2 removed - NOT OK
  ],
}

// result.isCompatible === false
// result.compatibility.incompatibilities contains details about missing A2
```

### Attribute Compatibility Rules

Question attributes define validation constraints (required, min/max values, etc.). For compatibility, target survey attributes must not have **stricter** constraints than source survey.

#### Required Attribute

**Compatible:**

- Source required, target required ✅
- Source required, target optional ✅
- Source optional, target optional ✅

**Incompatible:**

- Source optional, target required ❌ (existing responses may have empty answers)

```typescript
// Example: Incompatible required constraint
const oldSurvey = {
  questions: [{ code: 'Q1', type: 'text', attributes: { required: false } }],
}

const newSurvey = {
  questions: [
    { code: 'Q1', type: 'text', attributes: { required: true } }, // Now required - NOT OK
  ],
}

// Existing responses may have empty Q1 answers which would violate new requirement
```

#### Choice Min/Max (Multiple Choice Questions)

**Compatible:**

- Target has same or lower min ✅
- Target has same or higher max ✅
- Target has unlimited max (0) ✅

**Incompatible:**

- Target has higher min ❌ (responses with fewer choices become invalid)
- Target has lower max ❌ (responses with more choices become invalid)
- Target adds max when source had unlimited ❌

```typescript
// Example: Incompatible choice constraints
const oldSurvey = {
  questions: [
    {
      code: 'Q1',
      type: 'multipleChoice',
      attributes: { chooseMinMax: { min: 1, max: 5 } },
    },
  ],
}

const newSurvey = {
  questions: [
    {
      code: 'Q1',
      type: 'multipleChoice',
      attributes: { chooseMinMax: { min: 2, max: 3 } },
    }, // Stricter - NOT OK
  ],
}

// Existing responses with 1 choice or 4-5 choices become invalid
```

#### Length Min/Max (Text Questions)

Same logic as choice min/max - target cannot have higher min or lower max.

```typescript
// Example: Compatible length constraints (more permissive)
const oldSurvey = {
  questions: [
    {
      code: 'Q1',
      type: 'text',
      attributes: { lengthMinMax: { min: 10, max: 100 } },
    },
  ],
}

const newSurvey = {
  questions: [
    {
      code: 'Q1',
      type: 'text',
      attributes: { lengthMinMax: { min: 5, max: 200 } },
    }, // More permissive - OK
  ],
}
```

#### Number Min/Max (Number Questions)

Same logic as choice/length min/max - target cannot have stricter numeric range.

#### Negative Numbers Allowed (Number Questions)

**Compatible:**

- Source allows negatives, target allows negatives ✅
- Source disallows negatives, target disallows negatives ✅
- Source disallows negatives, target allows negatives ✅

**Incompatible:**

- Source allows negatives, target disallows negatives ❌ (existing negative values become invalid)

```typescript
// Example: Incompatible negative constraint
const oldSurvey = {
  questions: [
    { code: 'Q1', type: 'number', attributes: { numberNegAllowed: true } },
  ],
}

const newSurvey = {
  questions: [
    { code: 'Q1', type: 'number', attributes: { numberNegAllowed: false } }, // No longer allows negatives - NOT OK
  ],
}

// Existing responses with negative values become invalid
```

## Incompatibility Details

When surveys are incompatible, detailed information is provided:

```typescript
interface IncompatibilityDetail {
  path: string; // e.g., "questions[Q1].answerOptions[A2]"
  reason: IncompatibilityReason; // Type of incompatibility
  itemType: 'question' | 'answerOption' | 'subquestion' | 'participantAttribute';
  itemCode: string; // Code of the missing/incompatible item
  surveyAType?: string; // For type changes
  surveyBType?: string; // For type changes
  message?: string; // Human-readable description
}
```

### Incompatibility Reasons

- `missing_question` - Question in survey-a doesn't exist in survey-b
- `incompatible_type` - Question type changed incompatibly
- `missing_answer_option` - Answer option in survey-a removed in survey-b
- `missing_subquestion` - Subquestion in survey-a removed in survey-b (matrix row/column or Multi-Part part — same collection, same reason code)
- `incompatible_required_constraint` - Target requires answer but source didn't (applies to questions and participant attributes)
- `incompatible_choice_constraint` - Target has stricter min/max choices (multiple choice)
- `incompatible_length_constraint` - Target has stricter min/max length (text)
- `incompatible_number_constraint` - Target has stricter number constraints
- `incompatible_negative_constraint` - Target disallows negatives but source allowed
- `missing_participant_attribute` - Custom participant attribute in survey-a doesn't exist in survey-b

### Compatibility Summary

Quick statistics about incompatibilities:

```typescript
{
  totalIncompatibilities: 5,
  missingQuestions: 1,
  incompatibleTypes: 1,
  missingAnswerOptions: 1,
  missingSubquestions: 0,
  incompatibleAttributes: 2,
  incompatibleRequiredConstraints: 1,
  incompatibleChoiceConstraints: 0,
  incompatibleLengthConstraints: 1,
  incompatibleNumberConstraints: 0,
  missingParticipantAttributes: 0
}
```

## Difference Detection

The comparison service detects various types of changes:

### Field Differences

Changes to primitive fields (name, createdById, etc.):

```typescript
{
  path: 'name',
  type: 'modified',
  oldValue: 'Survey V1',
  newValue: 'Survey V2'
}
```

### L10n Differences

Changes to localized content:

```typescript
{
  path: 'title',
  type: 'added',
  language: 'spa',
  newValue: 'Título del Cuestionario'
}
```

### Collection Differences

Changes to questions, groups, answer options, subquestions:

```typescript
{
  path: 'questions[Q1]',
  type: 'added',
  itemType: 'question',
  itemId: 'Q1',
  newData: { /* question data */ }
}
```

### Participant Attribute Differences

Changes to participant attribute definitions (structural):

```typescript
// Attribute added
{ type: 'added', name: 'company', newData: { required: true, internal: false, example: 'Acme Corp' } }

// Attribute removed
{ type: 'removed', name: 'department', oldData: { required: false, internal: false } }

// Attribute definition changed (required/internal/example)
{ type: 'modified', name: 'role', oldData: { required: false, ... }, newData: { required: true, ... } }
```

Changes to participant attribute localization:

```typescript
// Label changed for a language
{ type: 'modified', name: 'company', language: 'fra', field: 'label', oldValue: 'Société', newValue: 'Entreprise' }

// Description added for a new language
{ type: 'added', name: 'role', language: 'deu', field: 'description', newValue: 'Ihre Rolle im Unternehmen' }
```

### Reordering Detection

Detection of reordered groups or questions:

```typescript
{
  groups: {
    oldOrder: ['G1', 'G2', 'G3'],
    newOrder: ['G3', 'G1', 'G2']
  }
}
```

## Common Use Cases

### 1. Check if survey was modified

```typescript
const result = compare.compare(originalSurvey, currentSurvey)
if (!result.isEquivalent) {
  console.log(
    `Survey modified: ${result.summary.totalChanges} changes detected`,
  )
}
```

### 2. Validate response import compatibility

```typescript
const result = compare.compare(oldSurveyVersion, newSurveyVersion)
if (!result.isCompatible) {
  console.error('Cannot import responses - incompatible surveys')
  result.compatibility.incompatibilities.forEach((issue) => {
    console.error(`- ${issue.message}`)
  })
}
```

### 3. Review survey changes

```typescript
const result = compare.compare(draftSurvey, publishedSurvey)
console.log('Changes to review:')
console.log(`- Added items: ${result.summary.addedItems}`)
console.log(`- Removed items: ${result.summary.removedItems}`)
console.log(`- Modified items: ${result.summary.modifiedItems}`)
```

### 4. Safe survey updates

```typescript
// Before publishing a new survey version, ensure it's compatible
// with the previous version to preserve existing responses
const result = compare.compare(currentVersion, newVersion)

if (!result.isCompatible) {
  throw new Error('New version is incompatible with existing responses')
}

// Safe to publish - existing responses can still be analysed
publishSurvey(newVersion)
```

## Architecture

The `SurveyCompare` service uses a composition-based architecture with specialised comparators:

- **L10nComparator** - Compares localised fields
- **FieldComparator** - Compares primitive and nested object fields
- **CollectionComparator** - Compares collections (questions, groups, etc.)
- **ReorderingDetector** - Detects reordering of collections
- **ParticipantAttributeComparator** - Compares participant attribute definitions and their localized labels/descriptions
- **CompatibilityChecker** - Validates response merge compatibility
- **SummaryBuilder** - Builds summary statistics

## Type Compatibility

Currently, question types must match exactly for compatibility. Future enhancements may support compatible type transitions:

- `text` → `textarea` (potential compatible upgrade)
- `single-choice` → `multiple-choice` (potential compatible upgrade)

## Best Practices

1. **Always check compatibility before importing responses** from one survey version to another
2. **Use equivalence checking** to verify survey hasn't been tampered with
3. **Review incompatibility details** to understand what changes prevent compatibility
4. **Design survey updates carefully** to maintain backward compatibility when possible
5. **Consider creating new surveys** instead of modifying existing ones if breaking compatibility

## Key Files

- [SurveyCompare/index.ts](../src/model/service/SurveyCompare/index.ts) — Entry point and main `compare()` method
- [CompatibilityChecker.ts](../src/model/service/SurveyCompare/CompatibilityChecker.ts) — Compatibility validation logic
- [ParticipantAttributeComparator.ts](../src/model/service/SurveyCompare/ParticipantAttributeComparator.ts) — Participant attribute difference detection
- [types.ts](../src/model/service/SurveyCompare/types.ts) — Type definitions
- [SurveyCompare.test.ts](../src/model/service/SurveyCompare.test.ts) — Test suite
