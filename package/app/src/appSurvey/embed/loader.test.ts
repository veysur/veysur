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
