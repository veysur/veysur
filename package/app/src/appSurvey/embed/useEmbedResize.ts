import { useEffect } from 'react'

export const EMBED_RESIZE_MESSAGE = 'veysur:embed:resize'

// Tells the loader on the host page how tall the content is. Measures the app
// root, not the document: an iframe document is never shorter than the iframe.
export function useEmbedResize(surveyId: string) {
  useEffect(() => {
    const target = document.getElementById('root') ?? document.body

    const post = () =>
      window.parent.postMessage(
        {
          type: EMBED_RESIZE_MESSAGE,
          surveyId,
          height: Math.ceil(target.getBoundingClientRect().height),
        },
        '*',
      )

    const observer = new ResizeObserver(post)
    observer.observe(target)
    post()

    return () => observer.disconnect()
  }, [surveyId])
}
