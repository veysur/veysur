# Operations

## Overview

Operations are the public API for modifying surveys. They provide a clean, type-safe interface that handles optimistic updates, validation, and buffering automatically.

The operation factory pattern centralizes all mutation logic while keeping it modular and maintainable. Operations work seamlessly with the **[Generalized Patchable State Pattern](../generalised-patchable-state.md)** - they call `bufferPatches` which is provided by the generic `usePatchableState` hook via the survey adapter.

## createSurveyOperations Factory

The `createSurveyOperations` function is a factory that creates all survey mutation operations using dependency injection.

### Factory Pattern

```typescript
export function createSurveyOperations({
  updateSurveyState,
  bufferPatches,
  setSurveyFocus,
  validateAndBuffer,
}: SurveyOperationsDeps): SurveyOperations {
  return {
    // Survey operations
    ...createSurveyOps({ updateSurveyState, validateAndBuffer }),

    // Section (group) operations
    ...createGroupOperations({
      updateSurveyState,
      validateAndBuffer,
      setSurveyFocus,
    }),

    // Question operations
    ...createQuestionOperations({
      updateSurveyState,
      validateAndBuffer,
      setSurveyFocus,
    }),

    // Content element operations
    ...createContentOperations({
      updateSurveyState,
      validateAndBuffer,
      setSurveyFocus,
    }),

    // Answer option operations
    ...createAnswerOptionOps({ updateSurveyState, validateAndBuffer }),

    // Participant operations
    ...createSurveyParticipantOps({ updateSurveyState, validateAndBuffer }),

    // ... 10+ more operation modules
  }
}
```

### Dependencies Explained

**updateSurveyState**

- Function to update the survey state with a new instance
- Receives updater function, returns updated survey
- Handles store synchronization

**bufferPatches**

- (Deprecated) Direct buffer access, prefer `validateAndBuffer`

**setSurveyFocus**

- Function to set which entity is currently focused
- Used for UI highlighting and scrolling

**validateAndBuffer**

- Validates patches with @datacapy/schema
- Buffers valid patches for persistence
- Tracks validation errors

**File:** `/package/app/src/appAdmin/component/SurveyEditor/hook/createSurveyOperations.ts`

## Operation Modules

Each entity type has its own operation module for better organization:

**Core Entity Operations:**

- `surveyOperations.ts` - Survey-level updates (name, title, description, status)
- `groupOperations.ts` - Section CRUD (create, update, delete, `moveSection`)
- `questionOperations.ts` - Question CRUD and configuration
- `contentOperations.ts` - Content element CRUD and configuration
- `surveyWelcomeOperations.ts` / `surveyThankYouOperations.ts` - Welcome and thank-you text, stored on the singleton sections
- `answerOptionOperations.ts` - Answer options for choice questions

**Supporting Entity Operations:**

- `surveyParticipantOperations.ts` - Participant management
- `surveyConsentOperations.ts` - Consent form configuration
- `surveyConsentQuestionOperations.ts` - Consent questions
- `surveyCustomTermOperations.ts` - Custom terminology
- `surveyEmailOperations.ts` - Email templates
- `surveyTriggerOperations.ts` - Automated triggers
- `surveyImageOperations.ts` - Image uploads and management
- Plus more...

**Location:** All in `/package/app/src/appAdmin/component/SurveyEditor/operations/`

## Standard Operation Pattern

Every operation follows the same four-step pattern:

### 1. Optimistic Update

Apply the change to local state immediately so the user sees instant feedback.

### 2. Create Patch

Create a minimal patch object with only the changed fields.

### 3. Validate and Buffer

Validate the patch with a @datacapy/schema, then buffer if valid.

### 4. Return Updated State

Return the updated survey instance (for potential chaining).

## Example Operation

Here's a real operation from `questionOperations.ts`:

```typescript
updateQuestionText: (questionId: string, text: string, lang: LangKey = 'en') =>
  updateSurveyState((survey) => {
    // 1. Optimistic Update
    survey = survey.mutateQuestion(questionId, (q) => q.updateText(text, lang))

    // 2. Create Patch (minimal data)
    const question = survey.elements.getQuestionById(questionId)

    // 3. Validate and Buffer
    validateAndBuffer({
      patches: [
        {
          type: SURVEY_ENTITY_TYPE_ELEMENT,
          action: BUFFERED_PATCH_ACTION_UPDATE,
          id: questionId,
          data: { text: question?.text }, // Full text object for all languages
        },
      ],
      validation: {
        schema: questionTextSchema,
        path: `text.${lang}`,
        value: { [lang]: text },
        entityType: 'question',
        entityId: questionId,
        field: 'text',
      },
    })

    // 4. Return Updated State
    return survey
  })
```

### Breakdown

**Optimistic Update:**

```typescript
survey = survey.mutateQuestion(questionId, (q) => q.updateText(text, lang))
```

- Uses immutable methods on Survey class
- User sees change immediately in UI

**Create Patch:**

```typescript
data: {
  text: question?.text
}
```

- Only includes the changed field (`text`)
- Sends full text object (all languages) because server needs complete field

**Validate and Buffer:**

```typescript
validation: {
  schema: questionTextSchema,
  path: `text.${lang}`,
  value: { [lang]: text },
  entityType: 'question',
  entityId: questionId,
  field: 'text'
}
```

- Validates only the changed language
- Schema: @datacapy/schema defining text field rules
- Path: dot-notation path within the entity
- Value: what to validate
- Entity metadata: used for error tracking

**Return:**

```typescript
return survey
```

- Returns updated instance
- Allows potential operation chaining (though rarely used)

## More Operation Examples

### Create Operation

```typescript
addQuestion: (sectionId: string, options?: { afterId?: string; lang?: string; type?: string }) => {
  const id = Survey.genElementId()
  updateSurveyState((survey) => {
    const { afterId, lang, type } = options || {}
    survey = survey.addQuestion(sectionId, { _id: id, type }, { afterId, lang })
    const created = survey.elements.getQuestionById(id)!

    validateAndBuffer({
      patches: [
        {
          type: SURVEY_ENTITY_TYPE_ELEMENT,
          action: BUFFERED_PATCH_ACTION_CREATE,
          id,
          data: created, // Full object for creation
        },
        {
          // The element's position lives on the survey
          type: SURVEY_ENTITY_TYPE_SURVEY,
          action: BUFFERED_PATCH_ACTION_UPDATE,
          id: survey._id,
          data: { elementIds: survey.elementIds },
        },
      ],
    })
    return survey
  })
  setSurveyFocus({ entityType: SURVEY_ENTITY_TYPE_ELEMENT, id })
}
```

**Notes:**

- The id is generated up front so focus can be set to the new element
- Creation sends the full object plus a survey patch for the new `elementIds` order
- Content elements follow the same shape through `addContent` in `contentOperations.ts`

### Delete Operation

```typescript
deleteQuestion: (questionId: string) => {
  updateSurveyState((survey) => {
    survey = survey.deleteQuestion(questionId)

    validateAndBuffer({
      patches: [
        {
          type: SURVEY_ENTITY_TYPE_ELEMENT,
          action: BUFFERED_PATCH_ACTION_DELETE,
          id: questionId,
          data: null, // No data needed for deletion
        },
        {
          type: SURVEY_ENTITY_TYPE_SURVEY,
          action: BUFFERED_PATCH_ACTION_UPDATE,
          id: survey._id,
          data: { elementIds: survey.elementIds },
        },
      ],
    })
    return survey
  })
  setSurveyFocus(null) // Clear focus
}
```

**Notes:**

- No data in the delete patch (just the ID is enough)
- The survey patch keeps `elementIds` in step
- No validation needed
- Clears focus state

### Reorder Operation

```typescript
moveQuestion: (questionId: string, targetSectionId: string, newIndex: number) =>
  updateSurveyState((survey) => {
    survey = survey.moveQuestion(questionId, targetSectionId, newIndex)
    const sectionId = survey.elements.getById(questionId)?.sectionId

    validateAndBuffer({
      patches: [
        {
          type: SURVEY_ENTITY_TYPE_ELEMENT,
          action: BUFFERED_PATCH_ACTION_UPDATE,
          id: questionId,
          data: { sectionId },
        },
        {
          type: SURVEY_ENTITY_TYPE_SURVEY,
          action: BUFFERED_PATCH_ACTION_UPDATE,
          id: survey._id,
          data: { elementIds: survey.elementIds },
        },
      ],
    })
    return survey
  })
```

**Notes:**

- Order is not stored per element: the survey holds one global `elementIds` array, and each element holds its parent `sectionId`
- A move therefore sends one element patch (`sectionId`) and one survey patch (`elementIds`)
- `moveSection(sectionId, newIndex)` sends a single survey patch with `{ sectionIds, elementIds }`

## Using Operations in Components

### Access via Zustand Store

```typescript
import { useSurveyEditorStore } from '../hook/useSurveyEditorStore'

function QuestionEditor({ questionId }: Props) {
  const operations = useSurveyEditorStore((s) => s.operations)
  const question = useSurveyEditorStore((s) =>
    s.survey?.elements.getQuestionById(questionId)
  )

  const handleTextChange = (text: string) => {
    operations.updateQuestionText(questionId, text, 'en')
  }

  return (
    <input
      value={question?.text.eng || ''}
      onChange={(e) => handleTextChange(e.target.value)}
    />
  )
}
```

### Multiple Operations

```typescript
function QuestionToolbar({ questionId }: Props) {
  const operations = useSurveyEditorStore((s) => s.operations)

  const handleDuplicate = () => {
    operations.duplicateQuestion(questionId)
  }

  const handleDelete = () => {
    if (confirm('Delete this question?')) {
      operations.deleteQuestion(questionId)
    }
  }

  const handleMoveUp = () => {
    operations.moveQuestionUp(questionId)
  }

  return (
    <div>
      <button onClick={handleDuplicate}>Duplicate</button>
      <button onClick={handleDelete}>Delete</button>
      <button onClick={handleMoveUp}>Move Up</button>
    </div>
  )
}
```

## Creating New Operations

To add a new operation:

### 1. Identify the Entity

Determine which entity you're modifying (survey, section, element (question or content), etc.).

### 2. Choose the Module

Add to existing module or create new one:

- Existing: Add to `questionOperations.ts`, `surveyOperations.ts`, etc.
- New entity: Create `myEntityOperations.ts`

### 3. Follow the Pattern

```typescript
export function createMyEntityOperations(deps: OperationDeps) {
  const { updateSurveyState, validateAndBuffer, setSurveyFocus } = deps

  return {
    updateMyEntity: (id: string, field: string, value: any) =>
      updateSurveyState((survey) => {
        // 1. Optimistic update
        survey = survey.mutateMyEntity(id, (entity) =>
          entity.updateField(field, value),
        )

        // 2. Get updated data
        const entity = survey.myEntities.getById(id)

        // 3. Validate and buffer
        validateAndBuffer({
          patches: [
            {
              type: 'myEntity',
              action: 'update',
              id,
              data: { [field]: value },
            },
          ],
          validation: {
            schema: myEntitySchema,
            path: field,
            value: { [field]: value },
            entityType: 'myEntity',
            entityId: id,
            field,
          },
        })

        // 4. Return
        return survey
      }),
  }
}
```

### 4. Register in Factory

Add to `createSurveyOperations`:

```typescript
export function createSurveyOperations(deps: SurveyOperationsDeps) {
  return {
    // ... existing operations
    ...createMyEntityOperations(deps),
  }
}
```

### 5. Add to TypeScript Types

Update `SurveyOperations` interface:

```typescript
export interface SurveyOperations {
  // ... existing operations
  updateMyEntity: (id: string, field: string, value: any) => void
}
```

## Best Practices

### Keep Operations Pure

Operations should only update survey state, create patches, and validate. Don't add side effects like API calls or analytics.

### Minimal Patches

Only include changed fields in patch data. Don't send entire objects unless necessary (create operations).

### Validation is Optional

Not all operations need validation (e.g., delete, reorder). Use `validation: null` when appropriate.

### Focus Management

Set focus for create operations, clear for delete. Helps with UI highlighting and scrolling.

### Consistent Naming

- `create*` - Creates new entity
- `update*` - Updates existing entity
- `delete*` - Deletes entity
- `reorder*` - Changes order
- `move*` - Moves entity (up/down)
- `duplicate*` - Clones entity

---

Next: [Advanced Topics](./advanced-topics.md) - Data loss prevention, error handling, and more
