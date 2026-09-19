import { useEffect, useCallback } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router-dom'
import type { Location, NavigationType } from 'react-router-dom'

type BlockerArgs = {
  currentLocation: Location
  nextLocation: Location
  historyAction: NavigationType
}

export function usePreventNavigationWhileSaving(
  isSaving: boolean,
  onNavigationAttempt: (resumeNavigation: () => void) => void,
): void {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    e.preventDefault()
    return (e.returnValue = 'Your data is still saving. Please wait...')
  }

  useBeforeUnload(isSaving ? handleBeforeUnload : () => {})

  const blocker = useCallback(
    ({ nextLocation, historyAction }: BlockerArgs) => {
      onNavigationAttempt(() => {
        // We can't directly retry the navigation, so we'll have to use window.history
        if (historyAction === 'PUSH') {
          window.history.pushState(null, '', nextLocation.pathname)
        } else if (historyAction === 'REPLACE') {
          window.history.replaceState(null, '', nextLocation.pathname)
        } else if (historyAction === 'POP') {
          window.history.back()
        }
      })
      return true // Block the navigation
    },
    [onNavigationAttempt],
  )

  const shouldBlock = useCallback(
    (args: BlockerArgs) => {
      if (!isSaving) return false
      return blocker(args)
    },
    [isSaving, blocker],
  )

  useBlocker(shouldBlock)

  useEffect(() => {
    if (!isSaving) return

    const handleInternalNavigation = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      onNavigationAttempt(() => {
        window.removeEventListener('beforeunload', handleInternalNavigation)
      })
      return ''
    }

    window.addEventListener('beforeunload', handleInternalNavigation)
    return () =>
      window.removeEventListener('beforeunload', handleInternalNavigation)
  }, [isSaving, onNavigationAttempt])
}
