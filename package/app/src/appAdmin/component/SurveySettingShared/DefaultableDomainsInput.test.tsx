import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import { TooltipProvider } from 'component/shadcn/tooltip'

import { DefaultableDomainsInput } from './DefaultableDomainsInput'

const renderInput = (
  props: Partial<React.ComponentProps<typeof DefaultableDomainsInput>> = {},
) => {
  const onChange = jest.fn()
  render(
    <TooltipProvider>
      <DefaultableDomainsInput
        label="Allowed Websites"
        currentValue={['a.com']}
        onChange={onChange}
        {...props}
      />
    </TooltipProvider>,
  )
  return { onChange }
}

describe('DefaultableDomainsInput', () => {
  test('without defaults, saves the parsed list on blur and only when it changed', () => {
    const { onChange } = renderInput()
    const textarea = screen.getByRole('textbox')

    fireEvent.blur(textarea)
    expect(onChange).not.toHaveBeenCalled()

    fireEvent.change(textarea, {
      target: { value: 'https://B.com/page\na.com' },
    })
    fireEvent.blur(textarea)
    expect(onChange).toHaveBeenCalledWith(['b.com', 'a.com'])
  })

  test('an empty box saves an empty list', () => {
    const { onChange } = renderInput()
    const textarea = screen.getByRole('textbox')

    fireEvent.change(textarea, { target: { value: '' } })
    fireEvent.blur(textarea)

    expect(onChange).toHaveBeenCalledWith([])
  })

  test('with defaults, an empty box overrides a restrictive default with an empty list', () => {
    const { onChange } = renderInput({
      hasDefaults: true,
      currentValue: ['a.com'],
      defaultValue: ['default.com'],
    })
    const textarea = screen.getByRole('textbox')

    fireEvent.change(textarea, { target: { value: '' } })
    fireEvent.blur(textarea)

    expect(onChange).toHaveBeenCalledWith([])
  })

  test('with defaults, shows the default list read-only while inheriting', () => {
    renderInput({
      hasDefaults: true,
      currentValue: null,
      defaultValue: ['default.com'],
    })

    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeDisabled()
    expect(textarea).toHaveValue('default.com')
  })

  test('with defaults, switching off "use default" saves the list as an override', () => {
    const { onChange } = renderInput({
      hasDefaults: true,
      currentValue: null,
      defaultValue: ['default.com'],
    })

    fireEvent.click(screen.getByRole('checkbox'))

    expect(onChange).toHaveBeenCalledWith(['default.com'])
  })

  test('with defaults, switching "use default" back on clears the override', () => {
    const { onChange } = renderInput({
      hasDefaults: true,
      currentValue: ['mine.com'],
      defaultValue: ['default.com'],
    })

    fireEvent.click(screen.getByRole('checkbox'))

    expect(onChange).toHaveBeenCalledWith(null)
  })
})
