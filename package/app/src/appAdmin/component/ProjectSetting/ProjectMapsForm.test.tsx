import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

import { ProjectMapsForm } from './ProjectMapsForm'

describe('ProjectMapsForm', () => {
  it('disables Save until the key changes', () => {
    render(<ProjectMapsForm googleApiKey="abc" onSubmit={jest.fn()} />)

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('masks the key', () => {
    render(<ProjectMapsForm googleApiKey="abc" onSubmit={jest.fn()} />)

    expect(screen.getByLabelText('Google Maps API key')).toHaveAttribute(
      'type',
      'password',
    )
  })

  it('submits the new key', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined)
    render(<ProjectMapsForm googleApiKey="" onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText('Google Maps API key'), {
      target: { value: 'AIza-new' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('AIza-new'))
  })

  it('can clear an existing key', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined)
    render(<ProjectMapsForm googleApiKey="abc" onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText('Google Maps API key'), {
      target: { value: '' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(''))
  })

  it('shows Saving... while loading', () => {
    render(
      <ProjectMapsForm googleApiKey="abc" onSubmit={jest.fn()} isLoading />,
    )

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()
  })

  it('shows the error message', () => {
    render(
      <ProjectMapsForm
        googleApiKey=""
        onSubmit={jest.fn()}
        error="Save failed"
      />,
    )

    expect(screen.getByText('Save failed')).toBeInTheDocument()
  })
})
