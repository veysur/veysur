import Patcher from './Patcher'

describe('Patcher', () => {
  let patcher: Patcher

  beforeEach(() => {
    patcher = new Patcher()
  })

  test('addHandler adds a handler for a patch type and action', async () => {
    const mockHandler = jest.fn()
    patcher.addHandler('testPatch', 'update', mockHandler)

    await patcher.applyPatch(
      { type: 'testPatch', action: 'update', data: {} },
      {},
    )
    expect(mockHandler).toHaveBeenCalled()
  })

  test('applyPatch throws an error for unknown patch type or action', async () => {
    await expect(
      patcher.applyPatch(
        { type: 'unknownPatch', action: 'update', data: {} },
        {},
      ),
    ).rejects.toThrow(
      'No patch handler found for handler key "unknownPatch:update"',
    )

    await expect(
      patcher.applyPatch(
        { type: 'testPatch', action: 'unknownAction', data: {} },
        {},
      ),
    ).rejects.toThrow(
      'No patch handler found for handler key "testPatch:unknownAction"',
    )
  })

  test('applyPatch calls the correct handler with patch and context', async () => {
    const mockHandler = jest.fn()
    const patch = { type: 'testPatch', action: 'update', data: { foo: 'bar' } }
    const context = { baz: 'qux' }

    patcher.addHandler('testPatch', 'update', mockHandler)
    await patcher.applyPatch(patch, context)

    expect(mockHandler).toHaveBeenCalledWith(patch, context)
  })

  test('applyAll applies multiple patches in order', async () => {
    const mockHandler1 = jest.fn()
    const mockHandler2 = jest.fn()
    const patches = [
      { type: 'patch1', action: 'create', data: { order: 1 } },
      { type: 'patch2', action: 'update', data: { order: 2 } },
    ]
    const context = { test: 'context' }

    patcher.addHandler('patch1', 'create', mockHandler1)
    patcher.addHandler('patch2', 'update', mockHandler2)

    await patcher.applyAll(patches, context)

    expect(mockHandler1).toHaveBeenCalledWith(patches[0], context)
    expect(mockHandler2).toHaveBeenCalledWith(patches[1], context)

    // Check the order of calls
    expect(mockHandler1.mock.invocationCallOrder[0]).toBeLessThan(
      mockHandler2.mock.invocationCallOrder[0],
    )
  })

  test('applyAll stops on first error', async () => {
    const mockHandler1 = jest.fn()
    const mockHandler2 = jest.fn().mockRejectedValue(new Error('Test error'))
    const mockHandler3 = jest.fn()
    const patches = [
      { type: 'patch1', action: 'create', data: {} },
      { type: 'patch2', action: 'update', data: {} },
      { type: 'patch3', action: 'delete', data: {} },
    ]

    patcher.addHandler('patch1', 'create', mockHandler1)
    patcher.addHandler('patch2', 'update', mockHandler2)
    patcher.addHandler('patch3', 'delete', mockHandler3)

    await expect(patcher.applyAll(patches, {})).rejects.toThrow('Test error')
    expect(mockHandler1).toHaveBeenCalled()
    expect(mockHandler2).toHaveBeenCalled()
    expect(mockHandler3).not.toHaveBeenCalled()
  })
})
