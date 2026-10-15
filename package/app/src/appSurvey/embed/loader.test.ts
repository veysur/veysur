import { readFileSync } from 'fs'
import { join } from 'path'

const source = readFileSync(
  join(__dirname, '../../../public/embed/loader.js'),
  'utf8',
)

const ORIGIN = 'https://survey.example'

// The loader reads document.currentScript, so run it as the body of a script
// element that is attached to the document.
function runLoader(attributes: Record<string, string>) {
  const script = document.createElement('script')
  script.src = `${ORIGIN}/embed/loader.js`
  Object.entries(attributes).forEach(([key, value]) =>
    script.setAttribute(key, value),
  )
  document.body.appendChild(script)
  Object.defineProperty(document, 'currentScript', {
    value: script,
    configurable: true,
  })
  new Function(source)()
  Object.defineProperty(document, 'currentScript', {
    value: null,
    configurable: true,
  })
  return script
}

const postFromIframe = (
  iframe: HTMLIFrameElement,
  data: unknown,
  origin = ORIGIN,
  source: Window | null = iframe.contentWindow,
) => window.dispatchEvent(new MessageEvent('message', { data, origin, source }))

describe('embed loader', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  test('inserts a lazy iframe after the script, pointing at the survey', () => {
    const script = runLoader({ 'data-survey': 'p1/s1', 'data-lang': 'de' })
    const iframe = script.nextElementSibling as HTMLIFrameElement

    expect(iframe.tagName).toBe('IFRAME')
    expect(iframe.src).toBe(`${ORIGIN}/embed/p1/s1?lang=de`)
    expect(iframe.loading).toBe('lazy')
    expect(iframe.referrerPolicy).toBe('origin')
    expect(iframe.title).toBe('Survey')
  })

  test('omits the language parameter when none is given', () => {
    const script = runLoader({ 'data-survey': 'p1/s1' })

    expect((script.nextElementSibling as HTMLIFrameElement).src).toBe(
      `${ORIGIN}/embed/p1/s1`,
    )
  })

  test('is light by default and dark when asked', () => {
    const light = runLoader({ 'data-survey': 'p1/s1' })
    const dark = runLoader({ 'data-survey': 'p1/s1', 'data-theme': 'dark' })

    expect((light.nextElementSibling as HTMLIFrameElement).src).toBe(
      `${ORIGIN}/embed/p1/s1`,
    )
    expect((dark.nextElementSibling as HTMLIFrameElement).src).toBe(
      `${ORIGIN}/embed/p1/s1?theme=dark`,
    )
  })

  test('setTheme posts the new theme to the iframe, once per change', () => {
    const script = runLoader({ 'data-survey': 'p1/s1' })
    const iframe = script.nextElementSibling as HTMLIFrameElement
    const postMessage = jest.fn()
    Object.defineProperty(iframe, 'contentWindow', {
      value: { postMessage },
      configurable: true,
    })

    const embed = (
      window as unknown as {
        VeySurEmbed: { setTheme: (theme: string) => void }
      }
    ).VeySurEmbed
    embed.setTheme('dark')
    embed.setTheme('dark')

    expect(postMessage).toHaveBeenCalledTimes(1)
    expect(postMessage).toHaveBeenCalledWith(
      { type: 'veysur:embed:theme', theme: 'dark' },
      ORIGIN,
    )
  })

  describe('data-lazy', () => {
    type Entry = { isIntersecting: boolean }
    let trigger: (entries: Entry[]) => void
    const disconnect = jest.fn()
    const original = (window as { IntersectionObserver?: unknown })
      .IntersectionObserver

    beforeEach(() => {
      disconnect.mockClear()
      ;(
        window as unknown as { IntersectionObserver: unknown }
      ).IntersectionObserver = jest.fn(
        (callback: (entries: Entry[]) => void) => {
          trigger = callback
          return { observe: jest.fn(), disconnect }
        },
      )
    })

    afterEach(() => {
      ;(
        window as unknown as { IntersectionObserver: unknown }
      ).IntersectionObserver = original
    })

    test('holds the src back until the iframe nears the viewport', () => {
      const script = runLoader({ 'data-survey': 'p1/s1', 'data-lazy': '' })
      const iframe = script.nextElementSibling as HTMLIFrameElement
      expect(iframe.getAttribute('src')).toBeNull()

      trigger([{ isIntersecting: false }])
      expect(iframe.getAttribute('src')).toBeNull()

      trigger([{ isIntersecting: true }])
      expect(iframe.src).toBe(`${ORIGIN}/embed/p1/s1`)
      expect(disconnect).toHaveBeenCalled()
    })

    test('uses the theme in force when it loads', () => {
      const script = runLoader({ 'data-survey': 'p1/s1', 'data-lazy': '' })
      const iframe = script.nextElementSibling as HTMLIFrameElement
      ;(
        window as unknown as { VeySurEmbed: { setTheme: (t: string) => void } }
      ).VeySurEmbed.setTheme('dark')

      trigger([{ isIntersecting: true }])

      expect(iframe.src).toBe(`${ORIGIN}/embed/p1/s1?theme=dark`)
    })

    test('loads at once when IntersectionObserver is unavailable', () => {
      delete (window as { IntersectionObserver?: unknown }).IntersectionObserver
      const script = runLoader({ 'data-survey': 'p1/s1', 'data-lazy': '' })

      expect((script.nextElementSibling as HTMLIFrameElement).src).toBe(
        `${ORIGIN}/embed/p1/s1`,
      )
    })
  })

  test.each(['', 'p1', 'p1/s1/extra', '../etc/passwd', 'p1/s1"onload="x'])(
    'inserts nothing for the survey attribute %p',
    (value) => {
      const script = runLoader({ 'data-survey': value })

      expect(script.nextElementSibling).toBeNull()
    },
  )

  test('resizes the iframe from messages sent by that iframe', () => {
    const script = runLoader({ 'data-survey': 'p1/s1' })
    const iframe = script.nextElementSibling as HTMLIFrameElement

    postFromIframe(iframe, { type: 'veysur:embed:resize', height: 733.2 })

    expect(iframe.style.height).toBe('734px')
  })

  test('ignores resize messages from another origin, another window or with another type', () => {
    const script = runLoader({ 'data-survey': 'p1/s1' })
    const iframe = script.nextElementSibling as HTMLIFrameElement
    const before = iframe.style.height

    postFromIframe(
      iframe,
      { type: 'veysur:embed:resize', height: 900 },
      'https://evil.example',
    )
    postFromIframe(
      iframe,
      { type: 'veysur:embed:resize', height: 900 },
      ORIGIN,
      window,
    )
    postFromIframe(iframe, { type: 'other', height: 900 })
    postFromIframe(iframe, { type: 'veysur:embed:resize', height: '900' })

    expect(iframe.style.height).toBe(before)
  })
})
