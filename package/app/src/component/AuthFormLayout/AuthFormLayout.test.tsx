import { fireEvent, render, screen } from '@testing-library/react'

import { AuthFormLayout } from './AuthFormLayout'

describe('AuthFormLayout', () => {
  it('shows the title as a heading, the description and the children', () => {
    render(
      <AuthFormLayout title="Welcome back" description="Login to your account">
        <button>Go</button>
      </AuthFormLayout>,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Welcome back' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Login to your account')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument()
  })

  it('omits the description paragraph when none is given', () => {
    const { container } = render(
      <AuthFormLayout title="Title">content</AuthFormLayout>,
    )

    expect(container.querySelector('p')).toBeNull()
  })

  it('renders a div unless an onSubmit handler is given', () => {
    const { container } = render(
      <AuthFormLayout title="Title">content</AuthFormLayout>,
    )

    expect(container.querySelector('form')).toBeNull()
  })

  it('renders a form that calls onSubmit', () => {
    const onSubmit = jest.fn((e) => e.preventDefault())
    const { container } = render(
      <AuthFormLayout title="Title" onSubmit={onSubmit}>
        content
      </AuthFormLayout>,
    )

    fireEvent.submit(container.querySelector('form')!)

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('lets the caller override the wrapper display', () => {
    const { container } = render(
      <AuthFormLayout title="Title" className="hidden">
        content
      </AuthFormLayout>,
    )

    expect(container.firstElementChild).toHaveClass('hidden')
    expect(container.firstElementChild).not.toHaveClass('flex')
  })
})
