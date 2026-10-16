import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

import { ProjectTimezoneForm } from './ProjectTimezoneForm'

describe('ProjectTimezoneForm', () => {
  it('disables Save while the selection equals the current timezone', () => {
    render(
      <ProjectTimezoneForm timezone="Europe/London" onSubmit={jest.fn()} />,
    )

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('shows Saving... and stays disabled while loading', () => {
    render(
      <ProjectTimezoneForm
        timezone="Europe/London"
        onSubmit={jest.fn()}
        isLoading
      />,
    )

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()
  })

  it('shows the error message', () => {
    render(
      <ProjectTimezoneForm
        timezone="Europe/London"
        onSubmit={jest.fn()}
        error="Save failed"
      />,
    )

    expect(screen.getByText('Save failed')).toBeInTheDocument()
  })

  it('submits the current selection on form submit', async () => {
    const onSubmit = jest.fn()
    const { container } = render(
      <ProjectTimezoneForm timezone="Europe/London" onSubmit={onSubmit} />,
    )

    fireEvent.submit(container.querySelector('form') as HTMLFormElement)

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('Europe/London'))
  })
})
