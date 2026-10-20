import { render } from '@testing-library/react'

import { GoogleAnalytics } from './GoogleAnalytics'

let mockConsent = { analytics: false, marketing: false }
let mockExtraConfigs: { id: string; config?: Record<string, unknown> }[] = []

jest.mock('component/CookieConsent', () => ({
  useCookieConsent: () => mockConsent,
}))

jest.mock('registry', () => ({
  getExtraGtagConfigs: () => mockExtraConfigs,
}))

const loadTag = () => {
  const script = document.head.querySelector('script[src*="gtag/js"]')
  ;(script as HTMLScriptElement).onload?.(new Event('load'))
}

describe('GoogleAnalytics', () => {
  let gtag: jest.Mock

  beforeEach(() => {
    gtag = jest.fn()
    window.gtag = gtag
    mockConsent = { analytics: false, marketing: false }
    mockExtraConfigs = []
    document.head.innerHTML = ''
  })

  it('configures each extra destination after the analytics tag', () => {
    mockExtraConfigs = [{ id: 'AW-1' }, { id: 'AW-2', config: { a: 1 } }]

    render(<GoogleAnalytics tagId="G-1" />)
    loadTag()

    const configs = gtag.mock.calls.filter(([command]) => command === 'config')
    expect(configs).toEqual([
      ['config', 'G-1'],
      ['config', 'AW-1'],
      ['config', 'AW-2', { a: 1 }],
    ])
  })

  it('keeps the ad signals denied until marketing is accepted', () => {
    mockConsent = { analytics: true, marketing: false }

    render(<GoogleAnalytics tagId="G-1" />)

    expect(gtag).toHaveBeenCalledWith('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    })
  })

  it('grants the ad signals when marketing is accepted', () => {
    mockConsent = { analytics: true, marketing: true }

    render(<GoogleAnalytics tagId="G-1" />)

    expect(gtag).toHaveBeenCalledWith('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    })
  })

  it('does nothing without a tag id', () => {
    render(<GoogleAnalytics tagId="" />)

    expect(document.head.querySelector('script')).toBeNull()
  })
})
