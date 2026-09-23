type ConsolePattern = string | RegExp

const KNOWN_BENIGN_PATTERNS: ConsolePattern[] = [
  // jsdom has no layout engine, so Recharts' ResponsiveContainer always measures a 0x0
  // container and warns on every render of a chart component.
  'width(0) and height(0)',
  // A component tree rendered in isolation (no I18nextProvider) that includes a
  // useTranslation() consumer (e.g. SurveyQuestionError) triggers this on every render -
  // expected whenever a unit test doesn't wrap the full app provider tree.
  'You will need to pass in an i18next instance',
]

const activeScopedPatterns: ConsolePattern[] = []

function matchesAnyPattern(message: string, patterns: ConsolePattern[]): boolean {
  return patterns.some((pattern) =>
    typeof pattern === 'string' ? message.includes(pattern) : pattern.test(message),
  )
}

function guard(methodName: 'error' | 'warn') {
  const original = console[methodName].bind(console)
  return jest.spyOn(console, methodName).mockImplementation((...args: unknown[]) => {
    const message = args.map(String).join(' ')
    if (
      matchesAnyPattern(message, KNOWN_BENIGN_PATTERNS) ||
      matchesAnyPattern(message, activeScopedPatterns)
    ) {
      return
    }
    original(...args)
    throw new Error(
      `Unexpected console.${methodName} call: "${message}". If this is expected, wrap the ` +
        `triggering code in allowConsole(...) from tests/consoleGuard.ts (see root AGENTS.md, ` +
        `"Console Noise in Tests").`,
    )
  })
}

export function installConsoleGuard(): void {
  let errorSpy: jest.SpyInstance
  let warnSpy: jest.SpyInstance

  beforeEach(() => {
    errorSpy = guard('error')
    warnSpy = guard('warn')
  })

  afterEach(() => {
    errorSpy.mockRestore()
    warnSpy.mockRestore()
  })
}

export async function allowConsole<T>(
  patterns: ConsolePattern[] | ConsolePattern,
  fn: () => T | Promise<T>,
): Promise<T> {
  const patternList = Array.isArray(patterns) ? patterns : [patterns]
  activeScopedPatterns.push(...patternList)
  try {
    return await fn()
  } finally {
    for (const pattern of patternList) {
      const index = activeScopedPatterns.indexOf(pattern)
      if (index !== -1) activeScopedPatterns.splice(index, 1)
    }
  }
}
