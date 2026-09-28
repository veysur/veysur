// cspell:ignore noopener noreferrer
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

// Links in survey content must always open in a new window/tab - a
// participant (or admin, in preview) following a link must never navigate
// away from the survey. Enforced here, not just at authoring time in
// ContentEditor, because content can also arrive via .vsst/.vssa import.
function forceSafeLinkAttribs(
  tagName: string,
  attribs: sanitizeHtml.Attributes,
): sanitizeHtml.Tag {
  const existingRelTokens = (attribs.rel ?? '').split(/\s+/).filter(Boolean)
  const relTokens = new Set([...existingRelTokens, 'noopener', 'noreferrer'])

  return {
    tagName,
    attribs: {
      ...attribs,
      target: '_blank',
      rel: Array.from(relTokens).join(' '),
    },
  }
}

// Applies the same forced target/rel link normalization as `sanitizeContent`,
// without discarding any tags/attributes. Used by content-format validation
// to compare "would sanitizing remove anything?" without the always-applied
// link-safety rewrite (see forceSafeLinkAttribs above) itself registering as
// a removal - a link is not disallowed markup.
export function normalizeSafeLinks(raw: string): string {
  return sanitizeHtml(raw, {
    allowedTags: false,
    allowedAttributes: false,
    allowVulnerableTags: true,
    transformTags: { a: forceSafeLinkAttribs },
  })
}

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
    transformTags: { a: forceSafeLinkAttribs },
  })
}
