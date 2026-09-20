# Mutation Cache Invalidation

## The bug this prevents

TanStack Query only waits for a mutation's `onSuccess` handler to finish - and therefore
delays `mutateAsync`'s resolution - if the handler **returns** the invalidation promise:

```ts
// Bug: mutateAsync resolves before the list has refetched
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: [KEY_STATE_SURVEY_LIST] })
},
```

A caller that does `await mutation.mutateAsync(...)` and then immediately clears local
optimistic state renders from the still-stale cache, because the refetch triggered by
`invalidateQueries` hadn't landed yet. The save appears to silently disappear until some
unrelated later refetch happens to occur. This exact bug shipped in
`useSurveyParticipantAttributeCreate/Delete/BatchSave` and was found to be repeated
across roughly 50 other mutation hooks in this codebase.

## Use `useInvalidatingMutation` for every mutation hook that invalidates a query

**Location:** `/package/app/src/hook/useInvalidatingMutation.ts`

It wraps `useMutation` and awaits invalidation (and any caller-supplied `onSuccess`)
before the mutation resolves, so the mistake above is structurally impossible:

```typescript
export function useSurveyDelete() {
  return useInvalidatingMutation({
    mutationFn: async (surveyId: string) => getSurveyApi().delete(surveyId),
    invalidateKeys: [[KEY_STATE_SURVEY_LIST]],
  })
}
```

### Deriving keys from the mutation result or variables

Pass a function instead of a static array when the keys depend on `data` or `variables`:

```typescript
export function useSurveyResponseUpdate(surveyId: string) {
  return useInvalidatingMutation({
    mutationFn: async (variables: UpdateParams) =>
      getSurveyResponseApi().update(surveyId, variables),
    invalidateKeys: (_data, variables) => [
      [KEY_STATE_SURVEY_RESPONSE_LIST, surveyId],
      [KEY_STATE_SURVEY_RESPONSE_GET, surveyId, variables.responseId],
    ],
  })
}
```

### Conditional invalidation

Return an empty array to skip invalidation for a given call (e.g. a dry run):

```typescript
invalidateKeys: (_data, variables) =>
  variables.dryRun ? [] : [[KEY_STATE_PUBLICATION_LIST, surveyId]],
```

### Extra work after invalidation

`onSuccess` is still accepted and still runs - `useInvalidatingMutation` awaits it, but
only _after_ invalidation has completed, so ordering (invalidate, then do the extra work)
is preserved:

```typescript
export function useTwoFactorToggle() {
  const { authRefresh } = useAuth()
  return useInvalidatingMutation({
    mutationFn: async (data: ToggleParams) => getUserApi().setTwoFactor(...),
    invalidateKeys: () => [[KEY_STATE_AUTH]],
    onSuccess: async () => {
      await authRefresh(true)
    },
  })
}
```

## Shared invalidation helpers return `QueryKey[]`, never invalidate directly

A helper shared by several hooks (e.g. `surveyParticipantQueryKeys.ts`,
`surveyResponseQueryKeys.ts`) should be a **pure function that returns
`QueryKey[]`**, not a function that calls `queryClient.invalidateQueries` itself. That
keeps the awaiting logic in exactly one place - `useInvalidatingMutation` - instead of
every helper needing its own (and inevitably some forgetting it):

```typescript
// Right: pure key builder, no queryClient involved
export function surveyParticipantQueryKeys(surveyId: string): QueryKey[] {
  return [
    [KEY_STATE_SURVEY_PARTICIPANT_LIST, surveyId],
    [KEY_STATE_SURVEY_PARTICIPANT_ATTRIBUTE_LIST, surveyId],
  ]
}

// Wrong: helper performs invalidation itself - every caller has to remember
// to await/return it, and it's easy to forget
export function invalidateSurveyParticipantQueries(queryClient, surveyId) {
  queryClient.invalidateQueries({
    queryKey: [KEY_STATE_SURVEY_PARTICIPANT_LIST, surveyId],
  })
  // ...
}
```

## Outside `useMutation`: `usePatchableState`'s `onPersistSuccess`

`usePatchableState` (see [generalised-patchable-state.md](generalised-patchable-state.md))
has its own persist mutation, driven internally rather than by a component calling
`mutateAsync` directly. Its `onPersistSuccess` callback may return a `Promise<void>`, and
the hook awaits it before considering the persist complete:

```typescript
onPersistSuccess: async () => {
  await queryClient.invalidateQueries({ queryKey: ['surveySnapshot', 'compare', surveyId] })
},
```

## Genuinely bespoke async functions

A one-off async function that isn't a `useMutation` or `usePatchableState` consumer (for
example a `useCallback`-wrapped save function that isn't driven through either
abstraction) has no shared choke point to plug into - just `await Promise.all([...])` the
invalidations directly, before returning or proceeding:

```typescript
await Promise.all([
  queryClient.invalidateQueries({ queryKey: ['surveyEmailTemplates'] }),
  queryClient.invalidateQueries({ queryKey: ['projectEmailTemplates'] }),
])
clearDirtyState()
```

## Reviewer checklist for any new/changed mutation hook

1. Does it invalidate a query? If so, is it built with `useInvalidatingMutation`?
2. If it uses a shared invalidation helper, does that helper return `QueryKey[]` rather
   than calling `queryClient.invalidateQueries` itself?
3. If it does extra work after invalidation (e.g. `authRefresh(true)`), is that work in
   `onSuccess`, not duplicated before/instead of the `invalidateKeys` list?
