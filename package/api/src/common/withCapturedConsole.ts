type ConsoleMethod = 'log' | 'warn' | 'error' | 'info'

const METHODS: ConsoleMethod[] = ['log', 'warn', 'error', 'info']

export interface CapturedRun<T> {
  /** false when `fn` threw */
  ok: boolean
  /** the resolved value, or undefined when `fn` threw */
  result: T | undefined
  /** the thrown value, or null on success */
  error: unknown
  /** captured console output joined by newlines, or null if nothing was written */
  log: string | null
}

/**
 * Run `fn` with `console.{log,warn,error,info}` teed into a buffer, then restore
 * the originals. The captured output is returned alongside the result or the
 * thrown error — this helper never throws, so the caller keeps the captured log
 * on the failure path too.
 *
 * A flat `{ ok, result, error }` shape (rather than a discriminated union) is
 * deliberate: this package builds with `strictNullChecks` off, where union
 * narrowing on a literal discriminant is unreliable.
 */
export async function withCapturedConsole<T>(
  fn: () => Promise<T>,
): Promise<CapturedRun<T>> {
  const lines: string[] = []
  const originals = {} as Record<ConsoleMethod, (...args: unknown[]) => void>

  for (const method of METHODS) {
    const original = console[method] as (...args: unknown[]) => void
    originals[method] = original
    console[method] = (...args: unknown[]) => {
      lines.push(`[${method}] ${args.map(String).join(' ')}`)
      original(...args)
    }
  }

  try {
    const result = await fn()
    return { ok: true, result, error: null, log: lines.join('\n') || null }
  } catch (error) {
    return {
      ok: false,
      result: undefined,
      error,
      log: lines.join('\n') || null,
    }
  } finally {
    for (const method of METHODS) {
      console[method] = originals[method]
    }
  }
}
