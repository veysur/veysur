import { buildAppUrl } from './buildAppUrl'

describe('buildAppUrl', () => {
  const cloudApp = {
    webDomain: 'www.veysur.local',
    accountDomain: 'account.veysur.local',
    accountBasePath: '',
    platformDomain: 'platform.veysur.local',
    platformBasePath: '',
  }

  const selfHostedApp = {
    webDomain: 'veysur.local',
    accountDomain: 'veysur.local',
    accountBasePath: '/account',
    platformDomain: 'veysur.local',
    platformBasePath: '/platform',
  }

  describe('account target', () => {
    test('cloud: builds a subdomain URL with no base path', () => {
      expect(buildAppUrl(cloudApp, 'account', 'password-reset')).toBe(
        'https://account.veysur.local/password-reset',
      )
    })

    test('self-hosted: builds a same-origin, path-prefixed URL', () => {
      expect(buildAppUrl(selfHostedApp, 'account', 'password-reset')).toBe(
        'https://veysur.local/account/password-reset',
      )
    })
  })

  describe('platform target', () => {
    test('cloud: builds a subdomain URL with no base path', () => {
      expect(buildAppUrl(cloudApp, 'platform', 'support-ticket/1')).toBe(
        'https://platform.veysur.local/support-ticket/1',
      )
    })

    test('self-hosted: builds a same-origin, path-prefixed URL', () => {
      expect(buildAppUrl(selfHostedApp, 'platform', 'support-ticket/1')).toBe(
        'https://veysur.local/platform/support-ticket/1',
      )
    })
  })

  describe('survey target', () => {
    test('always uses webDomain with a fixed /survey prefix, in both editions', () => {
      expect(buildAppUrl(cloudApp, 'survey', 'abc123/token?evt=xyz')).toBe(
        'https://www.veysur.local/survey/abc123/token?evt=xyz',
      )
      expect(buildAppUrl(selfHostedApp, 'survey', 'abc123/token?evt=xyz')).toBe(
        'https://veysur.local/survey/abc123/token?evt=xyz',
      )
    })
  })
})
