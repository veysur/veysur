import { render, screen, fireEvent } from '@testing-library/react'

import { DefaultableValueInput } from './DefaultableValueInput'

describe('DefaultableValueInput', () => {
  const mockHandler = jest.fn()
  const defaultProps = {
    label: 'Test Input',
    currentValue: 'current value',
    defaultValue: 'default value',
    section: 'testSection',
    field: 'testField',
    handler: mockHandler,
  }

  beforeEach(() => {
    mockHandler.mockClear()
  })

  describe('when hasDefaults is false', () => {
    it('renders a simple input without defaults functionality', () => {
      render(<DefaultableValueInput {...defaultProps} hasDefaults={false} />)

      expect(screen.getByText('Test Input')).toBeInTheDocument()
      expect(screen.getByDisplayValue('current value')).toBeInTheDocument()
      // No checkbox when hasDefaults is false
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    })

    it('calls handler with section, field, and value', () => {
      render(<DefaultableValueInput {...defaultProps} hasDefaults={false} />)

      const input = screen.getByDisplayValue('current value')
      fireEvent.change(input, { target: { value: 'new value' } })

      expect(mockHandler).toHaveBeenCalledWith(
        'testSection',
        'testField',
        'new value',
      )
    })

    it('handles empty current value', () => {
      render(
        <DefaultableValueInput
          {...defaultProps}
          currentValue={null}
          hasDefaults={false}
        />,
      )

      expect(screen.getByDisplayValue('')).toBeInTheDocument()
    })

    it('displays help text when provided', () => {
      render(
        <DefaultableValueInput
          {...defaultProps}
          hasDefaults={false}
          helpText="This is help text"
        />,
      )

      expect(screen.getByText('This is help text')).toBeInTheDocument()
    })

    it('handles different input types', () => {
      render(
        <DefaultableValueInput
          {...defaultProps}
          hasDefaults={false}
          type="number"
          currentValue={42}
        />,
      )

      const input = screen.getByDisplayValue('42')
      expect(input).toHaveAttribute('type', 'number')
    })

    it('applies min, max, and step attributes for number inputs', () => {
      render(
        <DefaultableValueInput
          {...defaultProps}
          hasDefaults={false}
          type="number"
          min={1}
          max={100}
          step={5}
        />,
      )

      const input = screen.getByRole('spinbutton')
      expect(input).toHaveAttribute('min', '1')
      expect(input).toHaveAttribute('max', '100')
      expect(input).toHaveAttribute('step', '5')
    })
  })

  describe('when hasDefaults is true', () => {
    it('renders input with use default checkbox', () => {
      render(<DefaultableValueInput {...defaultProps} hasDefaults={true} />)

      expect(screen.getByText('Test Input')).toBeInTheDocument()
      expect(screen.getByRole('checkbox')).toBeInTheDocument()
    })

    it('shows current value when not using default', () => {
      render(
        <DefaultableValueInput
          {...defaultProps}
          hasDefaults={true}
          currentValue="custom value"
        />,
      )

      expect(screen.getByDisplayValue('custom value')).toBeInTheDocument()
      expect(screen.getByRole('checkbox')).not.toBeChecked()
    })

    it('shows default value when using default (currentValue is null)', () => {
      render(
        <DefaultableValueInput
          {...defaultProps}
          hasDefaults={true}
          currentValue={null}
        />,
      )

      expect(screen.getByDisplayValue('default value')).toBeInTheDocument()
      expect(screen.getByRole('checkbox')).toBeChecked()
      expect(screen.getByDisplayValue('default value')).toBeDisabled()
    })

    it('handles undefined defaultValue', () => {
      render(
        <DefaultableValueInput
          {...defaultProps}
          hasDefaults={true}
          defaultValue={undefined}
          currentValue={null}
        />,
      )

      expect(screen.getByDisplayValue('')).toBeInTheDocument()
    })

    it('calls handler with null when switching to use default', () => {
      render(
        <DefaultableValueInput
          {...defaultProps}
          hasDefaults={true}
          currentValue="custom value"
        />,
      )

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      expect(mockHandler).toHaveBeenCalledWith('testSection', 'testField', null)
    })

    it('calls handler with input value when switching from default', () => {
      render(
        <DefaultableValueInput
          {...defaultProps}
          hasDefaults={true}
          currentValue={null}
        />,
      )

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      expect(mockHandler).toHaveBeenCalledWith(
        'testSection',
        'testField',
        'default value',
      )
    })

    it('calls handler when typing in input (not using default)', () => {
      render(
        <DefaultableValueInput
          {...defaultProps}
          hasDefaults={true}
          currentValue="initial"
        />,
      )

      const input = screen.getByDisplayValue('initial')
      fireEvent.change(input, { target: { value: 'typed value' } })

      expect(mockHandler).toHaveBeenCalledWith(
        'testSection',
        'testField',
        'typed value',
      )
    })

    it('shows correct placeholder when using default', () => {
      render(
        <DefaultableValueInput
          {...defaultProps}
          hasDefaults={true}
          currentValue={null}
        />,
      )

      const input = screen.getByPlaceholderText('Default: default value')
      expect(input).toBeInTheDocument()
    })

    it('shows custom placeholder when not using default', () => {
      render(
        <DefaultableValueInput
          {...defaultProps}
          hasDefaults={true}
          currentValue="value"
          placeholder="Custom placeholder"
        />,
      )

      const input = screen.getByPlaceholderText('Custom placeholder')
      expect(input).toBeInTheDocument()
    })
  })

  describe('number input handling', () => {
    it('handles number values correctly', () => {
      render(
        <DefaultableValueInput
          {...defaultProps}
          hasDefaults={false}
          type="number"
          currentValue={123}
        />,
      )

      const input = screen.getByDisplayValue('123')
      fireEvent.change(input, { target: { value: '456' } })

      expect(mockHandler).toHaveBeenCalledWith(
        'testSection',
        'testField',
        '456',
      )
    })

    it('converts number defaultValue to string', () => {
      render(
        <DefaultableValueInput
          {...defaultProps}
          hasDefaults={true}
          type="number"
          currentValue={null}
          defaultValue={42}
        />,
      )

      expect(screen.getByDisplayValue('42')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Default: 42')).toBeInTheDocument()
    })
  })

  describe('className', () => {
    it('applies custom className', () => {
      const { container } = render(
        <DefaultableValueInput {...defaultProps} className="custom-class" />,
      )

      expect(container.querySelector('.custom-class')).toBeInTheDocument()
    })
  })
})
