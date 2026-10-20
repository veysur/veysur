export type CookieInfo = {
  name: string
  description: string
  duration: string
}

export type CookieCategory = {
  id: 'necessary' | 'functional' | 'analytics' | 'marketing'
  label: string
  description: string
  cookies: CookieInfo[]
}

export const cookieCatalog: CookieCategory[] = [
  {
    id: 'necessary',
    label: 'Strictly Necessary',
    description:
      'Required for the application to function. Cannot be disabled.',
    cookies: [
      {
        name: 'veysur-theme',
        description: 'Stores your light or dark theme preference.',
        duration: '1 year',
      },
      {
        name: 'sidebar_state',
        description:
          'Stores whether the navigation sidebar is expanded or collapsed.',
        duration: '7 days',
      },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description:
      'Helps us understand how the app is used so we can improve it. All data is anonymised.',
    cookies: [
      {
        name: '_ga',
        description: 'Google Analytics — distinguishes unique users.',
        duration: '6 months',
      },
      {
        name: '_ga_*',
        description: 'Google Analytics — maintains session state.',
        duration: '6 months',
      },
    ],
  },
]

/**
 * Core sets no marketing cookies, so this category is shown only when an extension
 * supplies some.
 */
const marketingCategory: CookieCategory = {
  id: 'marketing',
  label: 'Marketing',
  description:
    'Measures how well our advertising performs. Only set if you agree.',
  cookies: [],
}

/**
 * Adds an extension's cookies to core's catalogue, category by category. Core's
 * categories, and the order of cookies within them, are unchanged. The marketing
 * category is appended only when the extension supplies marketing cookies.
 */
export function mergeExtraCookies(
  catalog: CookieCategory[],
  extra: Partial<Record<CookieCategory['id'], CookieInfo[]>>,
): CookieCategory[] {
  const merged = catalog.map((category) => ({
    ...category,
    cookies: [...category.cookies, ...(extra[category.id] ?? [])],
  }))
  const marketing = extra.marketing ?? []
  if (marketing.length === 0 || catalog.some((c) => c.id === 'marketing')) {
    return merged
  }
  return [...merged, { ...marketingCategory, cookies: marketing }]
}
