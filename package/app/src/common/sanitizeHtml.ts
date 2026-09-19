import DOMPurify from 'dompurify'

// Superseded by veysur-common's `renderContentToSafeHtml`/`sanitizeContent`
// for every in-scope survey content field (question text/detail, group
// description, welcome/thank-you messages, legal notice/data policy text) -
// see `component/Survey/SurveyContent.tsx`. This remains only for content
// genuinely out of that scope (e.g. plain `l10n`/title/code fields, admin
// snapshot/publication views) - avoid adding new in-scope call sites here.
export const sanitizeHtml = (html: string | null | undefined): string =>
  html ? DOMPurify.sanitize(html) : ''
