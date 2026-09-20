export type CookieInfo = {
  name: string
  description: string
  duration: string
}

export type CookieCategory = {
  id: 'necessary' | 'functional' | 'analytics'
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
 * Adds an overlay's cookies to core's catalogue, category by category. Core's
 * categories, and the order of cookies within them, are unchanged.
 */
export function mergeExtraCookies(
  catalog: CookieCategory[],
  extra: Partial<Record<CookieCategory['id'], CookieInfo[]>>,
): CookieCategory[] {
  return catalog.map((category) => ({
    ...category,
    cookies: [...category.cookies, ...(extra[category.id] ?? [])],
  }))
}
