import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

import { QuestionTypeModal } from './QuestionTypeModal'

// Mirrors the real callers (AddElementPanel, QuestionTypeSelect): the parent
// must remount this component via a key derived from `open` for its
// selection state to reset between opens.
const Harness = () => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>open</button>
      <QuestionTypeModal
        key={open ? 'open' : 'closed'}
        open={open}
        onOpenChange={setOpen}
        onConfirm={() => setOpen(false)}
      />
    </>
  )
}

describe('QuestionTypeModal remount-on-reopen', () => {
  it('resets category/type selection on a close/reopen cycle', () => {
    render(<Harness />)

    fireEvent.click(screen.getByText('open'))
    fireEvent.click(screen.getByText('Choice'))
    fireEvent.click(screen.getByText('Yes/No'))

    // Selection collapses into a summary row once chosen
    expect(screen.getByRole('button', { name: 'Add Question' })).toBeEnabled()

    // Close via Cancel, then reopen
    fireEvent.click(screen.getByText('Cancel'))
    fireEvent.click(screen.getByText('open'))

    // Fresh instance: no type selected yet, so confirm stays disabled and
    // the type selection grid (not the collapsed summary) is shown again
    expect(screen.getByRole('button', { name: 'Add Question' })).toBeDisabled()
    expect(screen.queryByText('Select Question Type')).not.toBeInTheDocument()
  })

  it('pre-populates from initialType without leaking into a fresh add', () => {
    const Harness2 = () => {
      const [open, setOpen] = useState(false)
      const [editing, setEditing] = useState(false)
      return (
        <>
          <button onClick={() => setOpen(true)}>open</button>
          <QuestionTypeModal
            key={open ? 'open' : 'closed'}
            open={open}
            onOpenChange={setOpen}
            initialType={editing ? 'yesNo' : undefined}
            onConfirm={() => setOpen(false)}
          />
          <button onClick={() => setEditing(true)}>enableEditing</button>
        </>
      )
    }

    render(<Harness2 />)

    fireEvent.click(screen.getByText('enableEditing'))
    fireEvent.click(screen.getByText('open'))

    expect(screen.getByText('Change Type')).toBeEnabled()
  })
})
