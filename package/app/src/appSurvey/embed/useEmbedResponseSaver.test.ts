import { renderHook } from '@testing-library/react'

import { ErrorRest } from 'model'

import { useEmbedResponseSaver } from './useEmbedResponseSaver'

const mockAuthenticate = jest.fn()
const mockSaveResponse = jest.fn()

jest.mock('appSurvey/registry', () => ({
  getAuthParticipantApi: () => ({ authenticate: mockAuthenticate }),
  getSurveyParticipantResponseApi: () => ({ saveResponse: mockSaveResponse }),
}))

describe('useEmbedResponseSaver', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthenticate.mockResolvedValue({ jwt: 'jwt-1' })
    mockSaveResponse.mockResolvedValue(undefined)
  })

  const setup = () =>
    renderHook(() => useEmbedResponseSaver('s1', 'https://host.example')).result
      .current

  test('does not authenticate or save for seeds alone', async () => {
    const save = setup()

    await save({}, false, { q1: 7 })

    expect(mockAuthenticate).not.toHaveBeenCalled()
    expect(mockSaveResponse).not.toHaveBeenCalled()
  })

  test('authenticates once with the embed origin and carries earlier seeds into the first save', async () => {
    const save = setup()

    await save({}, false, { q1: 7 })
    await save({ q1: 'a' }, false, undefined, 'en')
    await save({ q1: 'a', q2: 'b' }, true)

    expect(mockAuthenticate).toHaveBeenCalledTimes(1)
    expect(mockAuthenticate).toHaveBeenCalledWith(
      's1',
      undefined,
      undefined,
      'https://host.example',
    )
    expect(mockSaveResponse).toHaveBeenNthCalledWith(
      1,
      's1',
      {
        answers: { q1: 'a' },
        randomSeeds: { q1: 7 },
        completedAt: false,
        language: 'en',
      },
      'jwt-1',
    )
    expect(mockSaveResponse.mock.calls[1][1]).toMatchObject({
      answers: { q1: 'a', q2: 'b' },
      completedAt: true,
    })
  })

  test('runs saves in order even when started together', async () => {
    const order: string[] = []
    let releaseFirst: () => void = () => undefined
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    mockSaveResponse.mockImplementation(async (_id, body) => {
      if (body.answers.n === 1) {
        await firstGate
      }
      order.push(`n${body.answers.n}`)
    })
    const save = setup()

    const saves = Promise.all([save({ n: 1 }), save({ n: 2 })])
    releaseFirst()
    await saves

    expect(order).toEqual(['n1', 'n2'])
  })

  test('surfaces the server message when authentication is refused, and retries authentication next time', async () => {
    mockAuthenticate.mockRejectedValueOnce(
      new ErrorRest({
        ref: 'ERROR_EMBED_NOT_ALLOWED',
        userMessage: 'This survey cannot be embedded on this website',
      }),
    )
    const save = setup()

    await expect(save({ q1: 'a' })).rejects.toThrow(
      'This survey cannot be embedded on this website',
    )
    await save({ q1: 'a' })

    expect(mockAuthenticate).toHaveBeenCalledTimes(2)
    expect(mockSaveResponse).toHaveBeenCalledTimes(1)
  })
})
