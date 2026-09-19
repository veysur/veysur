import { render, screen, fireEvent } from '@testing-library/react'

import { DefaultableValueContentEditor } from './DefaultableValueContentEditor'

// Mock the ContentEditor component
jest.mock('appAdmin/component/ContentEditor', () => ({
  ContentEditor: ({
    value,
    onChange,
    placeholder,
    disabled,
    withToolbar,
    ...props
  }: {
    value?: string
    onChange?: (content: string) => void
    placeholder?: string
    disabled?: boolean
    withToolbar?: boolean
    [key: string]: unknown
  }) => (
    <div data-testid="content-editor" {...props}>
      <textarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        data-with-toolbar={withToolbar}
      />
    </div>
  ),
}))

describe('DefaultableValueContentEditor', () => {
  const mockOnChange = jest.fn()
  const defaultProps = {
    label: 'Test HTML Editor',
    currentValue: 'current content',
    defaultValue: 'default content',
    onChange: mockOnChange,
  }

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  describe('when hasDefaults is false', () => {
    it('renders a simple HTML editor without defaults functionality', () => {
      render(
        <DefaultableValueContentEditor {...defaultProps} hasDefaults={false} />,
      )

      expect(screen.getByText('Test HTML Editor')).toBeInTheDocument()
      expect(screen.getByDisplayValue('current content')).toBeInTheDocument()
      // No checkbox when hasDefaults is false
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    })

    it('calls onChange directly', () => {
      render(
        <DefaultableValueContentEditor {...defaultProps} hasDefaults={false} />,
      )

      const editor = screen.getByDisplayValue('current content')
      fireEvent.change(editor, { target: { value: 'new content' } })

      expect(mockOnChange).toHaveBeenCalledWith('new content')
    })

    it('handles null current value', () => {
      render(
        <DefaultableValueContentEditor
          {...defaultProps}
          currentValue={null}
          hasDefaults={false}
        />,
      )

      expect(screen.getByDisplayValue('')).toBeInTheDocument()
    })

    it('displays help text when provided', () => {
      render(
        <DefaultableValueContentEditor
          {...defaultProps}
          hasDefaults={false}
          helpText="This is help text"
        />,
      )

      expect(screen.getByText('This is help text')).toBeInTheDocument()
    })

    it('passes placeholder to HTML editor', () => {
      render(
        <DefaultableValueContentEditor
          {...defaultProps}
          hasDefaults={false}
          placeholder="Enter content here"
        />,
      )

      expect(
        screen.getByPlaceholderText('Enter content here'),
      ).toBeInTheDocument()
    })

    it('passes withToolbar prop to HTML editor', () => {
      render(
        <DefaultableValueContentEditor
          {...defaultProps}
          hasDefaults={false}
          withToolbar={false}
        />,
      )

      const editor = screen.getByTestId('content-editor')
      const textarea = editor.querySelector('textarea')
      expect(textarea).toHaveAttribute('data-with-toolbar', 'false')
    })

    it('defaults withToolbar to true', () => {
      render(
        <DefaultableValueContentEditor {...defaultProps} hasDefaults={false} />,
      )

      const editor = screen.getByTestId('content-editor')
      const textarea = editor.querySelector('textarea')
      expect(textarea).toHaveAttribute('data-with-toolbar', 'true')
    })
  })

  describe('when hasDefaults is true', () => {
    it('renders HTML editor with use default checkbox', () => {
      render(
        <DefaultableValueContentEditor {...defaultProps} hasDefaults={true} />,
      )

      expect(screen.getByText('Test HTML Editor')).toBeInTheDocument()
      expect(screen.getByRole('checkbox')).toBeInTheDocument()
    })

    it('shows current value when not using default', () => {
      render(
        <DefaultableValueContentEditor
          {...defaultProps}
          hasDefaults={true}
          currentValue="custom content"
        />,
      )

      expect(screen.getByDisplayValue('custom content')).toBeInTheDocument()
      expect(screen.getByRole('checkbox')).not.toBeChecked()
      expect(screen.getByDisplayValue('custom content')).not.toBeDisabled()
    })

    it('shows default value when using default (currentValue is null)', () => {
      render(
        <DefaultableValueContentEditor
          {...defaultProps}
          hasDefaults={true}
          currentValue={null}
        />,
      )

      expect(screen.getByDisplayValue('default content')).toBeInTheDocument()
      expect(screen.getByRole('checkbox')).toBeChecked()
      expect(screen.getByDisplayValue('default content')).toBeDisabled()
    })

    it('handles undefined defaultValue', () => {
      render(
        <DefaultableValueContentEditor
          {...defaultProps}
          hasDefaults={true}
          defaultValue={undefined}
          currentValue={null}
        />,
      )

      expect(screen.getByDisplayValue('')).toBeInTheDocument()
    })

    it('calls onChange with null when switching to use default', () => {
      render(
        <DefaultableValueContentEditor
          {...defaultProps}
          hasDefaults={true}
          currentValue="custom content"
        />,
      )

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      expect(mockOnChange).toHaveBeenCalledWith(null)
    })

    it('calls onChange with editor value when switching from default', () => {
      render(
        <DefaultableValueContentEditor
          {...defaultProps}
          hasDefaults={true}
          currentValue={null}
        />,
      )

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      expect(mockOnChange).toHaveBeenCalledWith('default content')
    })

    it('calls onChange when typing in editor (not using default)', () => {
      render(
        <DefaultableValueContentEditor
          {...defaultProps}
          hasDefaults={true}
          currentValue="initial"
        />,
      )

      const editor = screen.getByDisplayValue('initial')
      fireEvent.change(editor, { target: { value: 'typed content' } })

      expect(mockOnChange).toHaveBeenCalledWith('typed content')
    })

    it('shows correct placeholder when using default', () => {
      render(
        <DefaultableValueContentEditor
          {...defaultProps}
          hasDefaults={true}
          currentValue={null}
        />,
      )

      const editor = screen.getByPlaceholderText('Default: default content')
      expect(editor).toBeInTheDocument()
    })

    it('shows custom placeholder when not using default', () => {
      render(
        <DefaultableValueContentEditor
          {...defaultProps}
          hasDefaults={true}
          currentValue="content"
          placeholder="Custom placeholder"
        />,
      )

      const editor = screen.getByPlaceholderText('Custom placeholder')
      expect(editor).toBeInTheDocument()
    })

    it('shows fallback placeholder when no custom placeholder is provided', () => {
      render(
        <DefaultableValueContentEditor
          {...defaultProps}
          hasDefaults={true}
          currentValue="content"
          placeholder={undefined}
        />,
      )

      const editor = screen.getByPlaceholderText('Enter test html editor')
      expect(editor).toBeInTheDocument()
    })

    it('handles default value fallback message when no default is set', () => {
      render(
        <DefaultableValueContentEditor
          {...defaultProps}
          hasDefaults={true}
          currentValue={null}
          defaultValue=""
        />,
      )

      const editor = screen.getByPlaceholderText('Default: No default set')
      expect(editor).toBeInTheDocument()
    })
  })

  describe('className', () => {
    it('applies custom className', () => {
      const { container } = render(
        <DefaultableValueContentEditor
          {...defaultProps}
          className="custom-class"
        />,
      )

      expect(container.querySelector('.custom-class')).toBeInTheDocument()
    })
  })
})
