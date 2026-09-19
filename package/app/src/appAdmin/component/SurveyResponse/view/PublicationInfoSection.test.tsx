import { render, screen } from '@testing-library/react'

import { Accordion } from 'component/shadcn/accordion'

jest.mock('appAdmin/hook', () => ({
  ...jest.requireActual('appAdmin/hook'),
  useDisplayTimezone: () => 'UTC',
}))

import { PublicationInfoSection } from './PublicationInfoSection'

const renderSection = (
  notes: string | null | undefined,
): ReturnType<typeof render> =>
  render(
    <Accordion type="single" defaultValue="publication">
      <PublicationInfoSection publication={{ _id: 'pub-1', notes }} />
    </Accordion>,
  )

describe('PublicationInfoSection', () => {
  it('renders HTML notes as markup, not escaped text', () => {
    renderSection('<strong>bold notes</strong>')

    const strong = screen.getByText('bold notes')
    expect(strong.tagName).toBe('STRONG')
  })

  it('strips disallowed script content from notes', () => {
    renderSection('<img src="x" onerror="alert(1)"><script>alert(1)</script>')

    expect(document.querySelector('script')).not.toBeInTheDocument()
    expect(document.querySelector('img')?.getAttribute('onerror')).toBeNull()
  })

  it('renders nothing for the notes section when notes is absent', () => {
    renderSection(null)

    expect(screen.queryByText('Notes')).not.toBeInTheDocument()
  })
})
