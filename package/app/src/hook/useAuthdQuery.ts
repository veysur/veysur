import {
  useQuery,
  type QueryClient,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query'

import { useAuth } from './useAuth'

/**
 * Wraps useQuery and awaits authRefreshWithRetry() before queryFn runs, so
 * every query gets a deterministic JWT-freshness check from its own local
 * useAuth() instance - independent of whether some other useAuth()-using
 * component has yet registered RestClient's jwtRefresher on mount.
 */
export function useAuthdQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  queryClient?: QueryClient,
): UseQueryResult<TData, TError> {
  const { authRefreshWithRetry } = useAuth()
  const { queryFn, ...rest } = options

  return useQuery(
    {
      ...rest,
      queryFn: async (context) => {
        await authRefreshWithRetry()
        if (typeof queryFn !== 'function') {
          throw new Error('useAuthdQuery requires a queryFn')
        }
        return queryFn(context)
      },
    },
    queryClient,
  )
}
