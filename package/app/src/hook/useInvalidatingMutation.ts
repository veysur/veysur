import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query'

import { useAuth } from './useAuth'

export type InvalidateKeys<TData, TVariables> =
  QueryKey[] | ((data: TData, variables: TVariables) => QueryKey[])

export interface UseInvalidatingMutationOptions<
  TData,
  TVariables,
  TOnMutateResult = unknown,
> extends UseMutationOptions<TData, Error, TVariables, TOnMutateResult> {
  invalidateKeys: InvalidateKeys<TData, TVariables>
}

/**
 * Wraps useMutation and awaits query invalidation before the mutation
 * resolves, so callers that clear local/optimistic state right after
 * `await mutateAsync(...)` never render from a stale cache. Plain
 * `onSuccess: () => { queryClient.invalidateQueries(...) }` handlers don't
 * return the invalidation promise, so mutateAsync resolves before the
 * refetch lands - see docs/mutation-cache-invalidation.md.
 *
 * Also awaits authRefreshWithRetry() before mutationFn runs, for the same
 * reason useAuthdQuery does on the query side - a deterministic JWT-freshness
 * check from this call's own local useAuth() instance. See useAuthdQuery.ts.
 */
export function useInvalidatingMutation<
  TData,
  TVariables,
  TOnMutateResult = unknown,
>(
  options: UseInvalidatingMutationOptions<TData, TVariables, TOnMutateResult>,
): UseMutationResult<TData, Error, TVariables, TOnMutateResult> {
  const queryClient = useQueryClient()
  const { authRefreshWithRetry } = useAuth()
  const { invalidateKeys, onSuccess, mutationFn, ...rest } = options

  return useMutation({
    ...rest,
    mutationFn: async (variables, context) => {
      await authRefreshWithRetry()
      if (!mutationFn) {
        throw new Error('useInvalidatingMutation requires a mutationFn')
      }
      return mutationFn(variables, context)
    },
    onSuccess: async (...args) => {
      const [data, variables] = args
      const keys =
        typeof invalidateKeys === 'function'
          ? invalidateKeys(data, variables)
          : invalidateKeys
      await Promise.all(
        keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      )
      await onSuccess?.(...args)
    },
  })
}
