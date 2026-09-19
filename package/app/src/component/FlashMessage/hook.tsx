import { useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

import { useFlashMessageStore, FlashMessageType } from './store'

export type SetFlashMessageFn = (
  type: FlashMessageType,
  message: string,
  options?: {
    title?: string
    duration?: number
  },
) => void

export type ShowFlashMessageFn = (
  type: FlashMessageType,
  message: string,
  options?: {
    title?: string
    duration?: number
    dedupKey?: string | number | boolean
  },
) => void

// Module-level tracking of recently shown messages to prevent duplicates
// Key is "type:message", value is timestamp when shown
const recentlyShownMessages = new Map<string, number>()

// Module-level tracking of messages shown with dedupKey
// Key is "type:message:dedupKey", stores the dedupKey value that was last shown
const shownDedupKeys = new Map<string, string | number | boolean>()

// Default toast duration in milliseconds
const DEFAULT_TOAST_DURATION = 4000

// Configuration to match StatusAlert styling
const VARIANT_CONFIG = {
  success: {
    icon: CheckCircle,
    classNames: { toast: 'toast-success' },
  },
  warning: {
    icon: AlertTriangle,
    classNames: { toast: 'toast-warning' },
  },
  error: {
    icon: AlertCircle,
    classNames: { toast: 'toast-error' },
  },
  info: {
    icon: Info,
    classNames: { toast: 'toast-info' },
  },
}

/**
 * Helper function to display a toast with the appropriate styling
 */
const displayToast = (
  type: FlashMessageType,
  message: string,
  options?: { title?: string; duration?: number },
) => {
  const config = VARIANT_CONFIG[type]
  const Icon = config.icon

  toast(message, {
    description: options?.title,
    duration: options?.duration,
    icon: <Icon size={20} />,
    classNames: config.classNames,
  })
}

/**
 * Hook to manage flash messages
 *
 * Usage:
 *
 * // To set a flash message (stores for later, typically before navigation):
 * const { setFlashMessage } = useFlashMessage()
 * setFlashMessage('success', 'Import completed successfully!')
 * navigate('/destination')
 *
 * // To show a flash message immediately (without storing):
 * const { showFlashMessage } = useFlashMessage()
 * showFlashMessage('success', 'Operation completed!')
 *
 * // To show a flash message with dedupKey (only shows once per unique key value):
 * const { showFlashMessage } = useFlashMessage()
 * useEffect(() => {
 *   showFlashMessage('success', 'Settings saved', { dedupKey: isSuccess })
 * }, [isSuccess, showFlashMessage])
 * // This will only show the message once when isSuccess becomes true, not on every render
 *
 * // To show a flash message once when a condition becomes true
 * Automatically handles deduplication across navigations and re-renders:
 * useFlashMessageOnce(isSuccess, 'success', 'Settings saved successfully')
 *
 * // To display stored flash messages (typically in destination component):
 * useFlashMessage({ autoDisplay: true })
 *
 * @param options.autoDisplay - If true, automatically displays pending messages on mount
 */
export function useFlashMessage(options?: { autoDisplay?: boolean }) {
  const {
    addFlashMessage,
    getPendingMessages,
    clearFlashMessage,
    clearAllFlashMessages,
  } = useFlashMessageStore()

  // Auto-display flash messages on component mount
  useEffect(() => {
    if (!options?.autoDisplay) return

    const pendingMessages = getPendingMessages()

    if (pendingMessages.length > 0) {
      // Display each message
      pendingMessages.forEach((flashMsg) => {
        displayToast(flashMsg.type, flashMsg.message, {
          title: flashMsg.title,
          duration: flashMsg.duration,
        })

        // Clear the message after displaying
        clearFlashMessage(flashMsg.id)
      })
    }
  }, [options?.autoDisplay, getPendingMessages, clearFlashMessage])

  // Function to show a flash message immediately (without storing)
  // Automatically deduplicates messages shown within their display duration
  // If dedupKey is provided, only shows the message once per unique dedupKey value
  // Using useCallback to make the function reference stable
  const showFlashMessage: ShowFlashMessageFn = useCallback(
    (type, message, msgOptions) => {
      const messageKey = `${type}:${message}`

      // If a dedupKey is provided, use it for deduplication
      if (msgOptions?.dedupKey !== undefined) {
        const dedupMapKey = `${messageKey}`
        const lastShownKey = shownDedupKeys.get(dedupMapKey)

        // If we've already shown this message with the same dedupKey, skip it
        if (lastShownKey === msgOptions.dedupKey) {
          return
        }

        // Show the message and remember this dedupKey
        displayToast(type, message, msgOptions)
        shownDedupKeys.set(dedupMapKey, msgOptions.dedupKey)
        return
      }

      // Time-based deduplication (existing behavior)
      const now = Date.now()
      const lastShown = recentlyShownMessages.get(messageKey)

      // Use the custom duration if provided, otherwise use default
      const duration = msgOptions?.duration || DEFAULT_TOAST_DURATION

      // If this exact message was shown recently (within its duration), skip it
      if (lastShown && now - lastShown < duration) {
        return
      }

      // Show the message and track it
      displayToast(type, message, msgOptions)
      recentlyShownMessages.set(messageKey, now)

      // Clean up old entries to prevent memory leak
      // Remove entries older than the longest reasonable duration (30 seconds)
      const cutoff = now - 30000
      for (const [key, timestamp] of recentlyShownMessages.entries()) {
        if (timestamp < cutoff) {
          recentlyShownMessages.delete(key)
        }
      }
    },
    [],
  )

  return {
    setFlashMessage: addFlashMessage,
    showFlashMessage,
    clearFlashMessage,
    clearAllFlashMessages,
    getPendingMessages,
  }
}

/**
 * // To show a flash message once when a condition becomes true
 * Automatically handles deduplication across navigations and re-renders:
 * useFlashMessageOnce(isSuccess, 'success', 'Settings saved successfully')
 */
export function useFlashMessageOnce(
  condition: boolean,
  type: FlashMessageType,
  message: string,
  options?: {
    title?: string
    duration?: number
  },
) {
  const { showFlashMessage } = useFlashMessage()
  const prevConditionRef = useRef(false)
  const uniqueIdRef = useRef<number | null>(null)

  // Generate a unique ID when condition transitions to true
  useEffect(() => {
    if (condition && !prevConditionRef.current) {
      uniqueIdRef.current = Date.now()
    }
    prevConditionRef.current = condition
  }, [condition])

  // Show message with the unique ID as dedupKey
  useEffect(() => {
    if (condition && uniqueIdRef.current) {
      showFlashMessage(type, message, {
        ...options,
        dedupKey: uniqueIdRef.current,
      })
    }
  }, [condition, type, message, options, showFlashMessage])
}
