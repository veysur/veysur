import { render, screen, fireEvent } from '@testing-library/react'

import { DefaultableWrapper } from './DefaultableWrapper'

describe('DefaultableWrapper', () => {
  describe('uncontrolled mode', () => {
    const onChange = jest.fn()

    beforeEach(() => {
      onChange.mockClear()
    })

    it('renders the label and checkbox and shows the current value', () => {
      render(
        <DefaultableWrapper
          label="Subject"
          currentValue="custom subject"
          defaultValue="default subject"
          onChange={onChange}
        >
          {({ value }) => <input value={value} readOnly />}
        </DefaultableWrapper>,
      )

      expect(screen.getByText('Subject')).toBeInTheDocument()
      expect(screen.getByRole('checkbox')).not.toBeChecked()
      expect(screen.getByDisplayValue('custom subject')).toBeInTheDocument()
    })

    it('shows the default value and checks the box when currentValue is null', () => {
      render(
        <DefaultableWrapper
          label="Subject"
          currentValue={null}
          defaultValue="default subject"
          onChange={onChange}
        >
          {({ value }) => <input value={value} readOnly />}
        </DefaultableWrapper>,
      )

      expect(screen.getByRole('checkbox')).toBeChecked()
      expect(screen.getByDisplayValue('default subject')).toBeInTheDocument()
    })

    it('calls onChange with null when switching to use default', () => {
      render(
        <DefaultableWrapper
          label="Subject"
          currentValue="custom subject"
          defaultValue="default subject"
          onChange={onChange}
        >
          {({ value }) => <input value={value} readOnly />}
        </DefaultableWrapper>,
      )

      fireEvent.click(screen.getByRole('checkbox'))

      expect(onChange).toHaveBeenCalledWith(null)
    })

    it('calls onChange with the current value when switching off default', () => {
      render(
        <DefaultableWrapper
          label="Subject"
          currentValue={null}
          defaultValue="default subject"
          onChange={onChange}
        >
          {({ value }) => <input value={value} readOnly />}
        </DefaultableWrapper>,
      )

      fireEvent.click(screen.getByRole('checkbox'))

      expect(onChange).toHaveBeenCalledWith('default subject')
    })

    it('does not render the checkbox row without a label', () => {
      render(
        <DefaultableWrapper
          currentValue="custom subject"
          defaultValue="default subject"
          onChange={onChange}
        >
          {({ value }) => <input value={value} readOnly />}
        </DefaultableWrapper>,
      )

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    })
  })

  describe('controlled mode', () => {
    it('renders children as-is and delegates the checkbox to external state', () => {
      const onUseDefaultChange = jest.fn()
      render(
        <DefaultableWrapper
          label="Group"
          isUsingDefault={true}
          onUseDefaultChange={onUseDefaultChange}
        >
          <div>controlled content</div>
        </DefaultableWrapper>,
      )

      expect(screen.getByText('controlled content')).toBeInTheDocument()
      expect(screen.getByRole('checkbox')).toBeChecked()

      fireEvent.click(screen.getByRole('checkbox'))
      expect(onUseDefaultChange).toHaveBeenCalledWith(false)
    })
  })
})
