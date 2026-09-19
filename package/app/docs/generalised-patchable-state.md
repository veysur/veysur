# Generalized Patchable State Pattern

## Overview

The Patchable State pattern provides a reusable solution for managing data that requires buffered edits with optimistic updates. It combines React Query for data fetching, a patch buffer for batching changes, and automatic debounced persistence with retry logic.

## Why Use This Pattern?

**Use when you need:**

- Optimistic UI updates (changes visible immediately)
- Debounced persistence (avoid network spam on every keystroke)
- Automatic retry logic for failed saves
- Buffered edits that apply even after server refetch
- Type-safe state management with TypeScript

**Examples:** Survey editor, email template settings, user preferences, project configurations

## Core Components

### 1. `usePatchableState<TData, TPatch>` Hook

Generic hook that manages the complete lifecycle of patchable data.

**Location:** `/package/app/src/hook/usePatchableState.ts`

```typescript
const {
  data, // Current data state
  bufferPatches, // Add patches to buffer
  patchBuffer, // Current buffer state
  patchMutation, // Mutation status
  updateState, // Manual state updates
  isLoading, // Loading states
  isFetching,
  isError,
} = usePatchableState<TData, TPatch>({
  queryKey: ['myData', id],
  fetchFn: () => fetchData(id),
  applyPatchesFn: (patches, data) => applyPatches(patches, data),
  persistPatchesFn: (patches) => savePatches(id, patches),
  debounceMs: 2000, // Optional: default 2000ms
})
```

### 2. Domain-Specific Adapters

Wrap `usePatchableState` with domain-specific configuration:

```typescript
// Example: Survey adapter
export function useSurveyPatchableState({ surveyId }) {
  return usePatchableState<Survey, SurveyPatch>({
    queryKey: ['survey', surveyId],
    fetchFn: async () => {
      const data = await getSurveyApi().getOne(surveyId)
      return new Survey(data)
    },
    applyPatchesFn: (patches, survey) =>
      PatchApplierSurvey.applyPatches(patches, survey),
    persistPatchesFn: async (patches) =>
      await getSurveyApi().patch(surveyId, patches),
    enabled: !!surveyId,
  })
}
```

### 3. Immutable Data Models

Data classes should be immutable and provide methods that return new instances:

```typescript
class EmailTemplateCollection {
  private readonly templates: Map<string, Template>

  set(key: string, value: Template): EmailTemplateCollection {
    const newTemplates = new Map(this.templates)
    newTemplates.set(key, value)
    return new EmailTemplateCollection(newTemplates)
  }

  delete(key: string): EmailTemplateCollection {
    const newTemplates = new Map(this.templates)
    newTemplates.delete(key)
    return new EmailTemplateCollection(newTemplates)
  }
}
```

### 4. Patch Appliers

Apply patches to data models immutably:

```typescript
class PatchApplierSurvey {
  static applyPatches(patches: Patch[], survey: Survey): Survey {
    let result = survey
    for (const patch of patches) {
      result = this.applyPatch(patch, result)
    }
    return result
  }

  private static applyPatch(patch: Patch, survey: Survey): Survey {
    switch (patch.action) {
      case 'update':
        return survey.update(patch.data)
      case 'delete':
        return survey.delete(patch.data)
      default:
        return survey
    }
  }
}
```

## How It Works

### 1. Optimistic Updates

When you call `bufferPatches()`, changes are applied **immediately** to the local cache:

```typescript
bufferPatches([
  { type: 'survey', action: 'update', data: { title: 'New Title' } },
])
// ↓ UI updates instantly (optimistic)
// ↓ Patch buffered
// ↓ After 2s debounce → persist to server
// ↓ On success → invalidate and refetch
// ↓ On error → retry up to 3 times
```

### 2. Data Flow

```
User Action
    ↓
bufferPatches(patches)
    ↓
┌─────────────────────────────────────┐
│ 1. Add to PatchBuffer               │
│ 2. Apply patches to query cache     │ ← Optimistic update
└─────────────────────────────────────┘
    ↓
Wait for debounce (2s default)
    ↓
persistPatchesFn(patches)
    ↓
┌─────────Success?─────────┐
│                           │
Yes                        No
│                           │
↓                           ↓
Invalidate & Refetch    Retry (up to 3x)
↓                           │
Apply buffered patches  ────┘
to fresh data
```

### 3. Buffered Patch Preservation

When data refetches (window focus, invalidation), buffered patches are **reapplied** to prevent losing pending changes:

```typescript
// User is editing while server refetch happens
queryFn: async () => {
  const freshData = await fetchFn()
  const bufferedPatches = patchBuffer.getPatches()

  // Reapply buffered patches to fresh data
  if (bufferedPatches.length > 0) {
    return applyPatchesFn(bufferedPatches, freshData)
  }

  return freshData
}
```

## Usage Examples

### Example 1: Survey Title Edit

```typescript
// In component
const { data: survey, bufferPatches } = useSurveyPatchableState({ surveyId })

const handleTitleChange = (newTitle: string) => {
  bufferPatches([
    {
      type: 'survey',
      action: 'update',
      data: { title: newTitle },
    },
  ])
}

// User types "Hello"
// → Each keystroke buffers a patch
// → UI shows "Hello" immediately (optimistic)
// → After 2s of no typing → persist to server
// → On success → refetch confirms server state
```

### Example 2: Email Template "Use Default" Checkbox

```typescript
const { data: templates, bufferPatches } = useEmailTemplatePatchableState({
  surveyId,
})

const handleUseDefault = (type: string, lang: string, useDefault: boolean) => {
  if (useDefault) {
    // Delete custom template → revert to default
    bufferPatches([
      {
        type: 'emailTemplate',
        action: 'update',
        data: { type, lang, subject: null, body: null },
      },
    ])
  } else {
    // Create custom template
    bufferPatches([
      {
        type: 'emailTemplate',
        action: 'update',
        data: { type, lang, subject: defaultSubject, body: defaultBody },
      },
    ])
  }
}

// Checkbox toggles instantly (optimistic)
// Inputs enable/disable instantly
// After 2s → persist to server
```

### Example 3: Independent Entity Management

```typescript
// Survey and email templates manage state independently
const { data: survey, bufferPatches: bufferSurveyPatches } =
  useSurveyPatchableState({ surveyId })

const { data: templates, bufferPatches: bufferTemplatePatches } =
  useEmailTemplatePatchableState({ surveyId })

// No synchronization needed - separate lifecycles
// Editing survey doesn't affect email template queries
// Editing email templates doesn't affect survey queries
```

## Configuration Options

```typescript
interface UsePatchableStateConfig<TData, TPatch> {
  // Required
  queryKey: QueryKey // React Query cache key
  fetchFn: () => Promise<TData> // Fetch fresh data
  applyPatchesFn: (patches, data) => TData // Apply patches immutably
  persistPatchesFn: (patches) => Promise<void> // Save to server

  // Optional
  entityId?: string // Entity identifier
  enabled?: boolean // Enable/disable query (default: true)
  debounceMs?: number // Debounce delay (default: 2000)
  refetchInterval?: number | false // Auto-refetch (default: false)
  refetchOnMount?: boolean | 'always' // Refetch on mount (default: 'always')
  refetchOnWindowFocus?: boolean // Refetch on focus (default: true)

  // Callbacks
  onPatchBufferChange?: (buffer) => void // Buffer state changes
  onPersistSuccess?: () => void | Promise<void> // Successful persist — return a promise (e.g. from queryClient.invalidateQueries) and the hook awaits it before considering the persist complete; see mutation-cache-invalidation.md
  onPersistError?: (error) => void // Failed persist
}
```

## Architecture Pattern

### Layer 1: Generic Hook

```
usePatchableState<TData, TPatch>
├─ React Query integration
├─ PatchBuffer management
├─ Optimistic updates
├─ Debounced persistence
└─ Retry logic
```

### Layer 2: Domain Adapters

```
useSurveyPatchableState
├─ Survey-specific config
├─ Auth handling
├─ Survey API calls
└─ PatchApplierSurvey

useEmailTemplatePatchableState
├─ Email template config
├─ Auth handling
├─ Email template API calls
└─ PatchApplierEmailTemplate
```

### Layer 3: Components

```
SurveyEditor
├─ Uses useSurveyPatchableState
└─ Calls bufferPatches on user actions

EmailTemplateSettings
├─ Uses useEmailTemplatePatchableState
└─ Calls bufferPatches on user actions
```

## Key Benefits

1. **Separation of Concerns**: Each entity manages its own state independently
2. **Optimistic UX**: Immediate UI feedback without waiting for server
3. **Network Efficiency**: Debouncing reduces API calls
4. **Resilience**: Automatic retry logic handles transient failures
5. **Type Safety**: Full TypeScript generics support
6. **Reusability**: Write pattern once, use for all patchable entities
7. **Testability**: Generic hook tested once, domain logic easily mocked

## Creating a New Patchable Entity

**1. Create immutable data model:**

```typescript
class MyEntity {
  update(data: Partial<MyEntity>): MyEntity {
    return new MyEntity({ ...this, ...data })
  }
}
```

**2. Create patch applier:**

```typescript
class PatchApplierMyEntity {
  static applyPatches(patches: Patch[], entity: MyEntity): MyEntity {
    // Apply patches immutably
  }
}
```

**3. Create adapter hook:**

```typescript
export function useMyEntityPatchableState({ entityId }) {
  return usePatchableState<MyEntity, Patch>({
    queryKey: ['myEntity', entityId],
    fetchFn: () => api.get(entityId),
    applyPatchesFn: PatchApplierMyEntity.applyPatches,
    persistPatchesFn: (patches) => api.patch(entityId, patches),
  })
}
```

**4. Use in components:**

```typescript
const { data, bufferPatches } = useMyEntityPatchableState({ entityId })
```

## Files

### Core

- `/package/app/src/hook/usePatchableState.ts` - Generic hook

### Implementations

- `/package/app/src/appAdmin/component/SurveyEditor/hook/useSurveyPatchableState.ts` - Survey adapter
- `/package/app/src/appAdmin/component/SurveyEditor/hook/useEmailTemplatePatchableState.ts` - Email template adapter
- `/package/app/src/appAdmin/component/SurveyEditor/hook/useSurveyEmailTemplates.ts` - Email template consumer hook

### Models

- `/package/common/src/model/constructor/EmailTemplateSurveyCollection.ts` - Email template collection
- `/package/common/src/model/service/PatchApplierSurvey.ts` - Survey patch applier
- `/package/common/src/model/service/PatchApplierEmailTemplate.ts` - Email template patch applier
