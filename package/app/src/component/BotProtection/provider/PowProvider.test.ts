import { createHash } from 'crypto'

import { PowProvider } from './PowProvider'

jest.mock('./createPowWorker', () => ({ createPowWorker: () => null }))

describe('PowProvider (no worker available)', () => {
  test('solves the challenge and returns challenge:nonce', async () => {
    const token = await new PowProvider().solve({
      container: document.createElement('div'),
      siteKey: '',
      fetchChallenge: async () => ({
        challenge: 'c.8.0.sig',
        bits: 8,
        minSeconds: 0,
      }),
    })

    const [challenge, nonce] = token.split(/:(?=[^:]*$)/)
    expect(challenge).toBe('c.8.0.sig')
    const digest = createHash('sha256').update(`${challenge}:${nonce}`).digest()
    expect(digest[0]).toBe(0)
  })

  test('waits out the minimum time before returning', async () => {
    jest.useFakeTimers()
    try {
      const promise = new PowProvider().solve({
        container: document.createElement('div'),
        siteKey: '',
        fetchChallenge: async () => ({
          challenge: 'c.1.0.sig',
          bits: 1,
          minSeconds: 2,
        }),
      })
      let settled = false
      void promise.then(() => (settled = true))

      await jest.advanceTimersByTimeAsync(1000)
      expect(settled).toBe(false)
      await jest.advanceTimersByTimeAsync(1500)
      expect(settled).toBe(true)
    } finally {
      jest.useRealTimers()
    }
  })
})
