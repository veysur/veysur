// cspell:ignore youtu nocookie
import { act, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SurveyContent, ExpressionContextBuilder } from 'veysur-common'

import { SurveyContentRenderer } from './SurveyContentRenderer'
import { allowConsole } from '../../../tests/consoleGuard'
import type { SurveyContentFormatConfig } from './SurveyTypes'

const contentFormat: SurveyContentFormatConfig = {
  format: 'markdown',
  scriptTagsAllowed: false,
}

const emptyContext = () =>
  ExpressionContextBuilder.build({}, [], [], { language: 'en' })

// The content type components are lazy, so flush their dynamic import.
const renderElement = async (
  element: SurveyContent,
  getExpressionContext = () => emptyContext(),
) => {
  let result!: ReturnType<typeof render>
  await act(async () => {
    result = render(
      <SurveyContentRenderer
        element={element}
        contentFormat={contentFormat}
        lang="en"
        langDefault="en"
        getExpressionContext={getExpressionContext}
      />,
    )
  })
  return result
}

describe('SurveyContentRenderer', () => {
  it('renders contentText as sanitised HTML with no script tags', async () => {
    const element = new SurveyContent({
      _id: 'c1',
      code: 'C001',
      type: 'contentText',
      text: { en: '**bold** <script>alert(1)</script> text' },
    })

    const { container } = await renderElement(element)

    expect(screen.getByText('bold')).toBeInTheDocument()
    expect(container.querySelector('script')).toBeNull()
  })

  it('resolves {{answers.*}} expressions in contentText', async () => {
    const element = new SurveyContent({
      _id: 'c1',
      code: 'C001',
      type: 'contentText',
      text: { en: 'You picked {{answers.Q1}}.' },
    })
    const getExpressionContext = () =>
      ExpressionContextBuilder.build(
        {},
        [{ questionCode: 'Q1', value: 'blue' }],
        [{ code: 'Q1', type: 'text', position: 0, text: 'Colour' }],
        { language: 'en' },
      )

    await renderElement(element, getExpressionContext)

    expect(screen.getByText('You picked blue.')).toBeInTheDocument()
  })

  it('renders a youtube-nocookie iframe from config.youtube.videoId', async () => {
    const element = new SurveyContent({
      _id: 'c1',
      code: 'C001',
      type: 'contentVideoYoutube',
      config: { youtube: { videoId: 'dQw4w9WgXcQ', startAt: 30 } },
    })

    const { container } = await renderElement(element)
    const iframe = container.querySelector('iframe')

    expect(iframe).not.toBeNull()
    expect(iframe?.getAttribute('src')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=30',
    )
    expect(iframe?.getAttribute('sandbox')).toContain('allow-scripts')
    expect(container.querySelector('script')).toBeNull()
  })

  it('falls back to parsing config.youtube.url when no videoId is set', async () => {
    const element = new SurveyContent({
      _id: 'c1',
      code: 'C001',
      type: 'contentVideoYoutube',
      config: { youtube: { url: 'https://youtu.be/dQw4w9WgXcQ' } },
    })

    const iframe = (await renderElement(element)).container.querySelector(
      'iframe',
    )
    expect(iframe?.getAttribute('src')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    )
  })

  it('renders nothing for a youtube element with no resolvable video', async () => {
    const element = new SurveyContent({
      _id: 'c1',
      code: 'C001',
      type: 'contentVideoYoutube',
      config: { youtube: { url: 'not a url' } },
    })

    expect((await renderElement(element)).container).toBeEmptyDOMElement()
  })

  it('renders a caption below the youtube iframe', async () => {
    const element = new SurveyContent({
      _id: 'c1',
      code: 'C001',
      type: 'contentVideoYoutube',
      text: { en: 'Watch this first' },
      config: { youtube: { videoId: 'dQw4w9WgXcQ' } },
    })

    await renderElement(element)
    expect(screen.getByText('Watch this first')).toBeInTheDocument()
  })

  it('renders nothing for an unknown content type', async () => {
    const element = new SurveyContent({
      _id: 'c1',
      code: 'C001',
      type: 'contentSomethingElse',
      text: { en: 'x' },
    })

    const { container } = await allowConsole(
      /No component found for content type/,
      () => renderElement(element),
    )

    expect(container).toBeEmptyDOMElement()
  })
})
