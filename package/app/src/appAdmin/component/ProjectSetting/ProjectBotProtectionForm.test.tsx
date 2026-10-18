import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

import { ProjectBotProtectionForm } from './ProjectBotProtectionForm'

describe('ProjectBotProtectionForm', () => {
  const onSubmit = jest.fn().mockResolvedValue(undefined)

  beforeEach(() => jest.clearAllMocks())

  test('is off by default and asks for no keys', () => {
    render(<ProjectBotProtectionForm onSubmit={onSubmit} />)

    expect(screen.getByLabelText('Provider')).toHaveValue('none')
    expect(screen.queryByLabelText('Secret key')).not.toBeInTheDocument()
  })

  test('shows key fields for a third-party provider and says a secret is saved', () => {
    render(
      <ProjectBotProtectionForm
        stored={{
          provider: 'cloudflare',
          cloudflare: { siteKey: 'site', hasSecret: true },
        }}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByLabelText('Site key')).toHaveValue('site')
    expect(screen.getByLabelText('Secret key')).toHaveAttribute(
      'placeholder',
      'Saved',
    )
  })

  test('submits the chosen provider and keys', async () => {
    render(<ProjectBotProtectionForm onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText('Provider'), {
      target: { value: 'google' },
    })
    fireEvent.change(screen.getByLabelText('Site key'), {
      target: { value: 'site' },
    })
    fireEvent.change(screen.getByLabelText('Secret key'), {
      target: { value: 'secret' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        provider: 'google',
        cloudflare: { siteKey: '', secretKey: '' },
        google: { siteKey: 'site', secretKey: 'secret' },
      }),
    )
  })
})
