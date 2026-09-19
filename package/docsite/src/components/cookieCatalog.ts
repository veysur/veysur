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
    description: 'Required for the site to function. Cannot be disabled.',
    cookies: [],
  },
  {
    id: 'functional',
    label: 'Functional',
    description: 'Remembers your preferences across visits.',
    cookies: [],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description:
      'Helps us understand how visitors use the docs so we can improve them. All data is anonymised.',
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
