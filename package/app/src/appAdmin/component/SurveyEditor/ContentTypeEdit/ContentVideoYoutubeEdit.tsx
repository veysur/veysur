// cspell:ignore youtu nocookie
import React, { useCallback } from 'react'
import { parseYoutubeUrl } from 'veysur-common'

import { Input } from 'component/shadcn/input'
import { Label } from 'component/shadcn/label'
import { ContentEditor } from 'appAdmin/component/ContentEditor'
import { FieldError } from 'component/Form'

import { useSurveyEditorStore } from '../hook'
import { ContentTypeEditProps } from './ContentTypeEditProps'
import { useContentTextEdit } from './useContentTextEdit'

export const ContentVideoYoutubeEdit: React.FC<ContentTypeEditProps> = ({
  element,
  onFocus,
}) => {
  const {
    langEditing,
    value,
    errors,
    onChange,
    variablePickerGroups,
    contentFormat,
  } = useContentTextEdit(element)
  const setContentConfig = useSurveyEditorStore(
    (state) => state.operations?.setContentConfig,
  )

  const youtube = element.config?.youtube ?? null
  const parsed = youtube?.url ? parseYoutubeUrl(youtube.url) : null
  const embedSrc = parsed
    ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
        parsed.videoId,
      )}` + (parsed.startAt ? `?start=${Math.floor(parsed.startAt)}` : '')
    : null

  // A URL that does not parse keeps the raw `url` with `videoId` cleared, so the
  // field shows an inline error instead of losing what was typed.
  const handleUrlChange = useCallback(
    (url: string) => {
      const next = parseYoutubeUrl(url)
      setContentConfig?.(element._id, {
        youtube: next
          ? { url, videoId: next.videoId, startAt: next.startAt }
          : { ...(element.config?.youtube ?? {}), url, videoId: undefined },
      })
    },
    [setContentConfig, element._id, element.config],
  )

  return (
    <div className="space-y-2">
      <div>
        <Label htmlFor={`yt-url-${element._id}`} className="text-sm">
          YouTube URL
        </Label>
        <Input
          id={`yt-url-${element._id}`}
          value={youtube?.url ?? ''}
          placeholder="https://www.youtube.com/watch?v=..."
          onFocus={onFocus}
          onChange={(e) => handleUrlChange(e.target.value)}
        />
        {youtube?.url && !parsed && (
          <FieldError
            errors={['That does not look like a YouTube video URL.']}
          />
        )}
      </div>
      {embedSrc && (
        <div
          className="relative w-full overflow-hidden rounded-md bg-muted"
          style={{ aspectRatio: '16 / 9' }}
        >
          <iframe
            className="absolute inset-0 h-full w-full border-0"
            src={embedSrc}
            title="YouTube preview"
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      )}
      <div>
        <Label className="text-sm">Caption (optional)</Label>
        <ContentEditor
          key={langEditing}
          value={value}
          variant="inline"
          placeholder="Caption shown below the video"
          withToolbar={true}
          format={contentFormat}
          variablePickerGroups={variablePickerGroups}
          onChange={onChange}
          onFocus={onFocus}
          onClick={onFocus}
          testId={`content-editor-${element._id}`}
        />
        <FieldError errors={errors} />
      </div>
    </div>
  )
}
