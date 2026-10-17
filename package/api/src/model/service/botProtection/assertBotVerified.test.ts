import { assertBotVerified } from './assertBotVerified'

describe('assertBotVerified', () => {
  test.each([
    [undefined],
    [null],
    [{}],
    [{ botRequired: false }],
    [{ botRequired: true, botVerified: true }],
  ])('passes %j', (claims) => {
    expect(() => assertBotVerified(claims)).not.toThrow()
  })

  test.each([
    [{ botRequired: true }],
    [{ botRequired: true, botVerified: false }],
  ])('rejects %j with ERROR_BOT_CHECK_FAILED', (claims) => {
    expect(() => assertBotVerified(claims)).toThrow(
      expect.objectContaining({ ref: 'ERROR_BOT_CHECK_FAILED' }),
    )
  })
})
