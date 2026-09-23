import { render, screen } from '@testing-library/react'

import { Dialog, DialogContent } from './dialog'

describe('DialogContent', () => {
  it('scrolls internally instead of overflowing when content is placed directly inside it', () => {
    render(
      <Dialog open>
        <DialogContent>
          <div style={{ height: 2000 }}>tall content</div>
        </DialogContent>
      </Dialog>,
    )

    expect(screen.getByRole('dialog')).toHaveClass('overflow-y-auto')
  })
})
