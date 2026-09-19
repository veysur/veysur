import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Patch,
  PatchBuffer,
  BUFFERED_PATCH_STATUS_ERROR,
  BUFFERED_PATCH_STATUS_PERSISTING,
} from 'veysur-common'

import { debounce, createRepeatInterval } from 'common'

import { useSettingSurveyApiPatch } from './useSettingSurveyApiPatch'
import { KEY_STATE_SETTING_SURVEY_EDITING } from '../common/keyState'

const BUFFER_DEBOUNCE_MS = 20
const BUFFER_PATCH_PERSIST_MS = 2000
const PATCH_RETRY_ATTEMPTS = 3
const DEBUG = false

const debugLog = (...args: unknown[]) => {
  if (DEBUG) {
    console.debug(...args)
  }
}

type AddPatchesFn = (
  patchBufferRef: React.RefObject<PatchBuffer>,
  patches: Patch[],
) => void

const addPatchesImpl: AddPatchesFn = (patchBufferRef, patches) => {
  let patchBuffer = patchBufferRef.current
  for (const key in patches) {
    patchBuffer = patchBuffer.addPatch(patches[key])
  }
  debugLog('debouncedAddPatches', patches)
  patchBufferRef.current = patchBuffer
}

const debouncedAddPatches = debounce(
  addPatchesImpl as (...args: unknown[]) => unknown,
  BUFFER_DEBOUNCE_MS,
) as AddPatchesFn

type Props = {
  patchBufferRef?: React.RefObject<PatchBuffer>
}

export function useSettingSurveyPatch({
  patchBufferRef: providedPatchBufferRef,
}: Props) {
  const internalPatchBufferRef = useRef(new PatchBuffer())
  // Resolved once and frozen for the component's lifetime (the setter is
  // never called) so this reads as a stable reference to the compiler,
  // the same as a plain useRef result, rather than a value that could
  // change identity and therefore must be tracked as a dependency.
  const [patchBufferRef] = useState(
    () => providedPatchBufferRef || internalPatchBufferRef,
  )
  const queryClient = useQueryClient()

  const useSettingSurveyApiPatchData = useSettingSurveyApiPatch()
  const { patchMutation } = useSettingSurveyApiPatchData

  const bufferPatches = (patches: Patch[]) => {
    debouncedAddPatches(patchBufferRef, patches)
  }

  const invalidateSettingSurveyQuery = useCallback(async () => {
    const patchBuffer = patchBufferRef.current
    if (!patchBuffer.hasPending() && !patchBuffer.hasPersisting()) {
      debugLog('Invalidate admin setting survey cache')
      await queryClient.invalidateQueries({
        queryKey: [KEY_STATE_SETTING_SURVEY_EDITING],
      })
    }
  }, [queryClient, patchBufferRef])

  const processBuffer = useCallback(() => {
    let newBuffer = patchBufferRef.current
    debugLog('ProcessBuffer.start')
    if (patchMutation.isPending || patchMutation.isPaused) {
      debugLog('Buffer pending or paused, waiting...')
      return
    }
    if (patchMutation.isError) {
      debugLog('Handling patch errors...')
      debugLog('Error:', patchMutation.error)
      newBuffer = newBuffer.captureError()
      patchBufferRef.current = newBuffer
      // retry errored patches
      const patches = newBuffer.getPatches([BUFFERED_PATCH_STATUS_ERROR])
      if (
        patches.length > 0 &&
        newBuffer.getApplyAttempt() <= PATCH_RETRY_ATTEMPTS
      ) {
        newBuffer = newBuffer.incrementApplyAttempt()
        patchBufferRef.current = newBuffer
        patchMutation.mutate(patches)
      } else {
        // give up after x attempts
        newBuffer = newBuffer.captureSuccess()
        patchBufferRef.current = newBuffer
        patchMutation.reset()
        invalidateSettingSurveyQuery()
      }
    } else if (patchMutation.isSuccess) {
      debugLog('Handling patch success...')
      newBuffer = newBuffer.captureSuccess()
      patchBufferRef.current = newBuffer
      patchMutation.reset()
      invalidateSettingSurveyQuery()
    } else if (patchMutation.isIdle && !newBuffer.hasError()) {
      newBuffer = newBuffer.capturePersisting()
      const patches = newBuffer.getPatches([BUFFERED_PATCH_STATUS_PERSISTING])
      if (patches.length > 0) {
        debugLog(`Found ${patches.length} patches ready to apply`, patches)
        patchBufferRef.current = newBuffer
        patchMutation.mutate(patches)
      }
    }
    debugLog('ProcessBuffer.end')
  }, [patchMutation, invalidateSettingSurveyQuery, patchBufferRef])

  useEffect(() => {
    const bufferApplyRepeatInterval = createRepeatInterval(
      processBuffer,
      BUFFER_PATCH_PERSIST_MS,
    )
    return () => bufferApplyRepeatInterval.stop()
  }, [processBuffer])

  return {
    patchBufferRef,
    bufferPatches,
    patchMutation,
  }
}
