import { render, screen, fireEvent } from '@testing-library/react'

import { PageSurveyEdit } from './PageSurveyEdit'

const setSurveyFocus = jest.fn()

jest.mock('hook', () => ({
  usePageTitle: jest.fn(),
}))

jest.mock('appAdmin/component/SurveyEditor/SurveyEditorNavContainer', () => ({
  SurveyEditorNavContainer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="nav-container">{children}</div>
  ),
}))

jest.mock('appAdmin/component/SurveyEditor', () => ({
  SurveyEditor: () => (
    <>
      <div data-testid="question-container">question</div>
      <div data-testid="question-group-container">group</div>
      <div data-testid="empty-space">empty space</div>
    </>
  ),
  SurveyEditorBar: () => <div data-testid="editor-bar" />,
  SurveySaveStatus: () => <div data-testid="save-status" />,
  SidebarLeft: () => <div data-testid="sidebar-left" />,
  SidebarRight: () => <div data-testid="sidebar-right" />,
  useSurveyEditorStore: (selector: (state: { survey: undefined }) => unknown) =>
    selector({ survey: undefined }),
  useSurveyEditorFocus: () => ({
    setSurveyFocus,
    getFocusedEntity: () => undefined,
  }),
  SURVEY_ENTITY_TYPE_SURVEY: 'survey',
}))

describe('PageSurveyEdit', () => {
  beforeEach(() => {
    setSurveyFocus.mockClear()
  })

  it('clears focus to the survey entity when Escape is pressed', () => {
    render(<PageSurveyEdit />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(setSurveyFocus).toHaveBeenCalledWith({ entityType: 'survey' })
  })

  it('clears focus when clicking inside #survey-container but outside a question/group container', () => {
    render(<PageSurveyEdit />)

    fireEvent.click(screen.getByTestId('empty-space'))

    expect(setSurveyFocus).toHaveBeenCalledWith({ entityType: 'survey' })
  })

  it('does not clear focus when clicking inside a question-container', () => {
    render(<PageSurveyEdit />)

    fireEvent.click(screen.getByTestId('question-container'))

    expect(setSurveyFocus).not.toHaveBeenCalled()
  })

  it('does not clear focus when clicking inside a question-group-container', () => {
    render(<PageSurveyEdit />)

    fireEvent.click(screen.getByTestId('question-group-container'))

    expect(setSurveyFocus).not.toHaveBeenCalled()
  })

  it('removes the keydown listener on unmount', () => {
    const { unmount } = render(<PageSurveyEdit />)

    unmount()
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(setSurveyFocus).not.toHaveBeenCalled()
  })
})
