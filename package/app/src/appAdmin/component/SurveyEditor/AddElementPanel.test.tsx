import { render, screen, fireEvent } from '@testing-library/react'

import { AddElementPanel } from './AddElementPanel'

const mockOperations = {
  addQuestion: jest.fn(),
  addContent: jest.fn(),
  addSection: jest.fn(),
}

jest.mock('appAdmin/component/SurveyEditor', () => {
  const actual = jest.requireActual('appAdmin/component/SurveyEditor')
  return {
    ...actual,
    useSurveyEditorStore: (
      selector: (state: {
        operations: typeof mockOperations
        langDefault: string
      }) => unknown,
    ) => selector({ operations: mockOperations, langDefault: 'en' }),
  }
})

describe('AddElementPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const openPopover = () =>
    fireEvent.click(screen.getByTestId('add-element-trigger'))

  it('offers Add Question, Add Content and Add Group when a section is set', () => {
    render(<AddElementPanel sectionId="S001" prevElementId="Q001" />)
    openPopover()

    expect(screen.getByTestId('add-question-trigger')).toBeInTheDocument()
    expect(screen.getByTestId('add-content-trigger')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Add Group/ }),
    ).toBeInTheDocument()
  })

  it('only offers Add Group without a section', () => {
    render(<AddElementPanel />)
    openPopover()

    expect(screen.queryByTestId('add-question-trigger')).not.toBeInTheDocument()
    expect(screen.queryByTestId('add-content-trigger')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Add Group/ }),
    ).toBeInTheDocument()
  })

  it('does not list content types directly in the popover', () => {
    render(<AddElementPanel sectionId="S001" />)
    openPopover()

    expect(screen.queryByText('Text content')).not.toBeInTheDocument()
    expect(screen.queryByText('Video (YouTube)')).not.toBeInTheDocument()
  })

  it('adds a content element via the content type modal', () => {
    render(<AddElementPanel sectionId="S001" prevElementId="Q001" />)

    openPopover()
    fireEvent.click(screen.getByTestId('add-content-trigger'))

    fireEvent.click(screen.getByText('Text content'))
    fireEvent.click(screen.getByRole('button', { name: 'Add content' }))

    expect(mockOperations.addContent).toHaveBeenCalledWith('S001', {
      type: 'contentText',
      afterId: 'Q001',
      lang: 'en',
    })
  })
})
