import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { VariablePicker, VariablePickerList } from './VariablePicker'

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

describe('VariablePickerList', () => {
  const question = 'I understood what taking part in the study involves'
  const groups = [
    {
      label: 'Answers',
      entries: [
        {
          path: 'answers.Q1.A1',
          label: `${question} — Yes`,
          context: question,
          detail: 'Yes',
        },
        {
          path: 'answers.Q1.A2',
          label: `${question} — No`,
          context: question,
          detail: 'No',
        },
        { path: 'answers.Q2', label: 'Other question' },
      ],
    },
  ]

  it('shows a question once and only the distinguishing part per row', () => {
    render(<VariablePickerList groups={groups} onSelect={jest.fn()} />)
    expect(screen.getAllByTestId('variable-picker-context')).toHaveLength(1)
    expect(screen.getByText(question)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Yes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'No' })).toBeInTheDocument()
  })

  it('renders entries without a context by their label', () => {
    render(<VariablePickerList groups={groups} onSelect={jest.fn()} />)
    expect(
      screen.getByRole('button', { name: 'Other question' }),
    ).toBeInTheDocument()
  })

  it('selects by path', () => {
    const onSelect = jest.fn()
    render(<VariablePickerList groups={groups} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    expect(onSelect).toHaveBeenCalledWith('answers.Q1.A2')
  })
})
