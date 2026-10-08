import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom'
import { SettingSurvey, Survey } from 'veysur-common'

import { SurveyEmbedCard } from './SurveyEmbedCard'

const settingSurvey = new SettingSurvey({
  language: { default: 'en', options: ['en'] },
})

const makeSurvey = (
  access: Record<string, unknown> = {},
  types: string[] = ['text'],
) =>
  new Survey({
    _id: 's1',
    name: 'Test',
    createdById: 'u1',
    title: {},
    attributes: {},
    access: { open: true, ...access },
    sections: [{ _id: 'g1', kind: 'group', code: 'G001' }],
    sectionIds: ['g1'],
    elements: types.map((type, i) => ({
      _id: `q${i}`,
      kind: 'question' as const,
      code: `Q00${i}`,
      type,
      sectionId: 'g1',
      text: {},
    })),
    elementIds: types.map((_, i) => `q${i}`),
  })

const renderCard = (
  survey: Survey,
  props: Partial<React.ComponentProps<typeof SurveyEmbedCard>> = {},
) => {
  const onEmbedChange = jest.fn()
  render(
    <MemoryRouter>
      <SurveyEmbedCard
        survey={survey}
        settingSurvey={settingSurvey}
        projectId="p1"
        isPublished
        onEmbedChange={onEmbedChange}
        {...props}
      />
    </MemoryRouter>,
  )
  return { onEmbedChange }
}

describe('SurveyEmbedCard', () => {
  test('enabling embedding reports the change', () => {
    const { onEmbedChange } = renderCard(makeSurvey())

    fireEvent.click(screen.getByRole('switch'))

    expect(onEmbedChange).toHaveBeenCalledWith(true)
    expect(screen.queryByText('Code to paste into your page')).toBeNull()
  })

  test('shows the snippet and allowed websites once embedding is on', () => {
    renderCard(makeSurvey({ embed: true }), { language: 'de' })

    expect(
      screen.getByDisplayValue(/data-survey="p1\/s1" data-lang="de"/),
    ).toBeInTheDocument()
    expect(screen.getByText('Any website')).toBeInTheDocument()
  })

  test('explains why a survey that is not open cannot be embedded, and disables the switch', () => {
    renderCard(makeSurvey({ open: false }))

    expect(screen.getByRole('switch')).toBeDisabled()
    expect(screen.getByText(/must be Open/)).toBeInTheDocument()
  })

  test('blocks surveys with a file upload question', () => {
    renderCard(makeSurvey({}, ['fileUpload']))

    expect(screen.getByRole('switch')).toBeDisabled()
    expect(screen.getByText(/file upload question/)).toBeInTheDocument()
  })

  test('keeps the switch usable so embedding can be turned off after the survey stops qualifying', () => {
    renderCard(makeSurvey({ embed: true, open: false }))

    expect(screen.getByRole('switch')).toBeEnabled()
  })

  test('shows "Any website" when the list is empty (stored as null) or contains *', () => {
    const { unmount } = render(
      <MemoryRouter>
        <SurveyEmbedCard
          survey={makeSurvey({ embed: true, embedDomains: null })}
          settingSurvey={settingSurvey}
          projectId="p1"
          isPublished
          onEmbedChange={jest.fn()}
        />
      </MemoryRouter>,
    )
    expect(screen.getByText('Any website')).toBeInTheDocument()
    unmount()

    renderCard(makeSurvey({ embed: true, embedDomains: ['a.com', '*'] }))
    expect(screen.getByText('Any website')).toBeInTheDocument()
  })

  test('shows the allowed websites read-only, with a link to change them in settings', () => {
    renderCard(makeSurvey({ embed: true, embedDomains: ['a.com', 'b.com'] }))

    expect(screen.getByText('a.com, b.com')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Access Control settings/ }),
    ).toHaveAttribute('href', '/survey/s1/setting/access')
  })

  test('disables copy until the survey is published', () => {
    renderCard(makeSurvey({ embed: true }), { isPublished: false })

    // Button renders aria-disabled (not the native attribute) so tooltips still show
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
    buttons.forEach((button) =>
      expect(button).toHaveAttribute('aria-disabled', 'true'),
    )
  })
})
