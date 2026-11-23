import { render, screen, fireEvent } from '@testing-library/react'

import { MoveNav } from './MoveNav'

describe('MoveNav', () => {
  it('renders nothing without a move handler', () => {
    const { container } = render(<MoveNav />)

    expect(container).toBeEmptyDOMElement()
  })

  it('calls the handlers and disables a missing direction', () => {
    const onMoveDown = jest.fn()
    render(<MoveNav onMoveDown={onMoveDown} itemType="question" />)

    expect(screen.getByLabelText('Cannot move question up')).toBeDisabled()
    fireEvent.click(screen.getByLabelText('Move question down'))
    expect(onMoveDown).toHaveBeenCalledTimes(1)
  })

  it('stacked layout becomes a compact row below the md breakpoint', () => {
    render(<MoveNav onMoveUp={jest.fn()} />)

    const toolbar = screen.getByRole('toolbar')
    expect(toolbar).toHaveClass('w-9', 'max-md:flex', 'max-md:w-auto')
  })

  it('inline layout is a row at every width', () => {
    render(<MoveNav layout="inline" onMoveUp={jest.fn()} />)

    const toolbar = screen.getByRole('toolbar')
    expect(toolbar).toHaveClass('flex', 'flex-row')
    expect(toolbar).not.toHaveClass('w-9')
  })
})
