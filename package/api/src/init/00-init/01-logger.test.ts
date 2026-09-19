import * as Sentry from '@sentry/node'
import { createSentryTransport } from './01-logger'

jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
}))

describe('createSentryTransport', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('reports to Sentry when the endpoint error was not handled', () => {
    const transport = createSentryTransport()

    transport.error({
      handled: false,
      errorName: 'TypeError',
      errorMessage: 'Cannot read property of undefined',
      errorStack: 'TypeError: Cannot read property of undefined\n    at foo',
    })

    expect(Sentry.captureException).toHaveBeenCalledTimes(1)
    const capturedError = (Sentry.captureException as jest.Mock).mock
      .calls[0][0]
    expect(capturedError).toBeInstanceOf(Error)
    expect(capturedError.name).toBe('TypeError')
    expect(capturedError.message).toBe('Cannot read property of undefined')
    expect(capturedError.stack).toBe(
      'TypeError: Cannot read property of undefined\n    at foo',
    )
  })

  test('does not report to Sentry when the endpoint error was handled', () => {
    const transport = createSentryTransport()

    transport.error({
      handled: true,
      errorName: 'ValidationError',
      errorMessage: 'Invalid input',
    })

    expect(Sentry.captureException).not.toHaveBeenCalled()
  })

  test('does not report to Sentry when handled and statusCode is below 500', () => {
    const transport = createSentryTransport()

    transport.error({
      handled: true,
      statusCode: 400,
      errorName: 'ValidationError',
      errorMessage: 'Invalid input',
    })

    expect(Sentry.captureException).not.toHaveBeenCalled()
  })

  test('reports to Sentry when handled is true but statusCode is 500', () => {
    const transport = createSentryTransport()

    transport.error({
      handled: true,
      statusCode: 500,
      errorName: 'Error',
      errorMessage: 'Project not found',
    })

    expect(Sentry.captureException).toHaveBeenCalledTimes(1)
    const capturedError = (Sentry.captureException as jest.Mock).mock
      .calls[0][0]
    expect(capturedError).toBeInstanceOf(Error)
    expect(capturedError.name).toBe('Error')
    expect(capturedError.message).toBe('Project not found')
  })

  test('does not report to Sentry for log values with no handled field', () => {
    const transport = createSentryTransport()

    transport.error('some plain string log message')

    expect(Sentry.captureException).not.toHaveBeenCalled()
  })

  test('still logs to console.error in all cases', () => {
    const transport = createSentryTransport()

    transport.error({ handled: false, errorMessage: 'boom' })

    expect(console.error).toHaveBeenCalledWith({
      handled: false,
      errorMessage: 'boom',
    })
  })
})
