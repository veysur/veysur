import { lazy } from 'react'
import { CONTENT_TYPE_TEXT, CONTENT_TYPE_YOUTUBE } from 'veysur-common'

const contentTypeEditRegistry = {
  [CONTENT_TYPE_TEXT]: lazy(() =>
    import('./ContentTextEdit').then((m) => ({ default: m.ContentTextEdit })),
  ),
  [CONTENT_TYPE_YOUTUBE]: lazy(() =>
    import('./ContentVideoYoutubeEdit').then((m) => ({
      default: m.ContentVideoYoutubeEdit,
    })),
  ),
}

export const getContentTypeEditByName = (name: string) => {
  const component =
    contentTypeEditRegistry[name as keyof typeof contentTypeEditRegistry]
  if (!component) {
    console.warn(`No edit component found for content type "${name}"`)
  }
  return component
}
