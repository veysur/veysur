import { lazy } from 'react'

const RELOAD_KEY = 'veysur.chunk-reload-attempted'

function isChunkLoadError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'ChunkLoadError' ||
      error.message.includes('Loading chunk') ||
      error.message.includes('Failed to fetch dynamically imported module'))
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithChunkReload<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const module = await importFn()
      sessionStorage.removeItem(RELOAD_KEY)
      return module
    } catch (error) {
      if (isChunkLoadError(error) && !sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, 'true')
        window.location.reload()
        return new Promise(() => {}) as never
      }
      throw error
    }
  })
}
