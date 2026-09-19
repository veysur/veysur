import { render, screen, fireEvent } from '@testing-library/react'

import { DefaultableSelectInput } from './DefaultableSelectInput'

describe('DefaultableSelectInput', () => {
  const mockOnChange = jest.fn()
  const defaultProps = {
    label: 'Test Select',
    value: 'option1',
    onChange: mockOnChange,
    options: [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3' },
    ],
  }

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  describe('when hasDefaults is false', () => {
    it('renders a simple select without default option', () => {
      render(<DefaultableSelectInput {...defaultProps} hasDefaults={false} />)

      expect(screen.getByText('Test Select')).toBeInTheDocument()
      // ShadCN Select shows the selected value in the trigger button
      expect(screen.getByText('Option 1')).toBeInTheDocument()

      // Open the select to check for default option
      const trigger = screen.getByRole('combobox')
      fireEvent.click(trigger)
      expect(screen.queryByText(/default/i)).not.toBeInTheDocument()
    })

    it('calls onChange with selected value', () => {
      render(<DefaultableSelectInput {...defaultProps} hasDefaults={false} />)

      // Open the select
      const trigger = screen.getByRole('combobox')
      fireEvent.click(trigger)

      // Click Option 2
      const option2 = screen.getByText('Option 2')
      fireEvent.click(option2)

      expect(mockOnChange).toHaveBeenCalledWith('option2')
    })

    it('displays help text when provided', () => {
      render(
        <DefaultableSelectInput
          {...defaultProps}
          hasDefaults={false}
          helpText="This is help text"
        />,
      )

      expect(screen.getByText('This is help text')).toBeInTheDocument()
    })
  })

  describe('when hasDefaults is true', () => {
    it('renders select with default option', () => {
      render(
        <DefaultableSelectInput
          {...defaultProps}
          hasDefaults={true}
          defaultValue="defaultOption"
        />,
      )

      expect(screen.getByText('Test Select')).toBeInTheDocument()

      // Open select to see the default option
      const trigger = screen.getByRole('combobox')
      fireEvent.click(trigger)
      expect(screen.getByText('defaultOption (default)')).toBeInTheDocument()
    })

    it('shows "Default" when no defaultValue is provided', () => {
      render(<DefaultableSelectInput {...defaultProps} hasDefaults={true} />)

      // Open select to see options
      const trigger = screen.getByRole('combobox')
      fireEvent.click(trigger)

      expect(screen.getByText('Default')).toBeInTheDocument()
    })

    it('handles boolean defaultValue correctly', () => {
      const booleanProps = {
        ...defaultProps,
        options: [
          { value: 'Yes', label: 'Yes' },
          { value: 'No', label: 'No' },
        ],
        defaultValue: true,
      }

      render(<DefaultableSelectInput {...booleanProps} hasDefaults={true} />)

      // Open select to see the default option
      const trigger = screen.getByRole('combobox')
      fireEvent.click(trigger)

      expect(screen.getByText('Yes (default)')).toBeInTheDocument()
    })

    it('calls onChange with correct value when option is selected from default', () => {
      render(
        <DefaultableSelectInput
          {...defaultProps}
          hasDefaults={true}
          value={null}
          defaultValue="defaultOption"
        />,
      )

      // Open the select
      const trigger = screen.getByRole('combobox')
      fireEvent.click(trigger)

      // Click Option 1
      const option1 = screen.getByText('Option 1')
      fireEvent.click(option1)

      expect(mockOnChange).toHaveBeenCalledWith('option1')
    })

    it('calls onChange with null when selecting default placeholder', () => {
      render(
        <DefaultableSelectInput
          {...defaultProps}
          hasDefaults={true}
          defaultValue="defaultOption"
        />,
      )

      // Open the select
      const trigger = screen.getByRole('combobox')
      fireEvent.click(trigger)

      // Click the default option
      const defaultOption = screen.getByText('defaultOption (default)')
      fireEvent.click(defaultOption)

      expect(mockOnChange).toHaveBeenCalledWith(null)
    })
  })

  describe('value handling', () => {
    it('handles null value correctly', () => {
      render(
        <DefaultableSelectInput
          {...defaultProps}
          value={null}
          hasDefaults={true}
          defaultValue="defaultOption"
        />,
      )

      // The trigger button should show the default value
      expect(screen.getByText('defaultOption (default)')).toBeInTheDocument()
    })

    it('handles undefined value correctly', () => {
      render(
        <DefaultableSelectInput
          {...defaultProps}
          value={undefined}
          hasDefaults={true}
          defaultValue="defaultOption"
        />,
      )

      // The trigger button should show the default value
      expect(screen.getByText('defaultOption (default)')).toBeInTheDocument()
    })

    it('handles boolean value correctly', () => {
      const booleanProps = {
        ...defaultProps,
        value: true,
        options: [
          { value: 'Yes', label: 'Yes' },
          { value: 'No', label: 'No' },
        ],
      }

      render(<DefaultableSelectInput {...booleanProps} hasDefaults={false} />)

      // The trigger button should show "Yes" for boolean true
      expect(screen.getByText('Yes')).toBeInTheDocument()
    })
  })

  describe('disabled state', () => {
    it('renders disabled select when disabled prop is true', () => {
      render(<DefaultableSelectInput {...defaultProps} disabled={true} />)

      // Check that the combobox trigger is disabled
      const trigger = screen.getByRole('combobox')
      expect(trigger).toBeDisabled()
    })
  })

  describe('className', () => {
    it('applies custom className', () => {
      const { container } = render(
        <DefaultableSelectInput {...defaultProps} className="custom-class" />,
      )

      expect(container.querySelector('.custom-class')).toBeInTheDocument()
    })
  })
})
