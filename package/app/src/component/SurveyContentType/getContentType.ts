import { lazy } from 'react'

import { CONTENT_TYPE_TEXT, CONTENT_TYPE_YOUTUBE } from 'veysur-common'

const contentTypeRegistry = {
  [CONTENT_TYPE_TEXT]: lazy(() =>
    import('./ContentText').then((m) => ({ default: m.ContentText })),
  ),
  [CONTENT_TYPE_YOUTUBE]: lazy(() =>
    import('./ContentVideoYoutube').then((m) => ({
      default: m.ContentVideoYoutube,
    })),
  ),
}

export const getContentTypeByName = (name: string) => {
  const component =
    contentTypeRegistry[name as keyof typeof contentTypeRegistry]
  if (!component) {
    console.warn(`No component found for content type "${name}"`)
  }
  return component
}
