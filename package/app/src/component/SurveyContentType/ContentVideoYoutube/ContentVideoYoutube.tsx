// cspell:ignore nocookie
import React from 'react'
import { parseYoutubeUrl } from 'veysur-common'

import { SurveyContent } from '../../Survey/SurveyContent'
import { ContentTypeProps } from '../ContentTypeProps'

export const ContentVideoYoutube: React.FC<ContentTypeProps> = ({
  element,
  resolvedText,
  rawText,
  contentFormat,
}) => {
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
