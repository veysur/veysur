import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

import { ContentTypeModal } from './ContentTypeModal'

// Mirrors the real caller (ContentTypeSelect): the parent must remount this
// component via a key derived from `open` for its selection state to reset
// between opens.
const Harness = () => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>open</button>
      <ContentTypeModal
        key={open ? 'open' : 'closed'}
        open={open}
        onOpenChange={setOpen}
        onConfirm={() => setOpen(false)}
      />
    </>
  )
}

describe('ContentTypeModal remount-on-reopen', () => {
  it('resets the type selection on a close/reopen cycle', () => {
    render(<Harness />)

    fireEvent.click(screen.getByText('open'))
    fireEvent.click(screen.getByText('Video (YouTube)'))
    expect(screen.getByRole('button', { name: 'Add content' })).toBeEnabled()

    fireEvent.click(screen.getByText('Cancel'))
    fireEvent.click(screen.getByText('open'))

    expect(screen.getByRole('button', { name: 'Add content' })).toBeDisabled()
  })

  it('pre-selects from initialType without leaking into a fresh open', () => {
    const Harness2 = () => {
      const [open, setOpen] = useState(false)
      const [editing, setEditing] = useState(false)
      return (
        <>
          <button onClick={() => setOpen(true)}>open</button>
          <ContentTypeModal
            key={open ? 'open' : 'closed'}
            open={open}
            onOpenChange={setOpen}
            initialType={editing ? 'contentVideoYoutube' : undefined}
            onConfirm={() => setOpen(false)}
          />
          <button onClick={() => setEditing(true)}>enableEditing</button>
        </>
      )
    }

    render(<Harness2 />)

    fireEvent.click(screen.getByText('enableEditing'))
    fireEvent.click(screen.getByText('open'))

    expect(screen.getByRole('button', { name: 'Change type' })).toBeEnabled()
  })
})
