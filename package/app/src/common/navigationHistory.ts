import { useEffect } from 'react'
import {
  NavigationType,
  useLocation,
  useNavigationType,
} from 'react-router-dom'

const NAV_HISTORY_STORAGE_KEY = 'veysur.navHistoryStack'

// Module-level (not component-level) on purpose: the layout component that
// calls useTrackNavigationHistory() is remounted fresh on every route change
// (each page renders its own layout instance rather than sharing one via
// <Outlet>), so a ref inside the hook would reset on every navigation. A
// module-scoped variable persists for the lifetime of the tab's JS context,
// which is exactly the "have we tracked anything yet this session" signal
// this needs — it only resets on a real full-page load/reload.
let lastTrackedKey: string | null = null

function readStack(): string[] {
  try {
    const raw = window.sessionStorage.getItem(NAV_HISTORY_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function writeStack(stack: string[]): void {
  try {
    window.sessionStorage.setItem(
      NAV_HISTORY_STORAGE_KEY,
      JSON.stringify(stack),
    )
  } catch {
    // sessionStorage unavailable (e.g. private browsing) — fall back silently,
    // hasInAppBackHistory() will just always report false
  }
}

/**
 * Tracks in-app route changes in a sessionStorage-backed stack so BackButton
 * can tell whether there is a real predecessor page to return to. Needed
 * because document.referrer only reflects the browser's original full-page
 * load and never updates on React Router's client-side navigations.
 */
export function useTrackNavigationHistory(): void {
  const location = useLocation()
  const navigationType = useNavigationType()
  const currentKey = location.pathname + location.search

  useEffect(() => {
    if (lastTrackedKey === currentKey) {
      return
    }
    const isFirstRun = lastTrackedKey === null
    lastTrackedKey = currentKey

    const stack = readStack()
    if (isFirstRun) {
      // React Router reports Pop as the action for the initial location of a
      // freshly created history, not a real back navigation — establish the
      // base entry rather than popping a stack that hasn't started yet.
      stack.push(currentKey)
    } else if (navigationType === NavigationType.Pop) {
      stack.pop()
    } else if (navigationType === NavigationType.Replace) {
      stack[stack.length - 1] = currentKey
    } else {
      stack.push(currentKey)
    }
    writeStack(stack)
  }, [currentKey, navigationType])
}

/**
 * Whether there is a previous in-app page (from this tab's session) to
 * navigate back to, as opposed to a fresh tab / direct deep link.
 */
export function hasInAppBackHistory(): boolean {
  return readStack().length > 1
}
