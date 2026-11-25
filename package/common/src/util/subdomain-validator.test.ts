import {
  SUBDOMAIN_FORMAT_MESSAGE,
  SUBDOMAIN_REQUIREMENTS,
  validateSubdomainPrefix,
} from './subdomain-validator'

describe('validateSubdomainPrefix', () => {
  it.each(['cricket', 'my-cricket', 'cricket2', '  Cricket  '])('accepts %j', (v) => {
    expect(validateSubdomainPrefix(v)).toBe(true)
  })

  it.each(['test', 'survey', 'www'])('rejects reserved word %j', (v) => {
    expect(validateSubdomainPrefix(v)).toBe(
      'This subdomain is reserved and cannot be used',
    )
  })

  it('requires a value', () => {
    expect(validateSubdomainPrefix('  ')).toBe('Subdomain is required')
  })

  it.each(['1cricket', 'cricket-', '-cricket', 'my_cricket', 'café'])(
    'rejects malformed %j with the shared format message',
    (v) => {
      expect(validateSubdomainPrefix(v)).toBe(SUBDOMAIN_FORMAT_MESSAGE)
    },
  )

  it('states the same start and end rule in the requirements list', () => {
    expect(SUBDOMAIN_FORMAT_MESSAGE).toContain(
      'start with a letter and end with a letter or number',
    )
    expect(SUBDOMAIN_REQUIREMENTS).toContain(
      'Must start with a letter and end with a letter or number',
    )
  })
})
