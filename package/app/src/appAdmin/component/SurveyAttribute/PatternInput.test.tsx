import { render, screen, fireEvent } from '@testing-library/react'

import { PatternInput } from './PatternInput'
import { AttributeConfig } from '../SurveyAttributesPanel/attributesConfig'

const config = { name: 'Custom Pattern' } as unknown as AttributeConfig

describe('PatternInput', () => {
  it('shows an example as placeholder and hint', () => {
    render(
      <PatternInput
        entity={{} as never}
        config={config}
        onChange={jest.fn()}
        isValid={true}
        value=""
      />,
    )
    expect(screen.getByPlaceholderText('[A-Z]{2}\\d{4}')).toBeInTheDocument()
    expect(screen.getByText(/accepts AB1234/)).toBeInTheDocument()
  })

  it('reports typed changes', () => {
    const onChange = jest.fn()
    render(
      <PatternInput
        entity={{} as never}
        config={config}
        onChange={onChange}
        isValid={true}
        value=""
      />,
    )
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '^a$' } })
    expect(onChange).toHaveBeenCalledWith('^a$')
  })
})
