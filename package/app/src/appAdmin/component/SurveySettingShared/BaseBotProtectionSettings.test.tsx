import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

import { BaseBotProtectionSettings } from './BaseBotProtectionSettings'

describe('BaseBotProtectionSettings', () => {
  it('is off by default and asks for no keys', () => {
    render(<BaseBotProtectionSettings data={{ source: null }} handlers={{}} />)

    expect(screen.getByLabelText('Provider')).toHaveValue('none')
    expect(screen.queryByLabelText('Secret key')).not.toBeInTheDocument()
  })

  it('shows key fields for a third-party provider and says a secret is saved', () => {
    render(
      <BaseBotProtectionSettings
        data={{
          source: null,
          botProtection: {
            provider: 'cloudflare',
            cloudflare: { siteKey: 'site', hasSecret: true },
          },
        }}
        handlers={{}}
      />,
    )

    expect(screen.getByLabelText('Site key')).toHaveValue('site')
    expect(screen.getByLabelText('Secret key')).toHaveAttribute(
      'placeholder',
      'Saved',
    )
  })

  it('reports the provider and key edits', () => {
    const handleStringChange = jest.fn()
    render(
      <BaseBotProtectionSettings
        data={{ source: null, botProtection: { provider: 'google' } }}
        handlers={{ handleStringChange }}
      />,
    )

    fireEvent.change(screen.getByLabelText('Provider'), {
      target: { value: 'simple' },
    })
    fireEvent.change(screen.getByLabelText('Site key'), {
      target: { value: 'site' },
    })
    fireEvent.change(screen.getByLabelText('Secret key'), {
      target: { value: 'secret' },
    })

    expect(handleStringChange).toHaveBeenCalledWith(
      'botProtection',
      'provider',
      'simple',
    )
    expect(handleStringChange).toHaveBeenCalledWith(
      'botProtection',
      'google.siteKey',
      'site',
    )
    expect(handleStringChange).toHaveBeenCalledWith(
      'botProtection',
      'google.secretKey',
      'secret',
    )
  })

  describe('on a survey', () => {
    const projectDefaults: Record<string, unknown> = {
      provider: 'cloudflare',
      cloudflare: { siteKey: 'project-site', hasSecret: true },
    }
    const getDefault = <V,>(_section: string, field: string) =>
      projectDefaults[field] as V

    it('shows the project provider and keys while inheriting', () => {
      render(
        <BaseBotProtectionSettings
          data={{
            source: null,
            botProtection: {
              provider: null,
              cloudflare: { siteKey: null, secretKey: null },
            },
            getDefault,
          }}
          handlers={{}}
        />,
      )

      expect(
        screen.getByText('Cloudflare Turnstile (default)'),
      ).toBeInTheDocument()
      expect(screen.getByDisplayValue('project-site')).toBeDisabled()
      expect(screen.getByPlaceholderText('Saved')).toBeDisabled()
    })

    it('overrides one key and sends null to inherit it again', () => {
      const handleStringChange = jest.fn()
      render(
        <BaseBotProtectionSettings
          data={{
            source: null,
            botProtection: {
              provider: 'cloudflare',
              cloudflare: { siteKey: 'own-site', secretKey: null },
            },
            getDefault,
          }}
          handlers={{ handleStringChange }}
        />,
      )

      fireEvent.change(screen.getByDisplayValue('own-site'), {
        target: { value: 'newer-site' },
      })
      expect(handleStringChange).toHaveBeenCalledWith(
        'botProtection',
        'cloudflare.siteKey',
        'newer-site',
      )

      fireEvent.click(screen.getAllByRole('checkbox')[0])
      expect(handleStringChange).toHaveBeenCalledWith(
        'botProtection',
        'cloudflare.siteKey',
        null,
      )
    })
  })
})
