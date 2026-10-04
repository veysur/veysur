import { REALTIME_EVENT_NAME } from 'veysur-common'

import { ServiceRealtime } from './ServiceRealtime'
import { asPrivate } from 'test-utils/asPrivate'

const emit = jest.fn()
const to = jest.fn(() => ({ emit }))
jest.mock('@socket.io/redis-emitter', () => ({
  Emitter: jest.fn().mockImplementation(() => ({ to })),
}))

type ServicePrivateOverrides = {
  modelManager: {
    dataSources: Record<string, unknown>
    logger: { error: jest.Mock }
  }
}

describe('ServiceRealtime', () => {
  let service: ServiceRealtime
  let privates: ServicePrivateOverrides
  const duplicate = jest.fn().mockReturnValue({})

  beforeEach(() => {
    jest.clearAllMocks()
    service = new ServiceRealtime()
    privates = asPrivate<ServiceRealtime, ServicePrivateOverrides>(service)
    privates.modelManager = {
      dataSources: { cacheDb: { duplicate } },
      logger: { error: jest.fn() },
    }
  })

  it('emits through the Redis emitter when Redis is available', async () => {
    await service.emitToUser('u1', 'notification.changed', { a: 1 })

    expect(duplicate).toHaveBeenCalledWith({ keyPrefix: undefined })
    expect(to).toHaveBeenCalledWith('user:u1')
    expect(emit).toHaveBeenCalledWith(REALTIME_EVENT_NAME, {
      type: 'notification.changed',
      payload: { a: 1 },
    })
  })

  it('reuses one emitter across calls', async () => {
    await service.emitToUser('u1', 't')
    await service.emitToUser('u2', 't')

    expect(duplicate).toHaveBeenCalledTimes(1)
  })

  it('falls back to the attached io without Redis', async () => {
    privates.modelManager.dataSources = {}
    const ioEmit = jest.fn()
    const ioTo = jest.fn(() => ({ emit: ioEmit }))
    service.attachIo({ to: ioTo } as unknown as Parameters<
      ServiceRealtime['attachIo']
    >[0])

    await service.emitToUser('u1', 't')

    expect(ioTo).toHaveBeenCalledWith('user:u1')
    expect(ioEmit).toHaveBeenCalledWith(REALTIME_EVENT_NAME, {
      type: 't',
      payload: undefined,
    })
    expect(emit).not.toHaveBeenCalled()
  })

  it('does nothing without Redis or io', async () => {
    privates.modelManager.dataSources = {}

    await expect(service.emitToUser('u1', 't')).resolves.toBeUndefined()
  })

  it('swallows and logs transport errors', async () => {
    emit.mockImplementationOnce(() => {
      throw new Error('boom')
    })

    await expect(service.emitToUser('u1', 't')).resolves.toBeUndefined()
    expect(privates.modelManager.logger.error).toHaveBeenCalled()
  })
})
