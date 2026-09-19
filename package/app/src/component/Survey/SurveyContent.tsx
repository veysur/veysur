import React, { useMemo } from 'react'
import { renderContentToSafeHtml, ContentFormat } from 'veysur-common'

type Props = {
  raw: string | null | undefined
  format: ContentFormat
  scriptTagsAllowed?: boolean
  className?: string
  /** Renders a `<span>` instead of a `<div>` for html/markdown formats -
   * needed wherever the call site nests this inside another inline element
   * (e.g. a `<Label>`). 'plain' format always renders a `<span>`. */
  inline?: boolean
}

// Single render entry point for every in-scope content field (question
// text/detail, group description, welcome/thank-you messages, legal notice
// and data policy text). Resolves the same effective format/sanitization
// settings server-side publish validation enforces (see
// `renderContentToSafeHtml` in veysur-common), so client render and server
// validation can never drift.
export const SurveyContent: React.FC<Props> = ({
  raw,
  format,
  scriptTagsAllowed = false,
  className,
  inline = false,
}) => {
  const safeContent = useMemo(
    () => renderContentToSafeHtml(raw ?? '', { format, scriptTagsAllowed }),
    [raw, format, scriptTagsAllowed],
  )

  if (format === 'plain') {
    // React text content is escaped automatically - render as plain text,
    // never markup.
    return <span className={className}>{raw ?? ''}</span>
  }

  const Tag = inline ? 'span' : 'div'
  return (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{ __html: safeContent }}
    />
  )
}
