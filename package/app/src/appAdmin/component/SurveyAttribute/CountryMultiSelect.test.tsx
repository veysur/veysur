import { render, screen, fireEvent } from '@testing-library/react'

import { CountryMultiSelect } from './CountryMultiSelect'
import { AttributeConfig } from '../SurveyAttributesPanel/attributesConfig'

const config = { name: 'Countries' } as unknown as AttributeConfig

function renderSelect(value: string, onChange = jest.fn()) {
  render(
    <CountryMultiSelect
      entity={{} as never}
      config={config}
      onChange={onChange}
      isValid={true}
      value={value}
    />,
  )
  return onChange
}

describe('CountryMultiSelect', () => {
  it('shows the any-country hint when nothing is selected', () => {
    renderSelect('')
    expect(screen.getByRole('combobox')).toHaveTextContent('Any country')
  })

  it('shows selected countries by name with a count', () => {
    renderSelect('GB,US')
    expect(screen.getByRole('combobox')).toHaveTextContent('2 selected')
    expect(screen.getByText('United Kingdom')).toBeInTheDocument()
    expect(screen.getByText('United States')).toBeInTheDocument()
  })

  it('adds a searched country as a comma-separated code list', () => {
    const onChange = renderSelect('GB')
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.change(screen.getByLabelText('Search countries'), {
      target: { value: 'france' },
    })
    fireEvent.click(screen.getByRole('checkbox', { name: 'France' }))
    expect(onChange).toHaveBeenCalledWith('GB,FR')
  })

  it('removes a country from its badge', () => {
    const onChange = renderSelect('GB,US')
    fireEvent.click(screen.getByLabelText('Remove United Kingdom'))
    expect(onChange).toHaveBeenCalledWith('US')
  })

  it('reports an empty string when the last country is removed', () => {
    const onChange = renderSelect('GB')
    fireEvent.click(screen.getByLabelText('Remove United Kingdom'))
    expect(onChange).toHaveBeenCalledWith('')
  })
})
