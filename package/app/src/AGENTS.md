# Implementation Patterns — VeySur App src/

Reference for the recurring patterns used across all four sub-apps. Auto-discovered by Claude Code when working inside `src/` — not loaded in unrelated (API, infra) conversations.

## API Class Pattern

All API interactions are encapsulated in API classes that extend the `Api` base class.

```typescript
import { Api, ErrorRest } from 'model'
import { PropsOf, EntityType } from 'veysur-common'

export class EntityApi extends Api {
  async getAll(page: number = 1): Promise<PropsOf<EntityType>[]> {
    try {
      return await this.getClient().get<PropsOf<EntityType>[]>('/entity', {
        params: { page },
      })
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async create(data: Partial<EntityType>): Promise<PropsOf<EntityType>> {
    try {
      return await this.getClient().post<PropsOf<EntityType>>('/entity', {
        data,
      })
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async update(
    id: string,
    data: Partial<EntityType>,
  ): Promise<PropsOf<EntityType>> {
    try {
      return await this.getClient().patch<PropsOf<EntityType>>(
        `/entity/${id}`,
        { data },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.getClient().delete(`/entity/${id}`)
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }
}
```

Key principles: extend `Api` (provides `getClient()`), wrap every call in try/catch with `ErrorRest.fromRequestError()`, use TypeScript generics for types.

Reference implementations: `appAdmin/component/AdminSurvey/model/api/SurveyApi.ts`, `appAdmin/component/SurveyParticipant/model/api/SurveyParticipantApi.ts`

## Factory and Registry Pattern

Singleton Registry with factory functions for dependency injection — ensures one instance per API class.

```typescript
// registry/getEntityApi.ts
import { Registry } from 'common'
import { KEY_REGISTRY_API_ENTITY } from 'appAdmin/common'
import { getRestClient } from 'registry'
import { EntityApi } from '../model'

export function createEntityApi() {
  return new EntityApi(getRestClient())
}

export const getEntityApi = (): EntityApi =>
  Registry.getInstance().get(KEY_REGISTRY_API_ENTITY, createEntityApi)
```

Registry keys are centralized constants in `appAdmin/common/keyRegistry.ts` (or the equivalent for each app). Use `getXxxApi()` in hooks — never instantiate directly.

**Creating new API classes**: (1) create class extending `Api`, (2) add registry key to `keyRegistry.ts`, (3) create factory file with `createXxxApi()` and `getXxxApi()`.

## Component Directory Organization

```
appAdmin/component/EntityName/
├── model/
│   ├── api/
│   │   └── EntityApi.ts           # API class
│   ├── schema/
│   │   └── SchemaEntityForm.ts    # Schema + form data type
│   └── index.ts
├── registry/
│   ├── getEntityApi.ts            # Factory and registry getter
│   └── index.ts
├── hook/
│   ├── useEntityList.ts
│   ├── useEntityCreate.ts
│   └── index.ts
├── form/
│   └── EntityForm.tsx
├── EntityComponent.tsx
└── index.ts
```

**Feature-level** (inside `component/`): self-contained features used within one section (Survey editor, Participant management).

**App-level** (at app root): cross-cutting concerns used across multiple pages (auth, profile, settings). See `appAccount/` for the app-level pattern.

## Common Reusable Components

Always check `/component` before creating a custom implementation.

### EmptyState

Generic empty state with loading skeleton support.

Props: `isLoading: boolean`, `message: string`, `loadingMessage?: string`

Reference: `appAdmin/page/PageSurveyEdit/PageSurveyEditResponse.tsx`

### OtpInput

Segmented numeric code input (2FA, email verification).

Props: `value: string`, `onChange: (value: string) => void`, `onComplete?: () => void`, `length?: number` (default 6), `disabled?: boolean`, `autoFocus?: boolean`

Handles auto-advance, backspace, arrow keys, paste-to-fill, `autocomplete="one-time-code"`.

Reference: `component/LoginForm/LoginForm.tsx`, `appAccount/page/PageVerifyEmail.tsx`

### Other

- **DataTable** (`component/DataTable`) — table with selection, loading states, pagination
- **Pagination** (`component/Pagination`) — pagination controls
- **PageHeader** (`component/PageHeader`) — page headers with icons, descriptions, and a back button (see Back Navigation Pattern below)
- **Shadcn/ui** (`component/shadcn/*`) — Button, Card, Alert, etc.
- **TimezoneNotice** (`component/TimezoneNotice`) — one-line caption stating which zone a page's timestamps are shown in; pair with the `useDisplayTimezone()` hook and the `common/formatDateTime.ts` helpers (see [/docs/timestamps.md](../../../docs/timestamps.md))

## Back Navigation Pattern

`PageHeader`'s `backUrl` prop renders a `BackButton` (`component/BackButton.tsx`). Don't build ad-hoc back buttons with `navigate('/some/fixed/path')` — use `PageHeader backUrl={...}` instead, unless the page doesn't otherwise use `PageHeader`.

`BackButton` does not simply link to `backUrl`. On click it checks `hasInAppBackHistory()` (`common/navigationHistory.ts`, backed by a sessionStorage stack that `useTrackNavigationHistory()` maintains on every route change). Each sub-app's root layout must call `useTrackNavigationHistory()` once for this to work — it's wired up in `AdminPageLayout`, `AccountPageLayout`, and `PlatformPageLayout` (`appSurvey` has no back navigation, so it's omitted there). sessionStorage is origin-scoped, and each sub-app runs on its own subdomain (`project-*.veysur.local`, `account.veysur.local`, `platform.veysur.local`), so the tracked history — and therefore `navigate(-1)` — never crosses between apps, only within a single app's own navigation in the current tab:

- **In-app history exists** (user navigated here via React Router from another page in this tab) → `navigate(-1)`, returning to the actual previous page, regardless of which page that was.
- **No in-app history** (fresh tab, direct deep link, page refresh) → `navigate(backUrl)`, the fallback — if one was provided.

`backUrl` is only used as a fallback; it does not need to encode "where the user actually came from". `PageHeader` shows the back button whenever **either** condition holds — `hasInAppBackHistory()` is true **or** `backUrl` is a non-empty string — and hides it only when both are absent (fresh tab / direct link with no fallback given). So a page can pass `backUrl` when it has an obvious parent (e.g. an edit page always goes back to its list), pass nothing when there's no sensible fallback and in-app history alone is enough, or pass a fallback anyway to also support fresh tabs / direct links.

Example: a list page linked from both a project view page (`?projectId=`) and a user view page (`?userId=`). A helper computes a fallback from whichever ID is present, defaulting to a top-level list if neither is set:

```typescript
backUrl={platformListBackUrl(projectId, userId)}
```

In normal in-app navigation the back button returns to whichever of those two pages was actually visited (via `navigate(-1)`); the computed fallback only fires on a direct link with no tab history.

## Mutation Hooks with Form Error Handling

When mutations need to set field-specific form errors, pass `setError` as a parameter:

```typescript
import { useMutation } from '@tanstack/react-query'
import { UseFormSetError } from 'react-hook-form'

type UpdateEmailParams = {
  data: EmailFormData
  setError: UseFormSetError<EmailFormData>
}

export function useUserProfileEmail() {
  const { authRefresh } = useAuth()

  const mutation = useMutation({
    mutationFn: async ({ data, setError }: UpdateEmailParams) => {
      const emailAvailable =
        await getUserProfileApi().validateEmailNotRegistered(data.email)
      if (!emailAvailable) {
        setError('email', { message: 'This email is already registered' })
        throw new Error('This email is already registered')
      }
      await getUserProfileApi().updateEmail(data.email)
      await authRefresh(true)
    },
  })

  return {
    updateEmail: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
```

Usage: pass `setError: form.setError` from the component. Field errors are set by the hook; the general `error` string is displayed in an Alert.

## Cache Invalidation Pattern

Build every mutation hook that invalidates a query with `useInvalidatingMutation` (`/package/app/src/hook/useInvalidatingMutation.ts`), not a raw `useMutation` with a manual `onSuccess: () => { queryClient.invalidateQueries(...) }` — see [docs/mutation-cache-invalidation.md](../docs/mutation-cache-invalidation.md) for why (a forgotten `return` on that pattern lets `mutateAsync` resolve before the refetch lands) and the full API.

A get-hook and every mutate-hook that touches its data must import the same `KEY_STATE_*` constant — never re-type the query key as a string literal in more than one place. This is what lets a reviewer trust that "invalidate X" in a mutation actually matches what a `useQuery` elsewhere is reading; a hand-typed duplicate can silently drift and leave stale data on screen with no error.

```typescript
// keyState.ts — the single source of truth for this entity's query keys
export const KEY_STATE_SURVEY_RESPONSE_GET = 'surveyResponseGet'
export const KEY_STATE_SURVEY_RESPONSE_LIST = 'surveyResponseList'

// useSurveyResponseGet.ts — the read hook
import { KEY_STATE_SURVEY_RESPONSE_GET } from 'appAdmin/common'

useQuery({
  queryKey: [KEY_STATE_SURVEY_RESPONSE_GET, surveyId, responseId],
  // ...
})

// useSurveyResponseUpdate.ts — the mutate hook imports the SAME constants
import {
  KEY_STATE_SURVEY_RESPONSE_GET,
  KEY_STATE_SURVEY_RESPONSE_LIST,
} from 'appAdmin/common'

useInvalidatingMutation({
  mutationFn: async ({ responseId, response }) => {
    /* ... */
  },
  invalidateKeys: (_data, variables) => [
    [KEY_STATE_SURVEY_RESPONSE_LIST, surveyId],
    [KEY_STATE_SURVEY_RESPONSE_GET, surveyId, variables.responseId],
  ],
})
```

Invalidate **every** cache the mutation affects, not just the one the current page happens to show — a mutation for entity X often has both a list view and a detail view reading it elsewhere. The `SurveyParticipant` hook family (`appAdmin/component/SurveyParticipant/hook/`) is the most consistent multi-hook example in the codebase — all 9 create/update/delete/import hooks invalidate the same shared list constant.

When one mutation must invalidate several unrelated keys at once (e.g. publishing a survey affects the publication list, the snapshot compare view, and the recent-snapshots view), extract a small named helper that returns `QueryKey[]` — never one that calls `queryClient.invalidateQueries` itself — rather than repeating the array inline. See `publicationQueryKeys.ts` (`appAdmin/component/SurveyEditorPublish/hook/`) or `billingHistoryQueryKeys.ts` (`appAccount/hook/`).

## State Management with Zustand

Components read directly from stores rather than receiving store data via props.

```typescript
// ❌ BAD: Prop drilling from parent
export const Parent = () => {
  const survey = useSurveyEditorStore((state) => state.survey)
  return <Child survey={survey} />
}

// ✅ GOOD: Component reads its own data
export const Child = () => {
  const survey = useSurveyEditorStore((state) => state.survey)
  // ...
}
```

Fine-grained subscriptions prevent unnecessary re-renders — only components subscribed to a specific slice re-render when it changes.

Reference: `appAdmin/component/SurveyEditor/SurveySaveStatus.tsx`, `appAdmin/component/SurveyEditor/SurveySetting.tsx`

## Schema Class Pattern

```typescript
// model/schema/SchemaEntityForm.ts
import { Schema, sb } from 'veysur-common'

export type EntityFormData = {
  name: string
  email: string
  description?: string
}

export const SchemaEntityForm = new Schema(
  sb
    .object()
    .shape({
      name: sb
        .string()
        .notEmpty({ message: 'Name is required' })
        .maxLength(64, { message: 'Name must be at most 64 characters' }),
      email: sb
        .string()
        .notEmpty({ message: 'Email is required' })
        .email({ message: 'Invalid email address' }),
      description: sb.string().optional(),
    })
    .build(),
)
```

Naming: `Schema[EntityName][FormName]`, type: `[EntityName][FormName]FormData`. Export from `model/schema/index.ts`.

Usage with react-hook-form: `resolver: mzenResolver(SchemaEntityForm)` from `common/hookform/mzenResolver`.

Reference: `appAccount/model/schema/`

## Form Component Pattern

```typescript
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from 'component/shadcn/card'

export const EntityForm: React.FC<Props> = ({ title, onSubmit, onCancel, isLoading, error, isEditMode }) => (
  <form onSubmit={handleSubmit}>
    {error && (
      <Alert variant="destructive" className="mb-3">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )}
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{/* fields */}</CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
        </Button>
      </CardFooter>
    </Card>
  </form>
)
```

Key elements: `<form>` wraps Card; error Alert is outside/above Card; Cancel (secondary) before Submit (primary).

Reference: `appAdmin/component/SurveyParticipant/form/SurveyParticipantForm.tsx`

## Edit Page Pattern

```typescript
export const PageEntityEdit: React.FC = () => {
  const navigate = useNavigate()
  const handleBack = () => navigate('/path/to/list')

  if (isLoading) return <Container><div className="flex justify-center py-5"><Spinner /></div></Container>

  const backButton = (
    <div className="flex items-center my-3">
      <Button variant="link" className="p-0 mr-2" onClick={handleBack}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>
    </div>
  )

  if (error || !entity) return (
    <Container>{backButton}<div className="mx-6"><Alert variant="destructive"><AlertDescription>{error || 'Entity not found'}</AlertDescription></Alert></div></Container>
  )

  return (
    <Container>
      {backButton}
      <div className="mx-6">
        <EntityForm title={`Edit Entity: ${entity.name}`} initialData={entity} onSubmit={handleSubmit} onCancel={handleBack} isLoading={isSubmitting} error={error} isEditMode />
      </div>
    </Container>
  )
}
```

Key elements: single `handleBack()` function; back button appears in all states except loading; `mx-6` spacing; Spinner centre-aligned with `flex justify-center py-5`.

Reference: `appAdmin/page/PageSurveyEditParticipantEdit.tsx`
