import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type FlashMessageType = 'success' | 'error' | 'warning' | 'info'

export type FlashMessage = {
  id: string
  type: FlashMessageType
  message: string
  title?: string
  duration?: number
  timestamp: number
}

interface FlashMessageState {
  messages: FlashMessage[]

  addFlashMessage: (
    type: FlashMessageType,
    message: string,
    options?: {
      title?: string
      duration?: number
    },
  ) => void

  getPendingMessages: () => FlashMessage[]

  clearFlashMessage: (id: string) => void

  clearAllFlashMessages: () => void
}

export const useFlashMessageStore = create<FlashMessageState>()(
  persist(
    (set, get) => ({
      messages: [],

      addFlashMessage: (type, message, options = {}) => {
        const id = `flash-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const newMessage: FlashMessage = {
          id,
          type,
          message,
          title: options.title,
          duration: options.duration,
          timestamp: Date.now(),
        }

        set((state) => ({
          messages: [...state.messages, newMessage],
        }))
      },

      getPendingMessages: () => {
        const messages = get().messages
        // Filter out messages older than 5 minutes to prevent stale messages
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
        return messages.filter((msg) => msg.timestamp > fiveMinutesAgo)
      },

      clearFlashMessage: (id) => {
        set((state) => ({
          messages: state.messages.filter((msg) => msg.id !== id),
        }))
      },

      clearAllFlashMessages: () => {
        set({ messages: [] })
      },
    }),
    {
      name: 'veysur.flashMessages',
    },
  ),
)
