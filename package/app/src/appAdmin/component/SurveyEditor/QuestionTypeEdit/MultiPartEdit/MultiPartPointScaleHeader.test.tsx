import { render, screen } from '@testing-library/react'
import { QUESTION_TYPE_POINT_5 } from 'veysur-common'

import { MultiPartPointScaleHeader } from './MultiPartPointScaleHeader'

const operations = {}

jest.mock('appAdmin/component/SurveyEditor', () => ({
  useSurveyEditorStore: (
    selector: (state: {
      operations: typeof operations
      langEditing: string
    }) => unknown,
  ) => selector({ operations, langEditing: 'en' }),
}))

const baseProps = {
  questionId: 'q1',
  partType: QUESTION_TYPE_POINT_5,
  answerId: 'a1',
  index: 0,
  lang: 'en',
  langDefault: 'en',
}

const renderHeader = (label: string) =>
  render(
    <table>
      <tbody>
        <tr>
          <MultiPartPointScaleHeader {...baseProps} label={label} />
        </tr>
      </tbody>
    </table>,
  )

describe('MultiPartPointScaleHeader', () => {
  it('does not render "Point N" text', () => {
    renderHeader('')

    expect(screen.queryByText(/point\s*\d/i)).not.toBeInTheDocument()
  })

  it('uses the shortened placeholder text', () => {
    renderHeader('')

    expect(document.querySelector('[data-placeholder]')).toHaveAttribute(
      'data-placeholder',
      'Label',
    )
  })

  it('wraps a long label and carries a title attribute with the plain text', () => {
    const longLabel =
      '<p>This is a very long point label that would overflow the narrow column width if not wrapped</p>'
    const plainText =
      'This is a very long point label that would overflow the narrow column width if not wrapped'

    render(
      <table>
        <tbody>
          <tr>
            <MultiPartPointScaleHeader {...baseProps} label={longLabel} />
          </tr>
        </tbody>
      </table>,
    )

    const th = document.querySelector('th')
    expect(th).toHaveAttribute('title', plainText)

    const wrapper = document.querySelector('.tiptap-editor-wrapper')
    expect(wrapper?.className).not.toContain('truncate')
  })
})
