import { setDomainSubdomain } from './domainUtils'

describe('setDomainSubdomain', () => {
  it('replaces the existing subdomain', () => {
    expect(setDomainSubdomain('www.example.com', 'account')).toBe(
      'account.example.com',
    )
  })

  it('adds a subdomain when none is present', () => {
    expect(setDomainSubdomain('example.com', 'account')).toBe(
      'account.example.com',
    )
  })

  it('works for platform subdomain', () => {
    expect(setDomainSubdomain('www.mydomain.com', 'platform')).toBe(
      'platform.mydomain.com',
    )
  })

  it('works with a project subdomain', () => {
    expect(setDomainSubdomain('www.mydomain.com', 'myproject')).toBe(
      'myproject.mydomain.com',
    )
  })
})
