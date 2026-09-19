// cspell:ignore youtu nocookie
import React, { useMemo } from 'react'
import {
  SurveyContent as SurveyContentModel,
  ExpressionContext,
  CONTENT_TYPE_TEXT,
  CONTENT_TYPE_YOUTUBE,
  parseYoutubeUrl,
  resolveTextExpressions,
  expressionEscapeForContentFormat,
} from 'veysur-common'

import { SurveyContent } from './SurveyContent'
import { SurveyContentFormatConfig } from './SurveyTypes'

type Props = {
  element: SurveyContentModel
  contentFormat: SurveyContentFormatConfig
  lang: string
  langDefault: string
  /**
   * Builds the `{{...}}` expression context for a content element, scoped to
   * only the questions before it in survey order — mirrors
   * `SurveyQuestionRenderer`. Owned by `Survey.tsx`.
   */
  getExpressionContext: (elementId: string) => ExpressionContext
}

export const SurveyContentRenderer: React.FC<Props> = ({
  element,
  contentFormat,
  lang,
  langDefault,
  getExpressionContext,
}) => {
  const expressionContext = useMemo(
    () => getExpressionContext(element._id),
    [getExpressionContext, element._id],
  )

  const rawText = element.text?.getLang(lang, langDefault) ?? ''
  const resolvedText = resolveTextExpressions(rawText, expressionContext, {
    escape: expressionEscapeForContentFormat(contentFormat.format),
  })

  if (element.type === CONTENT_TYPE_TEXT) {
    return (
      <SurveyContent
        raw={resolvedText}
        format={contentFormat.format}
        scriptTagsAllowed={contentFormat.scriptTagsAllowed}
        className="survey-content html-content"
      />
    )
  }

  if (element.type === CONTENT_TYPE_YOUTUBE) {
    const youtube = element.config?.youtube ?? null
    const parsed =
      youtube?.videoId && /^[\w-]{11}$/.test(youtube.videoId)
        ? { videoId: youtube.videoId, startAt: youtube.startAt ?? null }
        : parseYoutubeUrl(youtube?.url)
    if (!parsed) return null

    const src =
      `https://www.youtube-nocookie.com/embed/${encodeURIComponent(parsed.videoId)}` +
      (parsed.startAt ? `?start=${Math.floor(parsed.startAt)}` : '')
    const caption = rawText.trim()

    return (
      <div className="survey-content survey-content-youtube">
        <div
          className="relative w-full overflow-hidden rounded-md bg-muted"
          style={{ aspectRatio: '16 / 9' }}
        >
          {/*
            `allow-scripts` + `allow-same-origin` together are only safe because
            the framed document is served from youtube-nocookie.com, a different
            origin to the participant survey — the iframe cannot script this page.
          */}
          <iframe
            className="absolute inset-0 h-full w-full border-0"
            src={src}
            title={caption || 'YouTube video'}
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
            allow="fullscreen; picture-in-picture; encrypted-media"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        {caption && (
          <div className="mt-2 text-xs text-muted-foreground">
            <SurveyContent
              raw={resolvedText}
              format={contentFormat.format}
              scriptTagsAllowed={contentFormat.scriptTagsAllowed}
              inline
            />
          </div>
        )}
      </div>
    )
  }

  return null
}
