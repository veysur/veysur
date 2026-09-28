import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import { PublishButton } from './PublishButton'

describe('PublishButton', () => {
  test('shows "Publish" when never published', () => {
    render(<PublishButton isPublished={false} onClick={jest.fn()} />)

    expect(screen.getByRole('button')).toHaveTextContent('Publish')
  })

  test('shows "Published" when published with no pending changes', () => {
    render(
      <PublishButton
        isPublished
        hasUnpublishedChanges={false}
        onClick={jest.fn()}
      />,
    )

    expect(screen.getByRole('button')).toHaveTextContent('Published')
  })

  test('shows "Re-publish" when published with unpublished changes', () => {
    render(
      <PublishButton isPublished hasUnpublishedChanges onClick={jest.fn()} />,
    )

    expect(screen.getByRole('button')).toHaveTextContent('Re-publish')
  })

  test('shows status dot only when published with unpublished changes', () => {
    const { container, rerender } = render(
      <PublishButton isPublished hasUnpublishedChanges onClick={jest.fn()} />,
    )

    expect(container.querySelector('.bg-warning')).toBeInTheDocument()

    rerender(
      <PublishButton
        isPublished
        hasUnpublishedChanges={false}
        onClick={jest.fn()}
      />,
    )

    expect(container.querySelector('.bg-warning')).not.toBeInTheDocument()
  })
})
