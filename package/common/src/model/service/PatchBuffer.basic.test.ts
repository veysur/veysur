import PatchBuffer from './PatchBuffer'

describe('PatchBuffer - Basic Operations', () => {
  let buffer: PatchBuffer

  beforeEach(() => {
    buffer = new PatchBuffer()
  })

  test('addPatch should add a new patch to the buffer', () => {
    const patch = {
      type: 'test',
      action: 'update',
      id: '1',
      data: { foo: 'bar' },
    }
    const newBuffer = buffer.addPatch(patch)
    expect(newBuffer.getPatches(['pending'])).toHaveLength(1)
    expect(newBuffer.getPatches(['pending'])[0]).toEqual(patch)
  })

  test('addPatch should merge data for existing pending patches', () => {
    const patch1 = {
      type: 'test',
      action: 'update',
      id: '1',
      data: { foo: 'bar' },
    }
    const patch2 = {
      type: 'test',
      action: 'update',
      id: '1',
      data: { baz: 'qux' },
    }
    let newBuffer = buffer.addPatch(patch1)
    newBuffer = newBuffer.addPatch(patch2)
    const patches = newBuffer.getPatches(['pending'])
    expect(patches).toHaveLength(1)
    expect(patches[0].data).toEqual({ foo: 'bar', baz: 'qux' })
  })

  test('addPatch should not merge data for non-pending patches', () => {
    const patch1 = {
      type: 'test',
      action: 'update',
      id: '1',
      data: { foo: 'bar' },
    }
    const patch2 = {
      type: 'test',
      action: 'update',
      id: '1',
      data: { baz: 'qux' },
    }
    let newBuffer = buffer.addPatch(patch1)
    newBuffer = newBuffer.setStatus('persisting', ['pending'])
    newBuffer = newBuffer.addPatch(patch2)
    const persistingPatches = newBuffer.getPatches(['persisting'])
    const pendingPatches = newBuffer.getPatches(['pending'])
    expect(persistingPatches).toHaveLength(1)
    expect(pendingPatches).toHaveLength(1)
    expect(persistingPatches[0].data).toEqual({ foo: 'bar' })
    expect(pendingPatches[0].data).toEqual({ baz: 'qux' })
  })

  test('addPatch should merge with existing pending patches even when persisting patches exist', () => {
    const patch1 = {
      type: 'test',
      action: 'update',
      id: '1',
      data: { foo: 'bar' },
    }
    const patch2 = {
      type: 'test',
      action: 'update',
      id: '1',
      data: { baz: 'qux' },
    }
    const patch3 = {
      type: 'test',
      action: 'update',
      id: '1',
      data: { hello: 'world' },
    }

    // Add first patch and mark it as persisting
    let newBuffer = buffer.addPatch(patch1)
    newBuffer = newBuffer.setStatus('persisting', ['pending'])

    // Add second patch (should create new pending patch)
    newBuffer = newBuffer.addPatch(patch2)

    // Add third patch (should merge with pending patch, not persisting)
    newBuffer = newBuffer.addPatch(patch3)

    const persistingPatches = newBuffer.getPatches(['persisting'])
    const pendingPatches = newBuffer.getPatches(['pending'])

    // Should have 1 persisting and 1 pending (not 2 pending)
    expect(persistingPatches).toHaveLength(1)
    expect(pendingPatches).toHaveLength(1)

    // Persisting patch should have original data
    expect(persistingPatches[0].data).toEqual({ foo: 'bar' })

    // Pending patch should have merged data from patch2 and patch3
    expect(pendingPatches[0].data).toEqual({ baz: 'qux', hello: 'world' })
  })

  test('addPatch should add new patch for different type or id', () => {
    const patch1 = {
      type: 'test1',
      action: 'update',
      id: '1',
      data: { foo: 'bar' },
    }
    const patch2 = {
      type: 'test2',
      action: 'update',
      id: '1',
      data: { baz: 'qux' },
    }
    const patch3 = {
      type: 'test1',
      action: 'update',
      id: '2',
      data: { hello: 'world' },
    }
    let newBuffer = buffer.addPatch(patch1)
    newBuffer = newBuffer.addPatch(patch2)
    newBuffer = newBuffer.addPatch(patch3)
    expect(newBuffer.getPatches(['pending'])).toHaveLength(3)
  })

  test('getPatches should return patches with the specified statuses', () => {
    const patch1 = {
      type: 'test1',
      action: 'update',
      id: '1',
      data: { foo: 'bar' },
    }
    const patch2 = {
      type: 'test2',
      action: 'update',
      id: '2',
      data: { baz: 'qux' },
    }
    let newBuffer = buffer.addPatch(patch1)
    newBuffer = newBuffer.addPatch(patch2)
    newBuffer = newBuffer.setStatus('persisting', ['pending'])

    const pendingPatches = newBuffer.getPatches(['pending'])
    const persistingPatches = newBuffer.getPatches(['persisting'])

    expect(pendingPatches).toHaveLength(0)
    expect(persistingPatches).toHaveLength(2)
    expect(persistingPatches).toContainEqual(patch1)
    expect(persistingPatches).toContainEqual(patch2)
  })

  test('setStatus should update the status of patches', () => {
    const patch1 = {
      type: 'test1',
      action: 'update',
      id: '1',
      data: { foo: 'bar' },
    }
    const patch2 = {
      type: 'test2',
      action: 'update',
      id: '2',
      data: { baz: 'qux' },
    }
    let newBuffer = buffer.addPatch(patch1)
    newBuffer = newBuffer.addPatch(patch2)

    newBuffer = newBuffer.setStatus('persisting', ['pending'])
    expect(newBuffer.getPatches(['persisting'])).toHaveLength(2)

    newBuffer = newBuffer.setStatus('error', ['persisting'])
    expect(newBuffer.getPatches(['error'])).toHaveLength(2)
    expect(newBuffer.getPatches(['persisting'])).toHaveLength(0)
  })

  test('setStatus should only update patches with specified "from" status', () => {
    const patch1 = {
      type: 'test1',
      action: 'update',
      id: '1',
      data: { foo: 'bar' },
    }
    const patch2 = {
      type: 'test2',
      action: 'update',
      id: '2',
      data: { baz: 'qux' },
    }
    let newBuffer = buffer.addPatch(patch1)
    newBuffer = newBuffer.addPatch(patch2)

    newBuffer = newBuffer.setStatus('persisting', ['pending'])
    newBuffer = newBuffer.setStatus('error', ['pending'])

    expect(newBuffer.getPatches(['persisting'])).toHaveLength(2)
    expect(newBuffer.getPatches(['error'])).toHaveLength(0)
  })

  test('clearPatches should remove patches with specified statuses', () => {
    const patch1 = {
      type: 'test1',
      action: 'update',
      id: '1',
      data: { foo: 'bar' },
    }
    const patch2 = {
      type: 'test2',
      action: 'update',
      id: '2',
      data: { baz: 'qux' },
    }
    let newBuffer = buffer.addPatch(patch1)
    newBuffer = newBuffer.addPatch(patch2)

    newBuffer = newBuffer.setStatus('persisting', ['pending'])
    newBuffer = newBuffer.clearPatches(['persisting'])

    expect(newBuffer.getPatches(['persisting'])).toHaveLength(0)
    expect(newBuffer.getPatches(['pending'])).toHaveLength(0)
  })

  test('clearPatches should not remove patches with non-specified statuses', () => {
    const patch1 = {
      type: 'test1',
      action: 'update',
      id: '1',
      data: { foo: 'bar' },
    }
    const patch2 = {
      type: 'test2',
      action: 'update',
      id: '2',
      data: { baz: 'qux' },
    }
    let newBuffer = buffer.addPatch(patch1)
    newBuffer = newBuffer.addPatch(patch2)

    newBuffer = newBuffer.setStatus('persisting', ['pending'])
    newBuffer = newBuffer.clearPatches(['error'])

    expect(newBuffer.getPatches(['persisting'])).toHaveLength(2)
  })

  test('isEmpty should return true for an empty buffer', () => {
    expect(buffer.isEmpty()).toBe(true)
  })

  test('isEmpty should return false for a non-empty buffer', () => {
    const patch = {
      type: 'test',
      action: 'update',
      id: '1',
      data: { foo: 'bar' },
    }
    const newBuffer = buffer.addPatch(patch)
    expect(newBuffer.isEmpty()).toBe(false)
  })
})
