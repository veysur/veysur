import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import { TooltipProvider } from 'component/shadcn/tooltip'

import { BaseAccessSettings } from './BaseAccessSettings'

jest.mock('appAdmin/hook', () => ({
  useFeatureGate: () => ({ canUse: () => true }),
}))

describe('BaseAccessSettings allowed websites', () => {
  const makeHandlers = () => ({
    YES: 'Yes',
    NO: 'No',
    handleBooleanChange: jest.fn(),
    handleStringListChange: jest.fn(),
  })

  test('on the project defaults page, edits the default list directly', () => {
    const handlers = makeHandlers()
    render(
      <TooltipProvider>
        <BaseAccessSettings
          data={{ access: { embedDomains: ['a.com'] }, source: {} }}
          handlers={handlers}
        />
      </TooltipProvider>,
    )

    const textarea = screen.getByPlaceholderText('example.com')
    expect(textarea).toHaveValue('a.com')

    fireEvent.change(textarea, { target: { value: 'a.com\nb.com' } })
    fireEvent.blur(textarea)

    expect(handlers.handleStringListChange).toHaveBeenCalledWith(
      'access',
      'embedDomains',
      ['a.com', 'b.com'],
    )
  })

  test('on a survey, inherits the project default until overridden', () => {
    const handlers = makeHandlers()
    render(
      <TooltipProvider>
        <BaseAccessSettings
          data={{
            access: { embedDomains: null },
            source: {},
            getDefault: (<T,>() => ['project.com'] as T) as <T>() => T,
          }}
          handlers={handlers}
        />
      </TooltipProvider>,
    )

    const textarea = screen.getByPlaceholderText('example.com')
    expect(textarea).toBeDisabled()
    expect(textarea).toHaveValue('project.com')
  })
})
