import { render, fireEvent } from '@testing-library/react'

import { NumberMinMax } from './NumberMinMax'
import { LengthMinMax } from './LengthMinMax'
import { AttributeConfig } from '../SurveyAttributesPanel/attributesConfig'

function buildConfig(
  overrides: Partial<{ name: string; initialValue: unknown }> = {},
): AttributeConfig {
  return {
    name: overrides.name ?? 'attribute',
    initialValue: overrides.initialValue,
  } as unknown as AttributeConfig
}

describe('NumberMinMax (allows negative numbers, inline errors)', () => {
  it('renders text inputs configured for numeric entry with a leading minus', () => {
    const { getAllByRole } = render(
      <NumberMinMax
        entity={{} as never}
        config={buildConfig()}
        onChange={jest.fn()}
        isValid={true}
        value={{ min: '-5', max: '10' }}
      />,
    )
    const [minInput, maxInput] = getAllByRole('textbox') as HTMLInputElement[]
    expect(minInput).toHaveAttribute('type', 'text')
    expect(minInput).toHaveAttribute('inputMode', 'numeric')
    expect(minInput).toHaveAttribute('pattern', '-?[0-9]*')
    expect(minInput.value).toBe('-5')
    expect(maxInput.value).toBe('10')
  })

  it('falls back to the initial value when no value is set', () => {
    const { getAllByRole } = render(
      <NumberMinMax
        entity={{} as never}
        config={buildConfig()}
        onChange={jest.fn()}
        isValid={true}
        value={undefined}
      />,
    )
    const [minInput, maxInput] = getAllByRole('textbox') as HTMLInputElement[]
    // Min and Max of '0' both mean "no limit" — shown blank with a
    // placeholder, not "0".
    expect(minInput.value).toBe('')
    expect(minInput).toHaveAttribute('placeholder', 'no min')
    expect(maxInput.value).toBe('')
    expect(maxInput).toHaveAttribute('placeholder', 'no max')
  })

  it('calls onChange with the raw typed string, unparsed', () => {
    const onChange = jest.fn()
    const { getAllByRole } = render(
      <NumberMinMax
        entity={{} as never}
        config={buildConfig()}
        onChange={onChange}
        isValid={true}
        value={{ min: '0', max: '0' }}
      />,
    )
    const [minInput] = getAllByRole('textbox')
    fireEvent.change(minInput, { target: { value: '-' } })
    expect(onChange).toHaveBeenCalledWith({ min: '-', max: '0' })
  })

  it('renders each field error directly under that field', () => {
    const { getByText, queryAllByRole } = render(
      <NumberMinMax
        entity={{} as never}
        config={buildConfig({ name: 'Number range' })}
        onChange={jest.fn()}
        isValid={false}
        errors={{ 'Number range.min': ['Min must be less than max'] }}
        value={{ min: '5', max: '0' }}
      />,
    )
    const error = getByText('Min must be less than max')
    const [minInput] = queryAllByRole('textbox')
    // Input wraps the <input> in its own div (see shadcn Input), so the
    // error paragraph is a sibling of that wrapper, both inside the field's
    // outer <div> — hence the extra parentElement to reach it.
    expect(minInput.parentElement?.parentElement).toContainElement(error)
  })
})

describe('LengthMinMax (non-negative only, stacked errors)', () => {
  it('renders number inputs with a non-negative minimum', () => {
    const { getAllByRole } = render(
      <LengthMinMax
        entity={{} as never}
        config={buildConfig()}
        onChange={jest.fn()}
        isValid={true}
        value={{ min: 1, max: 5 }}
      />,
    )
    const [minInput, maxInput] = getAllByRole(
      'spinbutton',
    ) as HTMLInputElement[]
    expect(minInput).toHaveAttribute('type', 'number')
    expect(minInput).toHaveAttribute('min', '0')
    expect(minInput.value).toBe('1')
    expect(maxInput.value).toBe('5')
  })

  it('calls onChange with a parsed integer', () => {
    const onChange = jest.fn()
    const { getAllByRole } = render(
      <LengthMinMax
        entity={{} as never}
        config={buildConfig()}
        onChange={onChange}
        isValid={true}
        value={{ min: 0, max: 0 }}
      />,
    )
    const [, maxInput] = getAllByRole('spinbutton')
    fireEvent.change(maxInput, { target: { value: '5' } })
    expect(onChange).toHaveBeenCalledWith({ min: 0, max: 5 })
  })

  it('renders both errors together below the grid, not inline per field', () => {
    const { getByText, container } = render(
      <LengthMinMax
        entity={{} as never}
        config={buildConfig({ name: 'Length range' })}
        onChange={jest.fn()}
        isValid={false}
        errors={{
          'Length range.min': ['Min must be positive'],
          'Length range.max': ['Max must be positive'],
        }}
        value={{ min: -1, max: -1 }}
      />,
    )
    const minError = getByText('Min must be positive')
    const maxError = getByText('Max must be positive')
    const grid = container.querySelector('.grid-cols-2')
    expect(grid).not.toBeNull()
    expect(grid).not.toContainElement(minError)
    expect(grid).not.toContainElement(maxError)
  })
})

describe('useValidatedInternalValue protection through the component', () => {
  it('keeps showing in-progress text while invalid, even as value re-renders', () => {
    const { getAllByRole, rerender } = render(
      <NumberMinMax
        entity={{} as never}
        config={buildConfig()}
        onChange={jest.fn()}
        isValid={true}
        value={{ min: '0', max: '0' }}
      />,
    )
    const [minInput] = getAllByRole('textbox') as HTMLInputElement[]
    fireEvent.change(minInput, { target: { value: '-' } })
    expect(minInput.value).toBe('-')

    // Simulates AttributeCard withholding the round-tripped `value` prop
    // while validation fails for the incomplete "-" entry.
    rerender(
      <NumberMinMax
        entity={{} as never}
        config={buildConfig()}
        onChange={jest.fn()}
        isValid={false}
        value={{ min: '0', max: '0' }}
      />,
    )
    const [minInputAfter] = getAllByRole('textbox') as HTMLInputElement[]
    expect(minInputAfter.value).toBe('-')
  })
})
