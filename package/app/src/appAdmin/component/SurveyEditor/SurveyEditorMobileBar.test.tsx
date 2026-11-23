import { render, screen, fireEvent } from '@testing-library/react'

import { SurveyEditorMobileBar } from './SurveyEditorMobileBar'

describe('SurveyEditorMobileBar', () => {
  it('fires each toggle callback', () => {
    const onToggleStructure = jest.fn()
    const onToggleAttributes = jest.fn()
    render(
      <SurveyEditorMobileBar
        onToggleStructure={onToggleStructure}
        onToggleAttributes={onToggleAttributes}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Structure' }))
    fireEvent.click(screen.getByRole('button', { name: 'Attributes' }))

    expect(onToggleStructure).toHaveBeenCalledTimes(1)
    expect(onToggleAttributes).toHaveBeenCalledTimes(1)
  })

  it('omits the Structure button without a handler', () => {
    render(<SurveyEditorMobileBar onToggleAttributes={jest.fn()} />)

    expect(screen.queryByRole('button', { name: 'Structure' })).toBeNull()
  })

  it('is hidden from the lg breakpoint up', () => {
    render(<SurveyEditorMobileBar onToggleAttributes={jest.fn()} />)

    expect(screen.getByRole('navigation')).toHaveClass('lg:hidden')
  })
})
