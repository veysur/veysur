// cspell:ignore remoteip
import { TurnstileVerifier } from './TurnstileVerifier'

const respond = (body: unknown) =>
  jest
    .fn()
    .mockResolvedValue({ json: async () => body }) as unknown as jest.Mock

describe('TurnstileVerifier', () => {
  const input = { token: 'tok', secretKey: 'sec', surveyId: 's1' }

  test('accepts a successful siteverify response', async () => {
    const fetchFn = respond({ success: true })
    expect(await new TurnstileVerifier(fetchFn).verify(input)).toBe(true)
    const [url, init] = fetchFn.mock.calls[0]
    expect(url).toContain('challenges.cloudflare.com')
    expect(init.body.get('secret')).toBe('sec')
    expect(init.body.get('response')).toBe('tok')
    expect(init.body.has('remoteip')).toBe(false)
  })

  test('passes the address on when given', async () => {
    const fetchFn = respond({ success: true })
    await new TurnstileVerifier(fetchFn).verify({
      ...input,
      remoteIp: '1.2.3.4',
    })
    expect(fetchFn.mock.calls[0][1].body.get('remoteip')).toBe('1.2.3.4')
  })

  test('rejects a failed response', async () => {
    expect(
      await new TurnstileVerifier(respond({ success: false })).verify(input),
    ).toBe(false)
  })

  test('rejects when the provider call throws', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new Error('down'))
    expect(await new TurnstileVerifier(fetchFn).verify(input)).toBe(false)
  })
})
