import { useEffect, useRef, useCallback, useState } from 'react'
import {
  useQueryClient,
  useMutation,
  keepPreviousData,
  type QueryKey,
  type UseMutationResult,
} from '@tanstack/react-query'
import { useAuthdQuery } from 'hook/useAuthdQuery'
import {
  Patch,
  PatchBuffer,
  BUFFERED_PATCH_STATUS_ERROR,
  BUFFERED_PATCH_STATUS_PERSISTING,
} from 'veysur-common'

import { createRepeatInterval } from 'common'

const BUFFER_PATCH_PERSIST_MS = 2000
const PATCH_RETRY_ATTEMPTS = 3

/**
 * Configuration for usePatchableState hook
 */
export interface UsePatchableStateConfig<TData, TPatch extends Patch> {
  // Identity
  queryKey: QueryKey
  entityId?: string

  // Data fetching
  fetchFn: () => Promise<TData>
  enabled?: boolean

  // Patch handling
  applyPatchesFn: (patches: TPatch[], data: TData) => TData
  persistPatchesFn: (patches: TPatch[]) => Promise<void>

  // Configuration
  debounceMs?: number
  refetchInterval?: number | false
  refetchOnMount?: boolean | 'always'
  refetchOnWindowFocus?: boolean
  staleTime?: number

  // Callbacks
  onPatchBufferChange?: (buffer: PatchBuffer) => void
  onPersistSuccess?: () => void | Promise<void>
  onPersistError?: (error: unknown) => void
}

/**
 * Return type for usePatchableState hook
 */
export interface UsePatchableStateResult<TData, TPatch extends Patch> {
  // State
  data: TData | undefined
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  error: unknown

  // Patch management
  patchBuffer: PatchBuffer
  bufferPatches: (patches: TPatch[]) => void
  patchMutation: UseMutationResult<void, unknown, TPatch[]>

  // Manual control
  updateState: (updater: (data: TData) => TData) => void
  invalidate: () => Promise<void>
  reset: () => void
}

/**
 * Generic patchable state management hook
 *
 * Provides a reusable pattern for managing data with:
 * - React Query data fetching
 * - Client-side state with optimistic updates
 * - Patch buffering and debouncing
 * - Automatic persistence with retry logic
 * - Buffered patch application on data refresh
 *
 * @example
 * ```typescript
 * const { data, bufferPatches, patchBuffer } = usePatchableState<Survey, SurveyPatch>({
 *   queryKey: ['survey', surveyId],
 *   fetchFn: () => getSurveyApi().getOne(surveyId),
 *   applyPatchesFn: (patches, survey) => PatchApplierSurvey.applyPatches(patches, survey),
 *   persistPatchesFn: (patches) => getSurveyApi().patch(surveyId, patches),
 * })
 * ```
 */
export function usePatchableState<TData, TPatch extends Patch = Patch>(
  config: UsePatchableStateConfig<TData, TPatch>,
): UsePatchableStateResult<TData, TPatch> {
  const {
    queryKey,
    fetchFn,
    enabled = true,
    applyPatchesFn,
    persistPatchesFn,
    debounceMs = BUFFER_PATCH_PERSIST_MS,
    refetchInterval = false,
    refetchOnMount = 'always',
    refetchOnWindowFocus = true,
    staleTime,
    onPatchBufferChange,
    onPersistSuccess,
    onPersistError,
  } = config

  const queryClient = useQueryClient()
  const patchBufferRef = useRef(new PatchBuffer())
  const [patchBuffer, setPatchBufferState] = useState(() => new PatchBuffer())

  // Keep the ref (for synchronous reads in callbacks) and reactive state
  // (for the render return value) in sync, and notify the consumer.
  const setPatchBuffer = useCallback(
    (buffer: PatchBuffer) => {
      patchBufferRef.current = buffer
      setPatchBufferState(buffer)
      onPatchBufferChange?.(buffer)
    },
    [onPatchBufferChange],
  )

  const { data, isError, isLoading, isFetching, error } = useAuthdQuery<
    TData | undefined
  >(
    {
      enabled,
      queryKey,
      queryFn: async () => {
        const fetchedData = await fetchFn()
        // Re-apply buffered patches so optimistic updates survive a refetch
        const patches = patchBufferRef.current.getPatches() as TPatch[]
        if (patches.length > 0) {
          return applyPatchesFn(patches, fetchedData)
        }
        return fetchedData
      },
      refetchInterval,
      refetchOnMount,
      refetchOnWindowFocus,
      staleTime,
      // The query key can legitimately change mid-session (e.g. the survey editor's
      // default-language key changes the instant the user edits that setting) —
      // keep rendering the previous key's data instead of flashing `undefined`
      // while the new key's fetch is in flight.
      placeholderData: keepPreviousData,
    },
    queryClient,
  )

  // Patch persistence mutation
  const patchMutation = useMutation(
    {
      mutationFn: async (patches: TPatch[]) => {
        await persistPatchesFn(patches)
      },
      onSuccess: async () => {
        await onPersistSuccess?.()
      },
      onError: (error) => {
        onPersistError?.(error)
      },
    },
    queryClient,
  )

  // Update state optimistically
  const updateState = useCallback(
    (updater: (data: TData) => TData) => {
      queryClient.setQueryData(queryKey, (currentData: TData | undefined) => {
        if (!currentData) return currentData
        return updater(currentData)
      })
    },
    [queryClient, queryKey],
  )

  // Buffer patches for persistence
  const bufferPatches = useCallback(
    (patches: TPatch[]) => {
      let buffer = patchBufferRef.current
      for (const patch of patches) {
        buffer = buffer.addPatch(patch)
      }
      setPatchBuffer(buffer)

      // Apply patches optimistically to current cached data
      updateState((currentData) => {
        return applyPatchesFn(patches, currentData)
      })
    },
    [setPatchBuffer, updateState, applyPatchesFn],
  )

  // Invalidate query to trigger refetch
  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])

  // Reset query data
  const reset = useCallback(() => {
    queryClient.setQueryData(queryKey, undefined)
  }, [queryClient, queryKey])

  // Invalidate query after successful persistence (but only if no pending/persisting patches)
  const invalidateIfNoPending = useCallback(() => {
    const patchBuffer = patchBufferRef.current
    if (!patchBuffer.hasPending() && !patchBuffer.hasPersisting()) {
      invalidate()
    }
  }, [invalidate])

  // Process patch buffer periodically
  const processBuffer = useCallback(() => {
    let newBuffer = patchBufferRef.current

    if (patchMutation.isPending || patchMutation.isPaused) {
      return
    }

    if (patchMutation.isError) {
      newBuffer = newBuffer.captureError()
      setPatchBuffer(newBuffer)

      // Retry errored patches
      const patches = newBuffer.getPatches([
        BUFFERED_PATCH_STATUS_ERROR,
      ]) as TPatch[]
      if (
        patches.length > 0 &&
        newBuffer.getApplyAttempt() <= PATCH_RETRY_ATTEMPTS
      ) {
        newBuffer = newBuffer.incrementApplyAttempt()
        setPatchBuffer(newBuffer)
        patchMutation.mutate(patches)
      } else {
        // Give up after max attempts - clear buffer and refetch from server
        newBuffer = newBuffer.captureSuccess()
        setPatchBuffer(newBuffer)
        patchMutation.reset()
        invalidateIfNoPending()
      }
    } else if (patchMutation.isSuccess) {
      newBuffer = newBuffer.captureSuccess()
      setPatchBuffer(newBuffer)
      patchMutation.reset()
      invalidateIfNoPending()
    } else if (patchMutation.isIdle && !newBuffer.hasError()) {
      newBuffer = newBuffer.capturePersisting()
      const patches = newBuffer.getPatches([
        BUFFERED_PATCH_STATUS_PERSISTING,
      ]) as TPatch[]
      if (patches.length > 0) {
        setPatchBuffer(newBuffer)
        patchMutation.mutate(patches)
      }
    }
  }, [patchMutation, setPatchBuffer, invalidateIfNoPending])

  // Set up periodic buffer processing
  useEffect(() => {
    const bufferApplyRepeatInterval = createRepeatInterval(
      processBuffer,
      debounceMs,
    )
    return () => bufferApplyRepeatInterval.stop()
  }, [processBuffer, debounceMs])

  return {
    // State
    data,
    isLoading,
    isFetching,
    isError,
    error,

    // Patch management
    patchBuffer,
    bufferPatches,
    patchMutation,

    // Manual control
    updateState,
    invalidate,
    reset,
  }
}
