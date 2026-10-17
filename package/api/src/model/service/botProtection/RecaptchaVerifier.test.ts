import { RecaptchaVerifier } from './RecaptchaVerifier'

const respond = (body: unknown) =>
  jest
    .fn()
    .mockResolvedValue({ json: async () => body }) as unknown as jest.Mock

describe('RecaptchaVerifier', () => {
  const input = { token: 'tok', secretKey: 'sec', surveyId: 's1' }

  test('accepts a score at the threshold', async () => {
    const verifier = new RecaptchaVerifier(
      0.5,
      respond({ success: true, score: 0.5 }),
    )
    expect(await verifier.verify(input)).toBe(true)
  })

  test('rejects a score below the threshold', async () => {
    const verifier = new RecaptchaVerifier(
      0.5,
      respond({ success: true, score: 0.3 }),
    )
    expect(await verifier.verify(input)).toBe(false)
  })

  test('rejects an unsuccessful response or a missing score', async () => {
    expect(
      await new RecaptchaVerifier(
        0.5,
        respond({ success: false, score: 0.9 }),
      ).verify(input),
    ).toBe(false)
    expect(
      await new RecaptchaVerifier(0.5, respond({ success: true })).verify(
        input,
      ),
    ).toBe(false)
  })

  test('rejects when the provider call throws', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new Error('down'))
    expect(await new RecaptchaVerifier(0.5, fetchFn).verify(input)).toBe(false)
  })
})
