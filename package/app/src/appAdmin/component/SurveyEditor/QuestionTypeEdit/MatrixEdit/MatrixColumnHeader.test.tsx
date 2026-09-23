import type React from 'react'
import { render, screen } from '@testing-library/react'

import { SURVEY_ENTITY_TYPE_SUBQUESTION } from 'appAdmin/component/SurveyEditor'

import { MatrixColumnHeader } from './MatrixColumnHeader'

jest.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}))

jest.mock('appAdmin/component/ContentEditor', () => ({
  ContentEditor: ({
    value,
    placeholder,
    onChange,
  }: {
    value?: string
    placeholder?: string
    onChange?: (content: string) => void
  }) => (
    <div data-testid="html-editor">
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  ),
}))

jest.mock('appAdmin/component/SurveyEditor', () => {
  const actual = jest.requireActual('appAdmin/component/SurveyEditor')
  return {
    ...actual,
    useSurveyEditorStore: (
      selector: (state: {
        operations: Record<string, jest.Mock>
        langDefault: string
      }) => unknown,
    ) =>
      selector({
        operations: {
          moveSubquestion: jest.fn(),
          moveAnswerOption: jest.fn(),
        },
        langDefault: 'en',
      }),
    useSurveyEditorFocus: () => ({
      surveyFocus: null,
      setSurveyFocus: jest.fn(),
    }),
  }
})

const LONG_LABEL =
  'This is a very long subquestion label that used to overlap the drag handle and action icons before the fix'

function buildLabelL10n(text: string) {
  return { getLang: () => text } as unknown as import('veysur-common').L10n
}

// MatrixColumnHeader's root element is a <td> - only valid nested in a table row.
function renderInRow(ui: React.ReactElement) {
  return render(
    <table>
      <tbody>
        <tr>{ui}</tr>
      </tbody>
    </table>,
  )
}

describe('MatrixColumnHeader', () => {
  it('renders the drag-handle and action-icon slots at fixed widths regardless of label length', () => {
    renderInRow(
      <MatrixColumnHeader
        entityId="sq1"
        entityType={SURVEY_ENTITY_TYPE_SUBQUESTION}
        labelL10n={buildLabelL10n(LONG_LABEL)}
        questionId="q1"
        lang="en"
        langDefault="en"
        langEditing="en"
        index={0}
        totalCount={2}
        onUpdateText={jest.fn()}
        onDelete={jest.fn()}
      />,
    )

    const dragHandle =
      screen.getByTestId('html-editor').parentElement?.previousElementSibling
    expect(dragHandle).toHaveClass('w-8')

    const actionIcons =
      screen.getByTestId('html-editor').parentElement?.nextElementSibling
    expect(actionIcons).toHaveClass('w-24')
  })

  it('centres the label ContentEditor between the two fixed slots', () => {
    renderInRow(
      <MatrixColumnHeader
        entityId="sq1"
        entityType={SURVEY_ENTITY_TYPE_SUBQUESTION}
        labelL10n={buildLabelL10n(LONG_LABEL)}
        questionId="q1"
        lang="en"
        langDefault="en"
        langEditing="en"
        index={0}
        totalCount={2}
        onUpdateText={jest.fn()}
        onDelete={jest.fn()}
      />,
    )

    const labelWrapper = screen.getByTestId('html-editor').parentElement
    expect(labelWrapper).toHaveClass('text-center')
    expect(labelWrapper).toHaveClass('flex-1')
  })

  it('renders {{expression}} validation errors beneath the label', () => {
    renderInRow(
      <MatrixColumnHeader
        entityId="sq1"
        entityType={SURVEY_ENTITY_TYPE_SUBQUESTION}
        labelL10n={buildLabelL10n('{{answers.Q999}}')}
        questionId="q1"
        lang="en"
        langDefault="en"
        langEditing="en"
        index={0}
        totalCount={2}
        onUpdateText={jest.fn()}
        onDelete={jest.fn()}
        errors={['Unknown question code "Q999" in answers.Q999']}
      />,
    )

    expect(
      screen.getByText('Unknown question code "Q999" in answers.Q999'),
    ).toBeInTheDocument()
  })
})
