import * as Sentry from '@sentry/node'
import { captureWithFingerprint } from './captureWithFingerprint'

jest.mock('@sentry/node', () => {
  const setFingerprint = jest.fn()
  return {
    __setFingerprint: setFingerprint,
    captureException: jest.fn(),
    withScope: (cb: (scope: { setFingerprint: jest.Mock }) => void) =>
      cb({ setFingerprint }),
  }
})

const mocked = Sentry as unknown as {
  __setFingerprint: jest.Mock
  captureException: jest.Mock
}

beforeEach(() => {
  mocked.__setFingerprint.mockClear()
  mocked.captureException.mockClear()
})

describe('captureWithFingerprint', () => {
  it('sets the fingerprint and captures the error', () => {
    const err = new Error('boom')
    captureWithFingerprint(['my-episode'], err)
    expect(mocked.__setFingerprint).toHaveBeenCalledWith(['my-episode'])
    expect(mocked.captureException).toHaveBeenCalledWith(err)
  })

  it('captures without a fingerprint when none is given', () => {
    const err = new Error('boom')
    captureWithFingerprint(undefined, err)
    expect(mocked.__setFingerprint).not.toHaveBeenCalled()
    expect(mocked.captureException).toHaveBeenCalledWith(err)
  })

  it('ignores an empty fingerprint array', () => {
    captureWithFingerprint([], new Error('x'))
    expect(mocked.__setFingerprint).not.toHaveBeenCalled()
    expect(mocked.captureException).toHaveBeenCalledTimes(1)
  })
})
