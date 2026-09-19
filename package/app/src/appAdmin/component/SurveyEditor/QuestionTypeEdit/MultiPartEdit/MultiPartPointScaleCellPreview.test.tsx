import { render } from '@testing-library/react'
import { QUESTION_TYPE_STAR_RATING, QUESTION_TYPE_POINT_5 } from 'veysur-common'

import { MultiPartPointScaleCellPreview } from './MultiPartPointScaleCellPreview'

describe('MultiPartPointScaleCellPreview', () => {
  it('renders a star icon for QUESTION_TYPE_STAR_RATING', () => {
    const { container } = render(
      <MultiPartPointScaleCellPreview
        partType={QUESTION_TYPE_STAR_RATING}
        pointNumber={2}
        pointCount={5}
      />,
    )

    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(container).not.toHaveTextContent('2')
  })

  it('renders a numbered circle showing pointNumber for other point-scale types', () => {
    const { getByText, container } = render(
      <MultiPartPointScaleCellPreview
        partType={QUESTION_TYPE_POINT_5}
        pointNumber={3}
        pointCount={5}
      />,
    )

    expect(getByText('3')).toBeInTheDocument()
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })

  it('uses the smaller sizing class when pointCount >= 10', () => {
    const { getByText } = render(
      <MultiPartPointScaleCellPreview
        partType={QUESTION_TYPE_POINT_5}
        pointNumber={9}
        pointCount={10}
      />,
    )

    expect(getByText('9')).toHaveClass('h-8', 'w-8')
    expect(getByText('9')).not.toHaveClass('h-10', 'w-10')
  })

  it('uses the larger sizing class when pointCount < 10', () => {
    const { getByText } = render(
      <MultiPartPointScaleCellPreview
        partType={QUESTION_TYPE_POINT_5}
        pointNumber={3}
        pointCount={5}
      />,
    )

    expect(getByText('3')).toHaveClass('h-10', 'w-10')
    expect(getByText('3')).not.toHaveClass('h-8', 'w-8')
  })
})
