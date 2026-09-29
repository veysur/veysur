type ConsolePattern = string | RegExp

const KNOWN_BENIGN_PATTERNS: ConsolePattern[] = [
  // core/ repos use the project datasource, which selects the database by projectId -
  // it is deliberately not a stored schema field on those repos, so any project-scoped
  // filter that includes projectId (common, for defence-in-depth) trips @datacapy/om's
  // unknown-query-key warning. Expected on every core/ repo query filtered by projectId.
  'query key "projectId" is not a schema field',
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
        `triggering code in allowConsole(...) from src/test-utils/consoleGuard.ts (see root ` +
        `AGENTS.md, "Console Noise in Tests").`,
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
