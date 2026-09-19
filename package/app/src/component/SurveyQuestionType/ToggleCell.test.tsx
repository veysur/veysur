import { render, screen } from '@testing-library/react'

import { ToggleCell } from './ToggleCell'

describe('ToggleCell', () => {
  it('renders children inside a flex justify-center wrapper', () => {
    render(
      <ToggleCell>
        <span data-testid="child">toggle</span>
      </ToggleCell>,
    )

    const child = screen.getByTestId('child')
    const wrapper = child.parentElement
    expect(wrapper).toHaveClass('flex')
    expect(wrapper).toHaveClass('justify-center')
  })

  it('adds the width and shrink-0 classes to the wrapper when width is provided', () => {
    render(
      <ToggleCell width="w-10">
        <span data-testid="child">toggle</span>
      </ToggleCell>,
    )

    const wrapper = screen.getByTestId('child').parentElement
    expect(wrapper).toHaveClass('w-10')
    expect(wrapper).toHaveClass('shrink-0')
  })

  it('does not add a width/shrink-0 class when width is omitted', () => {
    render(
      <ToggleCell>
        <span data-testid="child">toggle</span>
      </ToggleCell>,
    )

    const wrapper = screen.getByTestId('child').parentElement
    expect(wrapper?.className).not.toMatch(/shrink-0/)
  })
})
