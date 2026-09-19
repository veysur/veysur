import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import { AttributeManagementPage } from './AttributeManagementPage'
import * as hooks from '../hook'

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}))

jest.mock('appAdmin/component/SurveyEditor', () => ({
  SurveyEditorNavContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SurveyPageContent: ({
    children,
    pageHeader,
  }: {
    children: React.ReactNode
    pageHeader: React.ReactNode
  }) => (
    <div>
      {pageHeader}
      {children}
    </div>
  ),
  useSurveyEditorStore: (selector: (state: unknown) => unknown) =>
    selector({
      survey: { _id: 'survey1', name: 'My Survey' },
      langEditing: 'en',
      langDefault: 'en',
      setChildNavigationBlocker: jest.fn(),
    }),
}))

jest.mock('appAdmin/component/SurveyEditor/SurveyLanguageSelector', () => ({
  SurveyLanguageSelector: () => <div data-testid="lang-selector" />,
}))

jest.mock('../hook')

describe('AttributeManagementPage', () => {
  const surveyParticipantAttributeCreate = jest.fn()
  const surveyParticipantAttributeBatchSave = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(hooks.useSurveyParticipantAttributeList as jest.Mock).mockReturnValue({
      systemAttributes: [
        {
          kind: 'system',
          name: 'email',
          required: true,
          internal: false,
          label: 'Email',
          languages: {},
        },
      ],
      customAttributes: [
        {
          kind: 'custom',
          name: 'department',
          attribute: {
            name: 'department',
            required: false,
            internal: false,
            example: 'Sales',
          },
          required: false,
          internal: false,
          example: 'Sales',
          label: 'Department',
          languages: { en: { label: 'Department', description: '' } },
        },
      ],
      isLoading: false,
      isFetching: false,
    })
    ;(hooks.useSurveyParticipantAttributeCreate as jest.Mock).mockReturnValue({
      surveyParticipantAttributeCreate,
      isLoading: false,
      error: null,
    })
    ;(hooks.useSurveyParticipantAttributeDelete as jest.Mock).mockReturnValue({
      surveyParticipantAttributeDelete: jest.fn(),
      isLoading: false,
      error: null,
    })
    ;(
      hooks.useSurveyParticipantAttributeBatchSave as jest.Mock
    ).mockReturnValue({
      surveyParticipantAttributeBatchSave,
      isLoading: false,
      error: null,
    })
  })

  it('renders system and custom attribute rows', () => {
    render(<AttributeManagementPage />)

    fireEvent.click(screen.getByText('Show system attributes'))

    expect(screen.getByText('email')).toBeInTheDocument()
    expect(screen.getByDisplayValue('department')).toBeInTheDocument()
    expect(screen.getByText('System')).toBeInTheDocument()
    expect(screen.getByText('Custom')).toBeInTheDocument()
  })

  it('adds a row with an empty name input when Add Attribute is clicked', () => {
    render(<AttributeManagementPage />)

    fireEvent.click(screen.getByText('Add Attribute'))

    const nameInputs = screen.getAllByPlaceholderText('Attribute name')
    expect(nameInputs[nameInputs.length - 1]).toHaveValue('')
    expect(surveyParticipantAttributeCreate).not.toHaveBeenCalled()
  })

  it('shows a validation error and does not call create when saving with an unnamed attribute', async () => {
    render(<AttributeManagementPage />)

    fireEvent.click(screen.getByText('Add Attribute'))
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(
      await screen.findByText(
        'All new attributes must have a name before saving.',
      ),
    ).toBeInTheDocument()
    expect(surveyParticipantAttributeCreate).not.toHaveBeenCalled()
  })

  it('creates a new attribute with the user-entered name on Save', async () => {
    surveyParticipantAttributeCreate.mockResolvedValue(undefined)
    surveyParticipantAttributeBatchSave.mockResolvedValue(undefined)

    render(<AttributeManagementPage />)

    fireEvent.click(screen.getByText('Add Attribute'))

    const nameInputs = screen.getAllByPlaceholderText('Attribute name')
    const newNameInput = nameInputs[nameInputs.length - 1]
    fireEvent.change(newNameInput, { target: { value: 'region' } })
    fireEvent.blur(newNameInput)

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(surveyParticipantAttributeCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'region' }),
      )
    })
  })

  it('Save button is disabled when there are no pending changes', () => {
    render(<AttributeManagementPage />)

    const saveButton = screen.getByRole('button', { name: 'Save changes' })
    expect(saveButton).toBeDisabled()
  })

  it('Cancel button is disabled when there are no pending changes', () => {
    render(<AttributeManagementPage />)

    const cancelButton = screen.getByRole('button', { name: 'Cancel changes' })
    expect(cancelButton).toBeDisabled()
  })

  it('enables Save and Cancel buttons after editing a field', () => {
    render(<AttributeManagementPage />)

    // The custom attribute's label input is the enabled one (system is disabled)
    const labelInputs = screen.getAllByLabelText('Label')
    const editableLabel = labelInputs.find(
      (el) => !el.hasAttribute('disabled'),
    )!
    fireEvent.change(editableLabel, { target: { value: 'New Label' } })
    fireEvent.blur(editableLabel)

    expect(
      screen.getByRole('button', { name: 'Save changes' }),
    ).not.toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Cancel changes' }),
    ).not.toBeDisabled()
  })

  it('fires batchSave mutation on Save after editing a label', async () => {
    surveyParticipantAttributeBatchSave.mockResolvedValue(undefined)

    render(<AttributeManagementPage />)

    const labelInputs = screen.getAllByLabelText('Label')
    const editableLabel = labelInputs.find(
      (el) => !el.hasAttribute('disabled'),
    )!
    fireEvent.change(editableLabel, { target: { value: 'New Label' } })
    fireEvent.blur(editableLabel)

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(surveyParticipantAttributeBatchSave).toHaveBeenCalledWith(
        expect.objectContaining({
          changes: expect.arrayContaining([
            expect.objectContaining({
              attributeName: 'department',
              language: expect.objectContaining({
                en: expect.objectContaining({ label: 'New Label' }),
              }),
            }),
          ]),
        }),
      )
    })
  })

  it('renaming then Save shows a confirm dialog, then batchSaves with newName', async () => {
    surveyParticipantAttributeBatchSave.mockResolvedValue(undefined)

    render(<AttributeManagementPage />)

    // user edits the name and goes straight to Save: blur fires first, but no
    // per-row modal now intercepts the click
    const nameInput = screen.getByDisplayValue('department')
    fireEvent.change(nameInput, { target: { value: 'division' } })
    fireEvent.blur(nameInput)

    const saveButton = screen.getByRole('button', { name: 'Save changes' })
    expect(saveButton).toBeEnabled()
    fireEvent.click(saveButton)

    // save-time confirm dialog lists the rename
    expect(screen.getByText('Rename attribute')).toBeInTheDocument()
    expect(screen.getByText(/department.*division/)).toBeInTheDocument()
    expect(surveyParticipantAttributeBatchSave).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Rename and Save' }))

    await waitFor(() => {
      expect(surveyParticipantAttributeBatchSave).toHaveBeenCalledWith(
        expect.objectContaining({
          changes: expect.arrayContaining([
            expect.objectContaining({
              attributeName: 'department',
              newName: 'division',
            }),
          ]),
        }),
      )
    })
  })

  it('cancelling the rename confirm dialog keeps changes pending and sends nothing', () => {
    render(<AttributeManagementPage />)

    const nameInput = screen.getByDisplayValue('department')
    fireEvent.change(nameInput, { target: { value: 'division' } })
    fireEvent.blur(nameInput)
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(surveyParticipantAttributeBatchSave).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled()
  })

  it('clears pending changes and re-mounts rows on Cancel', () => {
    render(<AttributeManagementPage />)

    const labelInputs = screen.getAllByLabelText('Label')
    const editableLabel = labelInputs.find(
      (el) => !el.hasAttribute('disabled'),
    )!
    fireEvent.change(editableLabel, { target: { value: 'New Label' } })
    fireEvent.blur(editableLabel)

    expect(
      screen.getByRole('button', { name: 'Cancel changes' }),
    ).not.toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel changes' }))

    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })
})
