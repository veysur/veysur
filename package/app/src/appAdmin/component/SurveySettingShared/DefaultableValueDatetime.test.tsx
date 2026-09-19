import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import { DefaultableValueDatetime } from './DefaultableValueDatetime'

describe('DefaultableValueDatetime', () => {
  const mockOnChange = jest.fn()
  // Use local dates to avoid timezone conversion issues
  const testDate = new Date(2023, 11, 25, 18, 30, 0) // Dec 25, 2023, 18:30 local time
  const defaultDate = new Date(2023, 0, 1, 12, 0, 0) // Jan 1, 2023, 12:00 local time

  const defaultProps = {
    label: 'Test Datetime',
    currentValue: testDate,
    defaultValue: defaultDate,
    onChange: mockOnChange,
  }

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  describe('when hasDefaults is false', () => {
    it('renders a simple datetime picker without defaults functionality', () => {
      render(<DefaultableValueDatetime {...defaultProps} hasDefaults={false} />)

      expect(screen.getByText('Test Datetime')).toBeInTheDocument()
      // No checkbox when hasDefaults is false
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()

      // DateTimePicker renders a button with formatted date
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('December 25th, 2023 18:30')
    })

    it('formats date value correctly for display', () => {
      render(<DefaultableValueDatetime {...defaultProps} hasDefaults={false} />)

      const button = screen.getByRole('button')
      expect(button).toHaveTextContent('December 25th, 2023 18:30')
    })

    it('handles null current value', () => {
      render(
        <DefaultableValueDatetime
          {...defaultProps}
          currentValue={null}
          hasDefaults={false}
        />,
      )

      const button = screen.getByRole('button')
      expect(button).toHaveTextContent('Select test datetime')
    })

    it('handles string date value', () => {
      const localDate = new Date(2023, 5, 15, 14, 20, 0) // June 15, 2023, 14:20 local time
      render(
        <DefaultableValueDatetime
          {...defaultProps}
          currentValue={localDate.toISOString()}
          hasDefaults={false}
        />,
      )

      const button = screen.getByRole('button')
      expect(button).toHaveTextContent('June 15th, 2023 14:20')
    })

    it('calls onChange when date is changed', async () => {
      render(<DefaultableValueDatetime {...defaultProps} hasDefaults={false} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      // Wait for the popover to open and find the time input (type="time")
      const timeInput = await screen.findByDisplayValue(/18:30/)
      fireEvent.change(timeInput, { target: { value: '09:30' } })

      // onChange should be called with an ISO string
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled()
        const callArg = mockOnChange.mock.calls[0][0]
        expect(typeof callArg).toBe('string')
        expect(callArg).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)
      })
    })

    it('displays help text when provided', () => {
      render(
        <DefaultableValueDatetime
          {...defaultProps}
          hasDefaults={false}
          helpText="This is help text"
        />,
      )

      expect(screen.getByText('This is help text')).toBeInTheDocument()
    })

    it('shows correct placeholder', () => {
      render(
        <DefaultableValueDatetime
          {...defaultProps}
          hasDefaults={false}
          currentValue={null}
        />,
      )

      const button = screen.getByRole('button')
      expect(button).toHaveTextContent('Select test datetime')
    })
  })

  describe('when hasDefaults is true', () => {
    it('renders datetime picker with use default checkbox', () => {
      render(<DefaultableValueDatetime {...defaultProps} hasDefaults={true} />)

      expect(screen.getByText('Test Datetime')).toBeInTheDocument()
      expect(screen.getByRole('checkbox')).toBeInTheDocument()
    })

    it('shows current value when not using default', () => {
      render(
        <DefaultableValueDatetime
          {...defaultProps}
          hasDefaults={true}
          currentValue={testDate}
        />,
      )

      const button = screen.getByRole('button', { name: /december 25th/i })
      expect(button).toHaveTextContent('December 25th, 2023 18:30')
      expect(screen.getByRole('checkbox')).not.toBeChecked()
      expect(button).not.toBeDisabled()
    })

    it('uses default value when currentValue is null', () => {
      render(
        <DefaultableValueDatetime
          {...defaultProps}
          hasDefaults={true}
          currentValue={null}
        />,
      )

      // When currentValue is null, it means "use default"
      const button = screen.getByRole('button', {
        name: /january 1st, 2023/i,
      })
      expect(button).toBeInTheDocument()
      expect(screen.getByRole('checkbox')).toBeChecked()
      expect(button).toBeDisabled()
    })

    it('handles null/undefined defaultValue', () => {
      render(
        <DefaultableValueDatetime
          {...defaultProps}
          hasDefaults={true}
          defaultValue={null}
          currentValue={null}
        />,
      )

      // When both default and current are null, shows disabled picker with empty placeholder
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('calls onChange with null when switching to use default', () => {
      render(
        <DefaultableValueDatetime
          {...defaultProps}
          hasDefaults={true}
          currentValue={testDate}
        />,
      )

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      expect(mockOnChange).toHaveBeenCalledWith(null)
    })

    it('calls onChange with default value when unchecking use default', () => {
      render(
        <DefaultableValueDatetime
          {...defaultProps}
          hasDefaults={true}
          currentValue={null}
        />,
      )

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      // When unchecking "use default", it should set the value to the defaultValue ISO string
      expect(mockOnChange).toHaveBeenCalled()
      const callArg = mockOnChange.mock.calls[0][0]
      expect(callArg).not.toBeNull()
    })

    it('calls onChange when interacting with picker (not using default)', async () => {
      render(
        <DefaultableValueDatetime
          {...defaultProps}
          hasDefaults={true}
          currentValue={testDate}
        />,
      )

      const button = screen.getByRole('button', { name: /december 25th/i })
      fireEvent.click(button)

      // Wait for the popover to open and find the time input (type="time")
      const timeInput = await screen.findByDisplayValue(/18:30/)
      fireEvent.change(timeInput, { target: { value: '15:45' } })

      // onChange should be called with an ISO string
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled()
        const callArg = mockOnChange.mock.calls[0][0]
        expect(typeof callArg).toBe('string')
        expect(callArg).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)
      })
    })

    it('shows default date when using default', () => {
      render(
        <DefaultableValueDatetime
          {...defaultProps}
          hasDefaults={true}
          currentValue={null}
        />,
      )

      // When currentValue is null (using default), shows the default date
      const button = screen.getByRole('button', { name: /january 1st/i })
      expect(button).toBeInTheDocument()
    })

    it('shows current date when not using default', () => {
      render(
        <DefaultableValueDatetime
          {...defaultProps}
          hasDefaults={true}
          currentValue={testDate}
        />,
      )

      const button = screen.getByRole('button', { name: /december 25th/i })
      expect(button).toBeInTheDocument()
    })

    it('displays default value info when using default', () => {
      render(
        <DefaultableValueDatetime
          {...defaultProps}
          hasDefaults={true}
          currentValue={null}
        />,
      )

      // When currentValue is null (using default), should show the info text
      expect(screen.getByText(/Default:/)).toBeInTheDocument()
    })

    it('handles null default value', () => {
      render(
        <DefaultableValueDatetime
          {...defaultProps}
          hasDefaults={true}
          currentValue={null}
          defaultValue={null}
        />,
      )

      // When default value is null, the button should be disabled and checkbox checked
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeChecked()
    })
  })

  describe('date formatting', () => {
    it('formats Date objects correctly', () => {
      const date = new Date(2023, 4, 15, 8, 30, 45) // May 15, 2023, 08:30:45 local time
      render(
        <DefaultableValueDatetime
          {...defaultProps}
          currentValue={date}
          hasDefaults={false}
        />,
      )

      const button = screen.getByRole('button')
      expect(button).toHaveTextContent('May 15th, 2023 08:30')
    })

    it('formats string dates correctly', () => {
      const date = new Date(2023, 2, 10, 12, 15, 30) // March 10, 2023, 12:15:30 local time
      render(
        <DefaultableValueDatetime
          {...defaultProps}
          currentValue={date.toISOString()}
          hasDefaults={false}
        />,
      )

      const button = screen.getByRole('button')
      expect(button).toHaveTextContent('March 10th, 2023 12:15')
    })

    it('handles invalid date strings gracefully', () => {
      render(
        <DefaultableValueDatetime
          {...defaultProps}
          currentValue="invalid-date"
          hasDefaults={false}
        />,
      )

      const button = screen.getByRole('button')
      // Invalid dates should result in placeholder
      expect(button).toHaveTextContent('Select test datetime')
    })
  })

  describe('className', () => {
    it('applies custom className', () => {
      const { container } = render(
        <DefaultableValueDatetime {...defaultProps} className="custom-class" />,
      )

      expect(container.querySelector('.custom-class')).toBeInTheDocument()
    })
  })
})
