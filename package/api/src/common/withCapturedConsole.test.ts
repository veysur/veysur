import { withCapturedConsole } from './withCapturedConsole'
import { allowConsole } from '../test-utils/consoleGuard'

describe('withCapturedConsole', () => {
  it('captures console output and returns the result', async () => {
    const run = await allowConsole('careful', () =>
      withCapturedConsole(async () => {
        console.log('hello', 42)
        console.warn('careful')
        return 'done'
      }),
    )

    expect(run).toEqual({
      ok: true,
      result: 'done',
      error: null,
      log: '[log] hello 42\n[warn] careful',
    })
  })

  it('returns null log when nothing is written', async () => {
    const run = await withCapturedConsole(async () => 7)
    expect(run).toEqual({ ok: true, result: 7, error: null, log: null })
  })

  it('captures the error and any output when fn throws', async () => {
    const boom = new Error('boom')
    const run = await allowConsole('before throw', () =>
      withCapturedConsole(async () => {
        console.error('before throw')
        throw boom
      }),
    )

    expect(run).toEqual({
      ok: false,
      result: undefined,
      error: boom,
      log: '[error] before throw',
    })
  })

  it('restores the original console methods, even on throw', async () => {
    const original = console.log
    await withCapturedConsole(async () => {
      throw new Error('x')
    }).catch(() => {})
    expect(console.log).toBe(original)

    await withCapturedConsole(async () => undefined)
    expect(console.log).toBe(original)
  })
})
