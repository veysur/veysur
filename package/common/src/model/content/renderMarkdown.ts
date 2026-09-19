import MarkdownIt from 'markdown-it'

// `html: false` disables raw HTML passthrough at the parser level - this is
// the key defence that makes markdown mode safe even before sanitization
// runs. Any literal HTML in the markdown source (e.g. an embedded
// <script>/<img onerror=...>) is escaped as text, not parsed as markup.
const markdownIt = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

export function renderMarkdownToHtml(raw: string): string {
  return markdownIt.render(raw ?? '')
}
