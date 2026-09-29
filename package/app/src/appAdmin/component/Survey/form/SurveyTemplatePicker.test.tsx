import { fireEvent, render, screen } from '@testing-library/react'

import { SurveyTemplatePicker } from './SurveyTemplatePicker'

jest.mock('../hook', () => ({
  useSurveyTemplateList: () => ({
    templates: [
      {
        id: 'nps',
        name: 'Net Promoter Score',
        description: 'Ask the standard question.',
        category: 'Customer feedback',
        questionCount: 3,
      },
      {
        id: 'event',
        name: 'Event feedback',
        description: 'Reactions to a meetup.',
        category: 'Events',
        questionCount: 5,
      },
    ],
    isLoading: false,
  }),
}))

const renderPicker = (value?: string) => {
  const onChange = jest.fn()
  render(<SurveyTemplatePicker value={value} onChange={onChange} />)
  return onChange
}

const expand = () => {
  fireEvent.click(screen.getByTestId('survey-template-toggle'))
}

describe('SurveyTemplatePicker', () => {
  it('hides the template options until expanded', () => {
    renderPicker()
    expect(screen.getByTestId('survey-template-toggle')).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.queryAllByRole('radio')).toHaveLength(0)
    expand()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
  })

  it('starts expanded when a template is already selected', () => {
    renderPicker('nps')
    expect(screen.getAllByRole('radio')).toHaveLength(3)
  })

  it('reports the blank option as an undefined template id', () => {
    const onChange = renderPicker('nps')
    fireEvent.click(screen.getByRole('radio', { name: /blank survey/i }))
    expect(onChange).toHaveBeenCalledWith(undefined)
  })

  it('shows every template and the blank option once expanded', () => {
    renderPicker()
    expand()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
  })

  it('narrows by category tab', () => {
    renderPicker()
    expand()
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Events' }))
    expect(screen.queryByRole('radio', { name: /net promoter/i })).toBeNull()
    expect(screen.getByRole('radio', { name: /event feedback/i })).toBeVisible()
    expect(screen.getByRole('radio', { name: /blank survey/i })).toBeVisible()
  })

  it('filters by search text and shows an empty state', () => {
    renderPicker()
    expand()
    const search = screen.getByPlaceholderText('Search templates (optional)...')
    fireEvent.change(search, { target: { value: 'promoter' } })
    expect(screen.getAllByRole('radio')).toHaveLength(2)

    fireEvent.change(search, { target: { value: 'zzz' } })
    expect(screen.getAllByRole('radio')).toHaveLength(1)
    expect(screen.getByText('No templates match your search.')).toBeVisible()
  })
})
