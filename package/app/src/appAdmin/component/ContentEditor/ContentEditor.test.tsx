import { render, waitFor, fireEvent, screen } from '@testing-library/react'

import { ContentEditor } from './ContentEditor'
import { EMAIL_PREVIEW_CONTENT_CLASS } from './emailPreviewCss'

// jsdom has no DOMRect - needed so the bubble-menu toolbar's floating-ui
// positioning (TiptapToolbar's getBoundingClientRect) doesn't throw once the
// editor is focused (BubbleMenu only renders its content when focused).
class FakeDOMRect {
  constructor(
    public x = 0,
    public y = 0,
    public width = 0,
    public height = 0,
  ) {}
  get top() {
    return this.y
  }
  get left() {
    return this.x
  }
  get right() {
    return this.x + this.width
  }
  get bottom() {
    return this.y + this.height
  }
  toJSON() {
    return this
  }
}
// @ts-expect-error - test-only jsdom polyfill, not the full DOMRect surface
global.DOMRect = FakeDOMRect

const getEditorContent = (): HTMLElement | null =>
  document.querySelector('.tiptap-editor-content')

describe('ContentEditor', () => {
  it('preserves inline color and link class through a content round-trip', async () => {
    const buttonHtml =
      '<p><a href="https://x.test/survey" class="btn"><span style="color:#ffffff">Start Survey</span></a></p>'

    const { rerender } = render(<ContentEditor value="" onChange={jest.fn()} />)
    rerender(<ContentEditor value={buttonHtml} onChange={jest.fn()} />)

    await waitFor(() => {
      const html = getEditorContent()?.innerHTML ?? ''
      // jsdom normalizes `#ffffff` to `rgb(255, 255, 255)` when parsing the
      // style attribute — the colour itself, not the string format, is what
      // matters here.
      expect(html).toContain('style="color: rgb(255, 255, 255);"')
      expect(html).toContain('class="btn"')
    })
  })

  it('preserves basic inline styles not covered by a dedicated mark (text-decoration)', async () => {
    const styledHtml =
      '<p><span style="text-decoration:underline">Styled</span></p>'

    const { rerender } = render(<ContentEditor value="" onChange={jest.fn()} />)
    rerender(<ContentEditor value={styledHtml} onChange={jest.fn()} />)

    await waitFor(() => {
      const html = getEditorContent()?.innerHTML ?? ''
      expect(html).toContain('text-decoration: underline')
    })
  })

  it('strips inline styles containing unsafe CSS injection patterns', async () => {
    const unsafeHtml =
      '<p><span style="color:red;background:url(javascript:alert(1))">Bad</span></p>'

    const { rerender } = render(<ContentEditor value="" onChange={jest.fn()} />)
    rerender(<ContentEditor value={unsafeHtml} onChange={jest.fn()} />)

    await waitFor(() => {
      const html = getEditorContent()?.innerHTML ?? ''
      expect(html).toContain('Bad')
      expect(html).not.toContain('style=')
    })
  })

  it('leaves an inserted link without a class using the default fallback styling', async () => {
    const linkHtml = '<p><a href="https://x.test">Plain link</a></p>'

    const { rerender } = render(<ContentEditor value="" onChange={jest.fn()} />)
    rerender(<ContentEditor value={linkHtml} onChange={jest.fn()} />)

    await waitFor(() => {
      const html = getEditorContent()?.innerHTML ?? ''
      expect(html).toContain('class="text-primary underline"')
    })
  })

  it('applies the email preview class and scoped stylesheet only when emailPreview is set', async () => {
    const { rerender, container } = render(
      <ContentEditor value="" onChange={jest.fn()} />,
    )

    await waitFor(() => expect(getEditorContent()).toBeTruthy())
    expect(getEditorContent()).not.toHaveClass(EMAIL_PREVIEW_CONTENT_CLASS)
    expect(container.querySelector('style')).not.toBeInTheDocument()

    rerender(
      <ContentEditor value="" onChange={jest.fn()} emailPreview={true} />,
    )

    await waitFor(() => {
      expect(getEditorContent()).toHaveClass(EMAIL_PREVIEW_CONTENT_CLASS)
      expect(container.querySelector('style')?.textContent).toContain('.btn')
    })
  })

  it('round-trips bold text unchanged', async () => {
    const boldHtml = '<p><strong>bold</strong></p>'

    const { rerender } = render(<ContentEditor value="" onChange={jest.fn()} />)
    rerender(<ContentEditor value={boldHtml} onChange={jest.fn()} />)

    await waitFor(() => {
      const html = getEditorContent()?.innerHTML ?? ''
      expect(html).toContain('<strong>bold</strong>')
    })
  })

  it('renders a pill decoration around an expression token when variablePickerGroups is provided', async () => {
    const exprHtml = '<p>Hi {{participant.nameFirst}}</p>'

    const { rerender } = render(
      <ContentEditor
        value=""
        onChange={jest.fn()}
        withToolbar={true}
        variablePickerGroups={[]}
      />,
    )
    rerender(
      <ContentEditor
        value={exprHtml}
        onChange={jest.fn()}
        withToolbar={true}
        variablePickerGroups={[]}
      />,
    )

    await waitFor(() => {
      const html = getEditorContent()?.innerHTML ?? ''
      expect(html).toContain('{{participant.nameFirst}}')
      expect(
        getEditorContent()?.querySelector('span[class*="rounded-full"]'),
      ).not.toBeNull()
    })
  })

  it('does not decorate an expression token when variablePickerGroups is not provided', async () => {
    const exprHtml = '<p>Hi {{participant.nameFirst}}</p>'

    const { rerender } = render(<ContentEditor value="" onChange={jest.fn()} />)
    rerender(<ContentEditor value={exprHtml} onChange={jest.fn()} />)

    await waitFor(() => {
      const html = getEditorContent()?.innerHTML ?? ''
      expect(html).toContain('{{participant.nameFirst}}')
      expect(
        getEditorContent()?.querySelector('span[class*="rounded-full"]'),
      ).toBeNull()
    })
  })

  describe('format="plain"', () => {
    it('renders no TipTap rich-edit surface, only a plain textarea', () => {
      const { container } = render(
        <ContentEditor value="hello" format="plain" onChange={jest.fn()} />,
      )

      expect(getEditorContent()).toBeNull()
      const textarea = container.querySelector('textarea')
      expect(textarea).not.toBeNull()
      expect(textarea?.value).toBe('hello')
    })

    it('does not render a toolbar even when withToolbar is true', () => {
      const { container } = render(
        <ContentEditor
          value="hello"
          format="plain"
          withToolbar={true}
          onChange={jest.fn()}
        />,
      )

      expect(container.querySelector('.tiptap-bubble-menu')).toBeNull()
    })

    it('reports plain text changes verbatim via onChange (no HTML interpretation)', () => {
      const onChange = jest.fn()
      const { container } = render(
        <ContentEditor value="" format="plain" onChange={onChange} />,
      )
      const textarea = container.querySelector(
        'textarea',
      ) as HTMLTextAreaElement

      fireEvent.change(textarea, { target: { value: '<b>not html</b>' } })

      expect(onChange).toHaveBeenCalledWith('<b>not html</b>')
    })
  })

  describe('format="markdown"', () => {
    it('renders markdown source as formatted HTML', async () => {
      const { rerender } = render(
        <ContentEditor value="" format="markdown" onChange={jest.fn()} />,
      )
      rerender(
        <ContentEditor
          value="**bold** and a [link](https://example.com)"
          format="markdown"
          onChange={jest.fn()}
        />,
      )

      await waitFor(() => {
        const html = getEditorContent()?.innerHTML ?? ''
        expect(html).toContain('<strong>bold</strong>')
        expect(html).toContain('href="https://example.com"')
      })
    })

    // The bubble-menu toolbar renders into a portal appended to
    // `document.body` (see getBubbleMenuPortalRoot), outside RTL's own
    // `container` - query via `document`, not `container`.
    it('shows "Edit Markdown Source" (not "Edit HTML Source") in the toolbar', async () => {
      const { rerender } = render(
        <ContentEditor
          value=""
          format="markdown"
          withToolbar={true}
          onChange={jest.fn()}
        />,
      )
      rerender(
        <ContentEditor
          value="text"
          format="markdown"
          withToolbar={true}
          onChange={jest.fn()}
        />,
      )

      await waitFor(() => {
        expect(getEditorContent()).not.toBeNull()
      })
      fireEvent.focus(getEditorContent() as HTMLElement)

      await waitFor(() => {
        expect(
          document.querySelector('[title="Edit Markdown Source"]'),
        ).not.toBeNull()
      })
      expect(document.querySelector('[title="Edit HTML Source"]')).toBeNull()
    })

    it('opens a markdown source editor with the raw markdown value', async () => {
      const { rerender } = render(
        <ContentEditor
          value=""
          format="markdown"
          withToolbar={true}
          onChange={jest.fn()}
        />,
      )
      rerender(
        <ContentEditor
          value="**bold**"
          format="markdown"
          withToolbar={true}
          onChange={jest.fn()}
        />,
      )

      await waitFor(() => {
        expect(getEditorContent()).not.toBeNull()
      })
      fireEvent.focus(getEditorContent() as HTMLElement)
      // The bubble menu's floating-ui positioning schedules its first
      // measurement via a timer; fake timers (enabled globally in this
      // suite) never auto-advance, so without this the menu never mounts
      // and the wait below hangs until the test timeout.
      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(
          document.querySelector('[title="Edit Markdown Source"]'),
        ).not.toBeNull()
      })
      fireEvent.click(
        document.querySelector('[title="Edit Markdown Source"]') as HTMLElement,
      )

      await waitFor(() => {
        expect(screen.getByText('Edit Markdown')).toBeInTheDocument()
      })
    })
  })

  // format="html" (the default) behaviour is unchanged - covered by every
  // other test in this file, none of which pass a `format` prop.
})
