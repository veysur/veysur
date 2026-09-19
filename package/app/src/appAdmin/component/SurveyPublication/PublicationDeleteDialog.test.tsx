import { render, screen } from '@testing-library/react'

import { PublicationDeleteDialog } from './PublicationDeleteDialog'

describe('PublicationDeleteDialog', () => {
  const baseProps = {
    open: true,
    onOpenChange: jest.fn(),
    selectedCount: 2,
    onConfirm: jest.fn(),
    isDeleting: false,
  }

  it('warns about unpublishing when the selection includes the active publication', () => {
    render(<PublicationDeleteDialog {...baseProps} includesActivePublication />)

    expect(
      screen.getByText('Unpublish and Delete Publications'),
    ).toBeInTheDocument()
    expect(screen.getByText(/currently published/i)).toBeInTheDocument()
  })

  it('uses the plain delete copy when no selected publication is active', () => {
    render(
      <PublicationDeleteDialog
        {...baseProps}
        includesActivePublication={false}
      />,
    )

    expect(screen.getByText('Delete Publications')).toBeInTheDocument()
    expect(screen.queryByText(/currently published/i)).not.toBeInTheDocument()
  })
})
