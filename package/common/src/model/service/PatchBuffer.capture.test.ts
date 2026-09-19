import {
  PatchBuffer,
  BufferedPatch,
  BUFFERED_PATCH_STATUS_PENDING,
  BUFFERED_PATCH_STATUS_PERSISTING,
  BUFFERED_PATCH_STATUS_ERROR,
} from './PatchBuffer'

describe('PatchBuffer - Capture Operations', () => {
  let buffer: PatchBuffer

  beforeEach(() => {
    buffer = new PatchBuffer()
  })

  describe('capturePersisting', () => {
    it('should change pending patches to persisting status and increment persistAttempt', () => {
      const patch1 = {
        type: 'test',
        action: 'update',
        id: '1',
        data: { value: 'a' },
      }
      const patch2 = {
        type: 'test',
        action: 'update',
        id: '2',
        data: { value: 'b' },
      }

      const updatedBuffer = buffer.addPatch(patch1).addPatch(patch2)

      const newBuffer = updatedBuffer.capturePersisting()

      const pendingPatches = newBuffer.getPatches([
        BUFFERED_PATCH_STATUS_PENDING,
      ])
      expect(pendingPatches).toHaveLength(0)

      const persistingPatches = newBuffer.getPatches([
        BUFFERED_PATCH_STATUS_PERSISTING,
      ])
      expect(persistingPatches).toHaveLength(2)
      expect(persistingPatches).toContainEqual(patch1)
      expect(persistingPatches).toContainEqual(patch2)

      // Check that persistAttempt has been incremented
      const privateBuffer = (
        newBuffer as unknown as { buffer: BufferedPatch[] }
      ).buffer
      expect(privateBuffer[0].persistAttempt).toBe(1)
      expect(privateBuffer[1].persistAttempt).toBe(1)
    })

    it('should not change non-pending patches', () => {
      const patch1 = {
        type: 'test',
        action: 'update',
        id: '1',
        data: { value: 'a' },
      }
      const patch2 = {
        type: 'test',
        action: 'update',
        id: '2',
        data: { value: 'b' },
      }

      let updatedBuffer = buffer.addPatch(patch1).addPatch(patch2)
      updatedBuffer = updatedBuffer.setStatus('error', [
        BUFFERED_PATCH_STATUS_PENDING,
      ])

      const newBuffer = updatedBuffer.capturePersisting()

      const errorPatches = newBuffer.getPatches([BUFFERED_PATCH_STATUS_ERROR])
      expect(errorPatches).toHaveLength(2)
      expect(errorPatches).toContainEqual(patch1)
      expect(errorPatches).toContainEqual(patch2)

      const persistingPatches = newBuffer.getPatches([
        BUFFERED_PATCH_STATUS_PERSISTING,
      ])
      expect(persistingPatches).toHaveLength(0)
    })

    it('should handle empty buffer correctly', () => {
      const newBuffer = buffer.capturePersisting()

      expect(newBuffer).toBeInstanceOf(PatchBuffer)
      expect(
        newBuffer.getPatches([BUFFERED_PATCH_STATUS_PERSISTING]),
      ).toHaveLength(0)
    })

    it('should return a new instance of PatchBuffer', () => {
      const patch = {
        type: 'test',
        action: 'update',
        id: '1',
        data: { value: 'a' },
      }

      const updatedBuffer = buffer.addPatch(patch)
      const newBuffer = updatedBuffer.capturePersisting()

      expect(newBuffer).toBeInstanceOf(PatchBuffer)
      expect(newBuffer).not.toBe(updatedBuffer)
    })
  })

  describe('captureError', () => {
    it('should change persisting patches to error status', () => {
      const patch1 = {
        type: 'test',
        action: 'update',
        id: '1',
        data: { value: 'a' },
      }
      const patch2 = {
        type: 'test',
        action: 'update',
        id: '2',
        data: { value: 'b' },
      }

      let updatedBuffer = buffer.addPatch(patch1).addPatch(patch2)
      updatedBuffer = updatedBuffer.capturePersisting() // Set patches to 'persisting'
      updatedBuffer = updatedBuffer.captureError()

      const errorPatches = updatedBuffer.getPatches([
        BUFFERED_PATCH_STATUS_ERROR,
      ])
      expect(errorPatches).toHaveLength(2)
      expect(errorPatches).toContainEqual(patch1)
      expect(errorPatches).toContainEqual(patch2)

      const persistingPatches = updatedBuffer.getPatches([
        BUFFERED_PATCH_STATUS_PERSISTING,
      ])
      expect(persistingPatches).toHaveLength(0)
    })

    it('should not change non-persisting patches', () => {
      const patch1 = {
        type: 'test',
        action: 'update',
        id: '1',
        data: { value: 'a' },
      }
      const patch2 = {
        type: 'test',
        action: 'update',
        id: '2',
        data: { value: 'b' },
      }

      let updatedBuffer = buffer.addPatch(patch1).addPatch(patch2)
      updatedBuffer = updatedBuffer.captureError()

      const errorPatches = updatedBuffer.getPatches([
        BUFFERED_PATCH_STATUS_ERROR,
      ])
      expect(errorPatches).toHaveLength(0)

      const pendingPatches = updatedBuffer.getPatches([
        BUFFERED_PATCH_STATUS_PENDING,
      ])
      expect(pendingPatches).toHaveLength(2)
      expect(pendingPatches).toContainEqual(patch1)
      expect(pendingPatches).toContainEqual(patch2)
    })
  })

  describe('captureSuccess', () => {
    it('should remove persisting and error patches', () => {
      const patch1 = {
        type: 'test',
        action: 'update',
        id: '1',
        data: { value: 'a' },
      }
      const patch2 = {
        type: 'test',
        action: 'update',
        id: '2',
        data: { value: 'b' },
      }
      const patch3 = {
        type: 'test',
        action: 'update',
        id: '3',
        data: { value: 'c' },
      }

      let updatedBuffer = buffer
        .addPatch(patch1)
        .addPatch(patch2)
        .addPatch(patch3)

      updatedBuffer = updatedBuffer.setStatus('persisting', [
        BUFFERED_PATCH_STATUS_PENDING,
      ])
      updatedBuffer = updatedBuffer.setStatus('error', [
        BUFFERED_PATCH_STATUS_PENDING,
      ])

      const newBuffer = updatedBuffer.captureSuccess()

      expect(
        newBuffer.getPatches([BUFFERED_PATCH_STATUS_PENDING]),
      ).toHaveLength(0)
      expect(
        newBuffer.getPatches([BUFFERED_PATCH_STATUS_PERSISTING]),
      ).toHaveLength(0)
      expect(newBuffer.getPatches([BUFFERED_PATCH_STATUS_ERROR])).toHaveLength(
        0,
      )
    })

    it('should keep pending patches', () => {
      const patch1 = {
        type: 'test',
        action: 'update',
        id: '1',
        data: { value: 'a' },
      }
      const patch2 = {
        type: 'test',
        action: 'update',
        id: '2',
        data: { value: 'b' },
      }

      const updatedBuffer = buffer.addPatch(patch1).addPatch(patch2)

      const newBuffer = updatedBuffer.captureSuccess()

      const pendingPatches = newBuffer.getPatches([
        BUFFERED_PATCH_STATUS_PENDING,
      ])
      expect(pendingPatches).toHaveLength(2)
      expect(pendingPatches).toContainEqual(patch1)
      expect(pendingPatches).toContainEqual(patch2)
    })

    it('should handle empty buffer correctly', () => {
      const newBuffer = buffer.captureSuccess()

      expect(newBuffer).toBeInstanceOf(PatchBuffer)
      expect(
        newBuffer.getPatches([BUFFERED_PATCH_STATUS_PENDING]),
      ).toHaveLength(0)
      expect(
        newBuffer.getPatches([BUFFERED_PATCH_STATUS_PERSISTING]),
      ).toHaveLength(0)
      expect(newBuffer.getPatches([BUFFERED_PATCH_STATUS_ERROR])).toHaveLength(
        0,
      )
    })

    it('should return a new instance of PatchBuffer', () => {
      const patch = {
        type: 'test',
        action: 'update',
        id: '1',
        data: { value: 'a' },
      }

      const updatedBuffer = buffer.addPatch(patch)
      const newBuffer = updatedBuffer.captureSuccess()

      expect(newBuffer).toBeInstanceOf(PatchBuffer)
      expect(newBuffer).not.toBe(updatedBuffer)
    })
  })
})
