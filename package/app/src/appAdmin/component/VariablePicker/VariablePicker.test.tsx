import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { VariablePicker } from './VariablePicker'

// Radix Popover content is portal-rendered and opens via pointer-capture
// APIs jsdom doesn't implement, so only the always-present trigger is
// asserted here - not open/select interaction, which needs a real browser
// (see AGENTS.md: no headless-browser UI verification in this repo).
describe('VariablePicker', () => {
  it('renders an enabled trigger when at least one group has entries', () => {
    render(
      <VariablePicker
        groups={[
          {
            label: 'Participant',
            entries: [{ path: 'participant.email', label: 'Email' }],
          },
        ]}
        onSelect={jest.fn()}
      />,
    )
    expect(screen.getByTitle('Insert variable')).toBeEnabled()
  })

  it('disables the trigger when every group is empty', () => {
    render(
      <VariablePicker
        groups={[{ label: 'Empty', entries: [] }]}
        onSelect={jest.fn()}
      />,
    )
    expect(screen.getByTitle('Insert variable')).toBeDisabled()
  })

  it('disables the trigger when disabled is explicitly passed', () => {
    render(
      <VariablePicker
        groups={[
          {
            label: 'Participant',
            entries: [{ path: 'participant.email', label: 'Email' }],
          },
        ]}
        onSelect={jest.fn()}
        disabled
      />,
    )
    expect(screen.getByTitle('Insert variable')).toBeDisabled()
  })

  it('renders a custom trigger label when provided', () => {
    render(
      <VariablePicker
        groups={[
          {
            label: 'Participant',
            entries: [{ path: 'participant.email', label: 'Email' }],
          },
        ]}
        onSelect={jest.fn()}
        triggerLabel="Insert variable"
      />,
    )
    expect(screen.getByRole('button')).toHaveTextContent('Insert variable')
  })
})
