import { Patch, PatchId } from './Patcher'

export type PatchStatus = 'pending' | 'persisting' | 'error' | 'success'
export type BufferedPatch = {
  status: PatchStatus
  persistAttempt: number
  persistEventId: string
  patch: Patch
}

export const BUFFERED_PATCH_STATUS_PENDING: PatchStatus = 'pending'
export const BUFFERED_PATCH_STATUS_PERSISTING: PatchStatus = 'persisting'
export const BUFFERED_PATCH_STATUS_ERROR: PatchStatus = 'error'

export class PatchBuffer {
  private buffer: BufferedPatch[]

  constructor(buffer: BufferedPatch[] = []) {
    this.buffer = buffer
  }

  addPatch(patch: Patch): PatchBuffer {
    // Find a PENDING patch with matching type/action/id
    // This ensures we merge with pending patches even when persisting patches exist
    const existingPendingIndex = this.buffer.findIndex(
      (bufferedPatch) =>
        bufferedPatch.status === BUFFERED_PATCH_STATUS_PENDING &&
        bufferedPatch.patch.type === patch.type &&
        bufferedPatch.patch.action === patch.action &&
        this.isEqualId(bufferedPatch.patch.id, patch.id),
    )

    if (existingPendingIndex !== -1) {
      // Merge the new patch data with the existing pending patch
      const existingBufferedPatch = this.buffer[existingPendingIndex]
      const updatedBuffer = [...this.buffer]
      updatedBuffer[existingPendingIndex] = {
        ...existingBufferedPatch,
        patch: {
          ...existingBufferedPatch.patch,
          data: {
            ...existingBufferedPatch.patch.data,
            ...patch.data,
          },
        },
      }
      return new PatchBuffer(updatedBuffer)
    } else {
      // Add new patch if no pending patch exists
      const bufferedPatch: BufferedPatch = {
        status: BUFFERED_PATCH_STATUS_PENDING,
        persistAttempt: 0,
        persistEventId: undefined,
        patch: patch,
      }
      return new PatchBuffer([...this.buffer, bufferedPatch])
    }
  }

  capturePersisting(): PatchBuffer {
    const updatedBuffer = this.buffer.map((bufferedPatch) =>
      bufferedPatch.status === BUFFERED_PATCH_STATUS_PENDING
        ? {
            ...bufferedPatch,
            persistAttempt: bufferedPatch.persistAttempt + 1,
            status: BUFFERED_PATCH_STATUS_PERSISTING,
          }
        : bufferedPatch,
    )
    return new PatchBuffer(updatedBuffer)
  }

  captureError(): PatchBuffer {
    const updatedBuffer = this.buffer.map((bufferedPatch) =>
      bufferedPatch.status === BUFFERED_PATCH_STATUS_PERSISTING
        ? {
            ...bufferedPatch,
            status: BUFFERED_PATCH_STATUS_ERROR,
          }
        : bufferedPatch,
    )
    return new PatchBuffer(updatedBuffer)
  }

  captureSuccess(): PatchBuffer {
    const updatedBuffer = this.buffer.filter(
      (bufferedPatch) =>
        bufferedPatch.status !== BUFFERED_PATCH_STATUS_PERSISTING &&
        bufferedPatch.status !== BUFFERED_PATCH_STATUS_ERROR,
    )
    return new PatchBuffer(updatedBuffer)
  }

  getPatches(status?: PatchStatus[]): Patch[] {
    return this.buffer
      .filter(
        (bufferedPatch) =>
          status === undefined || status.includes(bufferedPatch.status),
      )
      .map((bufferedPatch) => bufferedPatch.patch)
  }

  isEmpty() {
    return this.buffer.length === 0
  }

  hasPending() {
    return this.getPatches([BUFFERED_PATCH_STATUS_PENDING]).length > 0
  }

  hasPersisting() {
    return this.getPatches([BUFFERED_PATCH_STATUS_PERSISTING]).length > 0
  }

  hasError() {
    return this.getPatches([BUFFERED_PATCH_STATUS_ERROR]).length > 0
  }

  setStatus(to: PatchStatus, from?: PatchStatus[]): PatchBuffer {
    const updatedBuffer = this.buffer.map((bufferedPatch) => {
      if (from === undefined || from.includes(bufferedPatch.status)) {
        return { ...bufferedPatch, status: to }
      }
      return bufferedPatch
    })
    return new PatchBuffer(updatedBuffer)
  }

  clearPatches(status: PatchStatus[]): PatchBuffer {
    const updatedBuffer = this.buffer.filter(
      (bufferedPatch) => !status.includes(bufferedPatch.status),
    )
    return new PatchBuffer(updatedBuffer)
  }

  getApplyAttempt(): number {
    return Math.max(
      ...this.buffer.map((bufferedPatch) => bufferedPatch.persistAttempt),
      0,
    )
  }

  incrementApplyAttempt(): PatchBuffer {
    const updatedBuffer = this.buffer.map((bufferedPatch) =>
      bufferedPatch.status === BUFFERED_PATCH_STATUS_ERROR
        ? {
            ...bufferedPatch,
            persistAttempt: bufferedPatch.persistAttempt + 1,
          }
        : bufferedPatch,
    )
    return new PatchBuffer(updatedBuffer)
  }

  isEqualId(id1: PatchId, id2: PatchId): boolean {
    if (typeof id1 !== 'object' || typeof id2 !== 'object') {
      return id1 == id2
    }
    const keys1 = Object.keys(id1)
    const keys2 = Object.keys(id2)
    if (keys1.length !== keys2.length) {
      return false
    }
    for (const key of keys1) {
      if (id1[key] !== id2[key]) {
        return false
      }
    }
    return true
  }
}

export default PatchBuffer
