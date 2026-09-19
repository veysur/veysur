// cspell:ignore globex
import {
  resolveActiveProject,
  getProjectScopeStrategy,
} from './resolveActiveProject'

type TestProject = { _id: string; subdomain: string; domain: string }

const acme: TestProject = {
  _id: 'p1',
  subdomain: 'acme.veysur.com',
  domain: 'surveys.acme.example',
}
const globex: TestProject = {
  _id: 'p2',
  subdomain: 'globex.veysur.com',
  domain: '',
}

describe('resolveActiveProject', () => {
  describe('subdomain strategy', () => {
    it('matches on subdomain', () => {
      expect(
        resolveActiveProject(
          [acme, globex],
          { host: 'globex.veysur.com' },
          'subdomain',
        ),
      ).toBe(globex)
    })

    it('matches on custom domain', () => {
      expect(
        resolveActiveProject(
          [acme, globex],
          { host: 'surveys.acme.example' },
          'subdomain',
        ),
      ).toBe(acme)
    })

    it('returns null when the host matches no project', () => {
      expect(
        resolveActiveProject(
          [acme, globex],
          { host: 'account.veysur.com' },
          'subdomain',
        ),
      ).toBeNull()
    })

    it('ignores empty subdomain/domain entries', () => {
      expect(
        resolveActiveProject([globex], { host: '' }, 'subdomain'),
      ).toBeNull()
    })
  })

  describe('single strategy', () => {
    it('returns the sole project regardless of host', () => {
      expect(
        resolveActiveProject([acme], { host: 'anything.example' }, 'single'),
      ).toBe(acme)
    })

    it('returns the first project when several exist', () => {
      expect(
        resolveActiveProject([acme, globex], { host: 'x' }, 'single'),
      ).toBe(acme)
    })

    it('returns null for an empty list', () => {
      expect(resolveActiveProject([], { host: 'x' }, 'single')).toBeNull()
    })

    it('skips undefined entries', () => {
      expect(
        resolveActiveProject([undefined, globex], { host: 'x' }, 'single'),
      ).toBe(globex)
    })
  })
})

describe('getProjectScopeStrategy', () => {
  const original = process.env.PUBLIC_PROJECT_SCOPE
  afterEach(() => {
    process.env.PUBLIC_PROJECT_SCOPE = original
  })

  it('defaults to subdomain', () => {
    delete process.env.PUBLIC_PROJECT_SCOPE
    expect(getProjectScopeStrategy()).toBe('subdomain')
  })

  it('reads single', () => {
    process.env.PUBLIC_PROJECT_SCOPE = 'single'
    expect(getProjectScopeStrategy()).toBe('single')
  })

  it('falls back to subdomain for an unknown value', () => {
    process.env.PUBLIC_PROJECT_SCOPE = 'weird'
    expect(getProjectScopeStrategy()).toBe('subdomain')
  })
})
