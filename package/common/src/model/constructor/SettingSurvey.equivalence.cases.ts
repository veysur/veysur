const GROUPS: Record<string, unknown> = {
  _id: 'id1',
  welcome: { message: { en: 'Hi' } },
  thankYou: {
    message: { en: 'Bye' },
    link: { url: { en: 'u' }, text: { en: 't' } },
  },
  language: { default: 'de', options: ['de', 'en'] },
  presentation: { format: 'all', noAnswer: true, navDelay: 3, backNav: false },
  participant: { htmlEmail: true, tokenLength: 8 },
  data: { timestamp: true, ip: false },
  access: { anonymous: true, embedDomains: ['a.example'] },
  schedule: { start: '2025-01-02T03:04:05.000Z', end: null },
  contentFormat: { htmlAllowed: true },
  dataPolicy: { show: true, text: { en: 'p' } },
  legalNotice: { show: false, url: { en: 'u' } },
  notify: { basic: 'a', detailed: 'b' },
  stats: { questions: { q1: { chartType: 'bar', valueMode: 'count' } } },
  createdAt: '2025-01-02T03:04:05.000Z',
  updatedAt: new Date('2025-01-02T03:04:05.000Z'),
}

export function settingCases(): Record<string, unknown[]> {
  const cases: Record<string, unknown[]> = {
    'no argument': [],
    empty: [{}],
    'unknown key': [{ $unknown: 1 }],
    'all typical': [GROUPS],
    'all null': [Object.fromEntries(Object.keys(GROUPS).map((k) => [k, null]))],
  }
  for (const [key, value] of Object.entries(GROUPS)) {
    cases[`${key}: undefined`] = [{ [key]: undefined }]
    cases[`${key}: null`] = [{ [key]: null }]
    cases[`${key}: empty`] = [{ [key]: {} }]
    cases[`${key}: typical`] = [{ [key]: value }]
  }
  return cases
}
