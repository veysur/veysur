import PatchBuffer, { BufferedPatch } from './PatchBuffer'

describe('PatchBuffer - Apply Attempt', () => {
  let buffer: PatchBuffer

  beforeEach(() => {
    buffer = new PatchBuffer()
  })

  describe('getApplyAttempt', () => {
    it('should return 0 for an empty buffer', () => {
      expect(buffer.getApplyAttempt()).toBe(0)
    })

    it('should return the maximum persist attempt count', () => {
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
      let newBuffer = buffer.addPatch(patch1).addPatch(patch2)
      newBuffer = newBuffer.capturePersisting()
      newBuffer = newBuffer.captureError()
      newBuffer = newBuffer.incrementApplyAttempt()
      expect(newBuffer.getApplyAttempt()).toBe(2)
    })

    it('should return the correct persist attempt count after multiple operations', () => {
      const patch = {
        type: 'test',
        action: 'update',
        id: '1',
        data: { value: 'a' },
      }
      let newBuffer = buffer.addPatch(patch)
      newBuffer = newBuffer.capturePersisting()
      newBuffer = newBuffer.captureError()
      newBuffer = newBuffer.incrementApplyAttempt()
      newBuffer = newBuffer.incrementApplyAttempt()
      newBuffer = newBuffer.capturePersisting()
      expect(newBuffer.getApplyAttempt()).toBe(3)
    })
  })

  describe('incrementApplyAttempt', () => {
    it('should increment persist attempt for all patches', () => {
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
      let newBuffer = buffer.addPatch(patch1).addPatch(patch2)
      newBuffer = newBuffer.capturePersisting()
      newBuffer = newBuffer.captureError()
      newBuffer = newBuffer.incrementApplyAttempt()
      expect(newBuffer.getApplyAttempt()).toBe(2)
      newBuffer = newBuffer.incrementApplyAttempt()
      expect(newBuffer.getApplyAttempt()).toBe(3)
    })

    it('should return a new instance of PatchBuffer', () => {
      const patch = {
        type: 'test',
        action: 'update',
        id: '1',
        data: { value: 'a' },
      }
      const updatedBuffer = buffer.addPatch(patch)
      const newBuffer = updatedBuffer.incrementApplyAttempt()
      expect(newBuffer).toBeInstanceOf(PatchBuffer)
      expect(newBuffer).not.toBe(updatedBuffer)
    })

    it('should not affect pending patches', () => {
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
      let newBuffer = buffer.addPatch(patch1).addPatch(patch2)
      newBuffer = newBuffer.incrementApplyAttempt()
      expect(newBuffer.getApplyAttempt()).toBe(0)
    })

    it('should only increment persist attempt for error patches', () => {
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
      let newBuffer = buffer.addPatch(patch1)
      newBuffer = newBuffer.setStatus('success', ['pending'])
      newBuffer = newBuffer.addPatch(patch2)
      newBuffer = newBuffer.setStatus('persisting', ['pending'])
      newBuffer = newBuffer.addPatch(patch3)
      newBuffer = newBuffer.setStatus('error', ['pending'])
      newBuffer = newBuffer.incrementApplyAttempt()

      const privateBuffer = (
        newBuffer as unknown as { buffer: BufferedPatch[] }
      ).buffer
      expect(privateBuffer[0].persistAttempt).toBe(0)
      expect(privateBuffer[1].persistAttempt).toBe(0)
      expect(privateBuffer[2].persistAttempt).toBe(1)
    })
  })
})
