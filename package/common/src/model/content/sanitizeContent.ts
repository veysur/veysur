import sanitizeHtml from 'sanitize-html'

export interface SanitizeContentOptions {
  // Deliberately dangerous opt-in: allows <script> tags through the
  // sanitizer. Only ever set from `SettingSurvey.contentFormat.scriptTagsAllowed`
  // (or a survey-level override), and only reachable when an admin has
  // explicitly turned it on for their own project/survey. This is a
  // trusted-author escape hatch, not a default-safe feature - never default
  // it to true, and never derive it from anything other than that setting.
  scriptTagsAllowed?: boolean
}

const BASE_ALLOWED_TAGS = [
  'p',
  'br',
  'hr',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'sub',
  'sup',
  'a',
  'span',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'code',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'img',
]

const BASE_ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height'],
  span: ['class'],
  '*': ['class'],
}

// Schemes that must always be stripped, regardless of scriptTagsAllowed -
// these enable script execution via markup that isn't a <script> tag
// (e.g. an <a href="javascript:...">).
const ALLOWED_SCHEMES = ['http', 'https', 'mailto', 'tel']

export function sanitizeContent(
  raw: string,
  options: SanitizeContentOptions = {},
): string {
  const { scriptTagsAllowed = false } = options

  const allowedTags = scriptTagsAllowed
    ? [...BASE_ALLOWED_TAGS, 'script']
    : BASE_ALLOWED_TAGS

  return sanitizeHtml(raw, {
    allowedTags,
    allowedAttributes: BASE_ALLOWED_ATTRIBUTES,
    allowedSchemes: ALLOWED_SCHEMES,
    allowVulnerableTags: scriptTagsAllowed,
    disallowedTagsMode: 'discard',
  })
}
